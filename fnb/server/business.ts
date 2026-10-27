import "server-only";
import { setActiveBusiness, type SessionInfo } from "@saturoom/core/auth";
import { withContext } from "@saturoom/core/db";
import { auditEvents,businesses,memberships } from "@saturoom/core/schema";
import { randomUUID } from "node:crypto";
import { and,eq } from "drizzle-orm";
import { db } from "./db";
import { outlets,staffRoles } from "./schema";
export async function createFnbBusiness(session:SessionInfo,input:{name:string;city:string}){const id=randomUUID();await withContext(db(),{userId:session.userId,businessId:id},async tx=>{await tx.insert(businesses).values({id,product:"fnb",name:input.name,city:input.city,createdBy:session.userId});const [m]=await tx.insert(memberships).values({businessId:id,userId:session.userId}).returning({id:memberships.id});await tx.insert(staffRoles).values({businessId:id,membershipId:m!.id,role:"owner"});await tx.insert(outlets).values({businessId:id,name:"Outlet utama",isPrimary:true});await tx.insert(auditEvents).values({businessId:id,actorUserId:session.userId,action:"fnb.business.created",targetType:"business",targetId:id});});await setActiveBusiness(db(),session.sessionId,id);return id;}
export function listMyFnbBusinesses(userId:string){return withContext(db(),{userId},tx=>tx.select({id:businesses.id,name:businesses.name}).from(businesses).innerJoin(memberships,eq(memberships.businessId,businesses.id)).where(and(eq(memberships.userId,userId),eq(memberships.status,"active"),eq(businesses.product,"fnb"))));}

/** ID bisnis aktif, ditampilkan di Ringkasan untuk dipakai saat masuk. */
export async function getFnbBusinessCode(ctx: { userId: string; businessId: string }): Promise<string> {
  const [row] = await withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, (tx) =>
    tx.select({ code: businesses.code }).from(businesses).where(eq(businesses.id, ctx.businessId)),
  );
  return row?.code ?? "";
}
