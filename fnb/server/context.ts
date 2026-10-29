import "server-only";
import { getSession, type SessionInfo } from "@saturoom/core/auth";
import { withContext } from "@saturoom/core/db";
import { businesses,memberships } from "@saturoom/core/schema";
import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "./db";
import { env } from "./env";
import { customRoles,staffCustomRoles,staffRoles } from "./schema";
import { permissionsFor,type Permission } from "@/lib/permissions";
export const PRODUCT="fnb";
export const cookieName=()=>env().COOKIE_SECURE?"__Host-sr_fnb":"sr_fnb";
export const currentSession=cache(async()=>{const token=(await cookies()).get(cookieName())?.value;return token?getSession(db(),token,PRODUCT):null});
export type FnbContext={session:SessionInfo;userId:string;businessId:string;membershipId:string;roles:string[];permissions:Set<Permission>};
export const can=(ctx:{permissions:Set<Permission>},p:Permission)=>ctx.permissions.has(p);
export async function loadContext(session:SessionInfo):Promise<FnbContext|null>{if(!session.activeBusinessId)return null;const found=await withContext(db(),{userId:session.userId,businessId:session.activeBusinessId},async tx=>{const [m]=await tx.select({id:memberships.id}).from(memberships).innerJoin(businesses,eq(businesses.id,memberships.businessId)).where(and(eq(memberships.businessId,session.activeBusinessId!),eq(memberships.userId,session.userId),eq(memberships.status,"active"),eq(businesses.product,PRODUCT)));if(!m)return null;const roles=await tx.select({role:staffRoles.role}).from(staffRoles).where(eq(staffRoles.membershipId,m.id));const custom=await tx.select({permissions:customRoles.permissions}).from(staffCustomRoles).innerJoin(customRoles,eq(customRoles.id,staffCustomRoles.customRoleId)).where(and(eq(staffCustomRoles.membershipId,m.id),isNull(customRoles.archivedAt)));if(!roles.length&&!custom.length)return null;return{id:m.id,roles:roles.map(r=>r.role),permissions:permissionsFor(roles.map(r=>r.role),custom.map(c=>c.permissions))}});return found?{session,userId:session.userId,businessId:session.activeBusinessId,membershipId:found.id,roles:found.roles,permissions:found.permissions}:null;}
export async function requireApiContext(){const session=await currentSession();if(!session)throw new Error("UNAUTHORIZED");const ctx=await loadContext(session);if(!ctx)throw new Error("NO_BUSINESS");return ctx;}
