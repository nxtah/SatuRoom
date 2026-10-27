import { NextResponse } from "next/server";
import { CatalogInput } from "@/lib/schemas";
import { createCatalog,listCatalog } from "@/server/catalog";
import { requireApiContext } from "@/server/context";
import { env } from "@/server/env";
const fail=(e:unknown)=>{const x=e instanceof Error?e.message:"";return NextResponse.json({error:x==="FORBIDDEN"?"Anda tidak punya izin mengelola menu.":x==="UNAUTHORIZED"?"Silakan masuk lagi.":"Data belum dapat disimpan."},{status:x==="FORBIDDEN"?403:x==="UNAUTHORIZED"?401:422})};
export async function GET(){try{return NextResponse.json(await listCatalog(await requireApiContext()))}catch(e){return fail(e)}}
export async function POST(req:Request){try{if(req.headers.get("origin")!==new URL(env().APP_URL).origin)return NextResponse.json({error:"Permintaan ditolak."},{status:403});const parsed=CatalogInput.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message??"Periksa isian."},{status:422});return NextResponse.json(await createCatalog(await requireApiContext(),parsed.data),{status:201})}catch(e){return fail(e)}}
