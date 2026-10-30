import "server-only";
import { withContext } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { CatalogInput, CategoryUpdateInput, ItemUpdateInput } from "@/lib/schemas";
import { cleanImageUrl } from "./cloudinary";
import { db } from "./db";
import { can, type FnbContext } from "./context";
import { AppError, notFound } from "./errors";
import { listGroups, type ModifierGroup } from "./modifiers";

export type CatalogCategory={id:string;name:string;description:string|null;imageUrl:string|null;isActive:boolean;sortOrder:number;itemCount:number};
export type CatalogItem={id:string;name:string;description:string|null;price:number;available:boolean;categoryId:string;categoryName:string;stationId:string|null;stationName:string|null;groupIds:string[];sku:string|null;barcode:string|null;cost:number;trackStock:boolean;minStock:number;stock:number;imageUrl:string|null;showInPos:boolean;taxable:boolean};
export type Catalog={categories:CatalogCategory[];stations:{id:string;name:string;color:string}[];items:CatalogItem[];groups:ModifierGroup[]};
const manage=(ctx:FnbContext)=>{if(!can(ctx,"catalog.manage"))throw new Error("FORBIDDEN")};
const inBusiness=<T>(ctx:FnbContext,work:Parameters<typeof withContext<T>>[2])=>withContext(db(),{userId:ctx.userId,businessId:ctx.businessId},work);
/** SKU/barcode ganda ditolak database; ubah jadi pesan yang bisa dipahami. */
const dupe=(e:unknown):never=>{const c=(e as{cause?:{code?:string;constraint_name?:string}}).cause;if(c?.code==="23505"){throw new AppError(409,"duplicate",c.constraint_name?.includes("barcode")?"Barcode sudah dipakai menu lain.":c.constraint_name?.includes("sku")?"SKU sudah dipakai menu lain.":"Data dengan nama itu sudah ada.")}throw e};

/** forPos=true: hanya kategori aktif dan menu yang boleh tampil di kasir; stok barang jadi dari cabang utama. */
export function listCatalog(ctx:FnbContext,opts:{forPos?:boolean}={}):Promise<Catalog>{return inBusiness(ctx,async tx=>{
  const pos=!!opts.forPos;
  const categories=await tx.execute(sql`SELECT c.id,c.name,c.description,c.image_url AS "imageUrl",c.is_active AS "isActive",c.sort_order AS "sortOrder",(SELECT count(*) FROM fnb.menu_items i WHERE i.category_id=c.id AND i.archived_at IS NULL)::int AS "itemCount" FROM fnb.menu_categories c WHERE c.archived_at IS NULL AND (${!pos} OR c.is_active) ORDER BY c.sort_order,c.name`) as unknown as CatalogCategory[];
  const stations=await tx.execute(sql`SELECT id,name,color FROM fnb.kitchen_stations WHERE archived_at IS NULL ORDER BY name`) as unknown as Catalog["stations"];
  const items=await tx.execute(sql`SELECT i.id,i.name,i.description,coalesce(o.price,i.price) AS price,i.is_available AND coalesce(o.is_available,true) AS available,i.category_id AS "categoryId",c.name AS "categoryName",i.station_id AS "stationId",s.name AS "stationName",i.sku,i.barcode,coalesce(o.cost,i.cost) AS cost,i.track_stock AS "trackStock",coalesce(o.min_stock,i.min_stock) AS "minStock",coalesce(o.stock,0) AS stock,i.image_url AS "imageUrl",i.show_in_pos AS "showInPos",i.taxable
    FROM fnb.menu_items i JOIN fnb.menu_categories c ON c.id=i.category_id LEFT JOIN fnb.kitchen_stations s ON s.id=i.station_id
    LEFT JOIN fnb.outlet_items o ON o.menu_item_id=i.id AND o.outlet_id=(SELECT id FROM fnb.outlets WHERE is_primary AND archived_at IS NULL LIMIT 1)
    WHERE i.archived_at IS NULL AND (${!pos} OR (i.show_in_pos AND c.is_active)) ORDER BY c.sort_order,c.name,i.sort_order,i.name`) as unknown as Omit<CatalogItem,"groupIds">[];
  const groups=await listGroups(tx);
  return{categories,stations,groups,items:items.map(i=>({...i,groupIds:groups.filter(g=>g.itemIds.includes(i.id)).map(g=>g.id)}))};
});}

const itemValues=(ctx:FnbContext,i:Partial<z.infer<typeof ItemUpdateInput>>)=>({sku:i.sku?.trim()||null,barcode:i.barcode?.trim()||null,cost:i.cost??0,trackStock:i.trackStock??false,minStock:i.minStock??0,imageUrl:cleanImageUrl(ctx,i.imageUrl),showInPos:i.showInPos??true,taxable:i.taxable??true});

