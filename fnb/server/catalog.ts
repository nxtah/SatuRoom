import "server-only";
import { withContext } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { CatalogInput, ItemUpdateInput } from "@/lib/schemas";
import { db } from "./db";
import { can, type FnbContext } from "./context";
import { AppError, notFound } from "./errors";
import { listGroups, type ModifierGroup } from "./modifiers";

export type Catalog={categories:{id:string;name:string}[];stations:{id:string;name:string;color:string}[];items:{id:string;name:string;description:string|null;price:number;available:boolean;categoryId:string;categoryName:string;stationId:string|null;stationName:string|null;groupIds:string[]}[];groups:ModifierGroup[]};
const manage=(ctx:FnbContext)=>{if(!can(ctx,"catalog.manage"))throw new Error("FORBIDDEN")};
const inBusiness=<T>(ctx:FnbContext,work:Parameters<typeof withContext<T>>[2])=>withContext(db(),{userId:ctx.userId,businessId:ctx.businessId},work);

export function listCatalog(ctx:FnbContext):Promise<Catalog>{return inBusiness(ctx,async tx=>{
  const categories=await tx.execute(sql`SELECT id,name FROM fnb.menu_categories WHERE archived_at IS NULL ORDER BY sort_order,name`) as unknown as Catalog["categories"];
  const stations=await tx.execute(sql`SELECT id,name,color FROM fnb.kitchen_stations WHERE archived_at IS NULL ORDER BY name`) as unknown as Catalog["stations"];
  const items=await tx.execute(sql`SELECT i.id,i.name,i.description,i.price,i.is_available AS available,i.category_id AS "categoryId",c.name AS "categoryName",i.station_id AS "stationId",s.name AS "stationName" FROM fnb.menu_items i JOIN fnb.menu_categories c ON c.id=i.category_id LEFT JOIN fnb.kitchen_stations s ON s.id=i.station_id WHERE i.archived_at IS NULL ORDER BY c.sort_order,c.name,i.name`) as unknown as Catalog["items"];
  const groups=await listGroups(tx);
  return{categories,stations,groups,items:items.map(i=>({...i,groupIds:groups.filter(g=>g.itemIds.includes(i.id)).map(g=>g.id)}))};
});}

export async function createCatalog(ctx:FnbContext,input:z.infer<typeof CatalogInput>){manage(ctx);return inBusiness(ctx,async tx=>{
  let id:string;
  if(input.type==="category"){const[r]=await tx.execute(sql`INSERT INTO fnb.menu_categories(business_id,name) VALUES(${ctx.businessId}::uuid,${input.name}) RETURNING id`) as unknown as {id:string}[];id=r!.id;}
  else if(input.type==="station"){const[r]=await tx.execute(sql`INSERT INTO fnb.kitchen_stations(business_id,outlet_id,name) SELECT ${ctx.businessId}::uuid,o.id,${input.name} FROM fnb.outlets o WHERE o.is_primary AND o.archived_at IS NULL LIMIT 1 RETURNING id`) as unknown as {id:string}[];if(!r)throw new Error("NO_OUTLET");id=r.id;}
  else{const[r]=await tx.execute(sql`INSERT INTO fnb.menu_items(business_id,category_id,station_id,name,description,price) VALUES(${ctx.businessId}::uuid,${input.categoryId}::uuid,${input.stationId}::uuid,${input.name},${input.description||null},${input.price}) RETURNING id`) as unknown as {id:string}[];id=r!.id;}
  await tx.insert(auditEvents).values({businessId:ctx.businessId,actorUserId:ctx.userId,action:`fnb.${input.type}.created`,targetType:input.type,targetId:id});return{id};
});}

export async function setItemAvailability(ctx:FnbContext,id:string,available:boolean){manage(ctx);await inBusiness(ctx,async tx=>{const rows=await tx.execute(sql`UPDATE fnb.menu_items SET is_available=${available} WHERE id=${id}::uuid AND archived_at IS NULL RETURNING id`) as unknown as {id:string}[];if(!rows.length)throw new Error("NOT_FOUND");await tx.insert(auditEvents).values({businessId:ctx.businessId,actorUserId:ctx.userId,action:"fnb.item.availability_changed",targetType:"menu_item",targetId:id,meta:{available}});});}

/** Mengubah menu. Perubahan harga dicatat supaya riwayatnya bisa dilihat; struk lama tidak berubah karena memakai salinan harga. */
export async function updateItem(ctx:FnbContext,id:string,input:z.infer<typeof ItemUpdateInput>){manage(ctx);await inBusiness(ctx,async tx=>{
  const[old]=await tx.execute(sql`SELECT price FROM fnb.menu_items WHERE id=${id}::uuid AND archived_at IS NULL FOR UPDATE`) as unknown as{price:number}[];
  if(!old)throw notFound("Menu");
  const ok=await tx.execute(sql`SELECT (SELECT count(*) FROM fnb.menu_categories WHERE id=${input.categoryId}::uuid AND archived_at IS NULL)::int AS c,(SELECT count(*) FROM fnb.kitchen_stations WHERE id=${input.stationId}::uuid AND archived_at IS NULL)::int AS s`) as unknown as{c:number;s:number}[];
  if(!ok[0]!.c)throw new AppError(422,"invalid","Kategori tidak ditemukan.");
  if(input.stationId&&!ok[0]!.s)throw new AppError(422,"invalid","Station dapur tidak ditemukan.");
  await tx.execute(sql`UPDATE fnb.menu_items SET name=${input.name},description=${input.description||null},category_id=${input.categoryId}::uuid,station_id=${input.stationId}::uuid,price=${input.price} WHERE id=${id}::uuid`);
  if(old.price!==input.price)await tx.execute(sql`INSERT INTO fnb.price_changes(business_id,menu_item_id,old_price,new_price,changed_by) VALUES(${ctx.businessId}::uuid,${id}::uuid,${old.price},${input.price},${ctx.userId}::uuid)`);
  await tx.insert(auditEvents).values({businessId:ctx.businessId,actorUserId:ctx.userId,action:"fnb.item.updated",targetType:"menu_item",targetId:id,meta:{oldPrice:old.price,newPrice:input.price}});
});}

/** Menu diarsipkan, bukan dihapus: pesanan lama tetap menampilkan nama dan harganya. */
export async function archiveItem(ctx:FnbContext,id:string){manage(ctx);await inBusiness(ctx,async tx=>{
  const rows=await tx.execute(sql`UPDATE fnb.menu_items SET archived_at=now() WHERE id=${id}::uuid AND archived_at IS NULL RETURNING id`) as unknown as{id:string}[];
  if(!rows.length)throw notFound("Menu");
  await tx.insert(auditEvents).values({businessId:ctx.businessId,actorUserId:ctx.userId,action:"fnb.item.archived",targetType:"menu_item",targetId:id});
});}

export type PriceChange={oldPrice:number;newPrice:number;changedAt:string;by:string|null};
export function listPriceChanges(ctx:FnbContext,itemId:string):Promise<PriceChange[]>{return inBusiness(ctx,async tx=>await tx.execute(sql`SELECT p.old_price AS "oldPrice",p.new_price AS "newPrice",p.changed_at AS "changedAt",u.name AS by FROM fnb.price_changes p LEFT JOIN core.users u ON u.id=p.changed_by WHERE p.menu_item_id=${itemId}::uuid ORDER BY p.changed_at DESC LIMIT 50`) as unknown as PriceChange[]);}
