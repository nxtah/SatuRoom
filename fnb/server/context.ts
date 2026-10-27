import "server-only";
import { getSession, type SessionInfo } from "@saturoom/core/auth";
import { withContext } from "@saturoom/core/db";
import { memberships } from "@saturoom/core/schema";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "./db";
import { env } from "./env";
import { staffRoles } from "./schema";
export const PRODUCT="fnb";
export const cookieName=()=>env().COOKIE_SECURE?"__Host-sr_fnb":"sr_fnb";
export const currentSession=cache(async()=>{const token=(await cookies()).get(cookieName())?.value;return token?getSession(db(),token,PRODUCT):null});
export type FnbContext={session:SessionInfo;userId:string;businessId:string;membershipId:string;roles:string[]};
export async function loadContext(session:SessionInfo):Promise<FnbContext|null>{if(!session.activeBusinessId)return null;const found=await withContext(db(),{userId:session.userId,businessId:session.activeBusinessId},async tx=>{const [m]=await tx.select({id:memberships.id}).from(memberships).where(and(eq(memberships.businessId,session.activeBusinessId!),eq(memberships.userId,session.userId),eq(memberships.status,"active")));if(!m)return null;const roles=await tx.select({role:staffRoles.role}).from(staffRoles).where(eq(staffRoles.membershipId,m.id));return{id:m.id,roles:roles.map(r=>r.role)}});return found?{session,userId:session.userId,businessId:session.activeBusinessId,membershipId:found.id,roles:found.roles}:null;}