export async function createCatalog(ctx:FnbContext,input:z.infer<typeof CatalogInput>){manage(ctx);return inBusiness(ctx,async tx=>{
  let id:string;
  try{
  if(input.type==="category"){const[r]=await tx.execute(sql`INSERT INTO fnb.menu_categories(business_id,name,description,image_url,sort_order) VALUES(${ctx.businessId}::uuid,${input.name},${input.description||null},${cleanImageUrl(ctx,input.imageUrl)},(SELECT coalesce(max(sort_order),0)+1 FROM fnb.menu_categories WHERE archived_at IS NULL)) RETURNING id`) as unknown as {id:string}[];id=r!.id;}
  else if(input.type==="station"){const[r]=await tx.execute(sql`INSERT INTO fnb.kitchen_stations(business_id,outlet_id,name) SELECT ${ctx.businessId}::uuid,o.id,${input.name} FROM fnb.outlets o WHERE o.is_primary AND o.archived_at IS NULL LIMIT 1 RETURNING id`) as unknown as {id:string}[];if(!r)throw new Error("NO_OUTLET");id=r.id;}
  else{const v=itemValues(ctx,input);const[r]=await tx.execute(sql`INSERT INTO fnb.menu_items(business_id,category_id,station_id,name,description,price,sku,barcode,cost,track_stock,min_stock,image_url,show_in_pos,taxable,is_available) VALUES(${ctx.businessId}::uuid,${input.categoryId}::uuid,${input.stationId}::uuid,${input.name},${input.description||null},${input.price},${v.sku},${v.barcode},${v.cost},${v.trackStock},${v.minStock},${v.imageUrl},${v.showInPos},${v.taxable},${!v.trackStock}) RETURNING id`) as unknown as {id:string}[];id=r!.id;}
  }catch(e){return dupe(e)}
  await tx.insert(auditEvents).values({businessId:ctx.businessId,actorUserId:ctx.userId,action:`fnb.${input.type}.created`,targetType:input.type,targetId:id});return{id};
});}

export async function updateCategory(ctx:FnbContext,id:string,input:z.infer<typeof CategoryUpdateInput>){manage(ctx);await inBusiness(ctx,async tx=>{
  const rows=await tx.execute(sql`UPDATE fnb.menu_categories SET name=${input.name},description=${input.description||null},image_url=${cleanImageUrl(ctx,input.imageUrl)},is_active=${input.isActive},sort_order=${input.sortOrder} WHERE id=${id}::uuid AND archived_at IS NULL RETURNING id`) as unknown as{id:string}[];
  if(!rows.length)throw notFound("Kategori");
  await tx.insert(auditEvents).values({businessId:ctx.businessId,actorUserId:ctx.userId,action:"fnb.category.updated",targetType:"category",targetId:id,meta:{isActive:input.isActive}});
});}

/** Kategori yang masih berisi menu tidak boleh diarsipkan, supaya tidak ada menu tanpa kategori. */
export async function archiveCategory(ctx:FnbContext,id:string){manage(ctx);await inBusiness(ctx,async tx=>{
  const[n]=await tx.execute(sql`SELECT count(*)::int AS n FROM fnb.menu_items WHERE category_id=${id}::uuid AND archived_at IS NULL`) as unknown as{n:number}[];
  if(n!.n)throw new AppError(409,"category_in_use",`Kategori masih berisi ${n!.n} menu. Pindahkan atau arsipkan menunya dulu.`);
  const rows=await tx.execute(sql`UPDATE fnb.menu_categories SET archived_at=now() WHERE id=${id}::uuid AND archived_at IS NULL RETURNING id`) as unknown as{id:string}[];
  if(!rows.length)throw notFound("Kategori");
  await tx.insert(auditEvents).values({businessId:ctx.businessId,actorUserId:ctx.userId,action:"fnb.category.archived",targetType:"category",targetId:id});
});}

export async function setItemAvailability(ctx:FnbContext,id:string,available:boolean){manage(ctx);await inBusiness(ctx,async tx=>{const rows=await tx.execute(sql`UPDATE fnb.menu_items SET is_available=${available} WHERE id=${id}::uuid AND archived_at IS NULL RETURNING id`) as unknown as {id:string}[];if(!rows.length)throw new Error("NOT_FOUND");await tx.insert(auditEvents).values({businessId:ctx.businessId,actorUserId:ctx.userId,action:"fnb.item.availability_changed",targetType:"menu_item",targetId:id,meta:{available}});});}

/** Mengubah menu. Perubahan harga dicatat supaya riwayatnya bisa dilihat; struk lama tidak berubah karena memakai salinan harga. */
export async function updateItem(ctx:FnbContext,id:string,input:z.infer<typeof ItemUpdateInput>){manage(ctx);await inBusiness(ctx,async tx=>{
  const[old]=await tx.execute(sql`SELECT price FROM fnb.menu_items WHERE id=${id}::uuid AND archived_at IS NULL FOR UPDATE`) as unknown as{price:number}[];
  if(!old)throw notFound("Menu");
  const ok=await tx.execute(sql`SELECT (SELECT count(*) FROM fnb.menu_categories WHERE id=${input.categoryId}::uuid AND archived_at IS NULL)::int AS c,(SELECT count(*) FROM fnb.kitchen_stations WHERE id=${input.stationId}::uuid AND archived_at IS NULL)::int AS s`) as unknown as{c:number;s:number}[];
  if(!ok[0]!.c)throw new AppError(422,"invalid","Kategori tidak ditemukan.");
  if(input.stationId&&!ok[0]!.s)throw new AppError(422,"invalid","Station dapur tidak ditemukan.");
  const v=itemValues(ctx,input);
  try{await tx.execute(sql`UPDATE fnb.menu_items SET name=${input.name},description=${input.description||null},category_id=${input.categoryId}::uuid,station_id=${input.stationId}::uuid,price=${input.price},sku=${v.sku},barcode=${v.barcode},cost=${v.cost},track_stock=${v.trackStock},min_stock=${v.minStock},image_url=${v.imageUrl},show_in_pos=${v.showInPos},taxable=${v.taxable} WHERE id=${id}::uuid`);}catch(e){dupe(e)}
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
