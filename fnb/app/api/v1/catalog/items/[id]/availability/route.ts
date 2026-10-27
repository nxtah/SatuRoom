import { NextResponse } from "next/server";
import { AvailabilityInput } from "@/lib/schemas";
import { setItemAvailability } from "@/server/catalog";
import { requireApiContext } from "@/server/context";
import { env } from "@/server/env";
import { z } from "zod";
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){try{if(req.headers.get("origin")!==new URL(env().APP_URL).origin)return NextResponse.json({error:"Permintaan ditolak."},{status:403});const id=z.string().uuid().parse((await params).id);const parsed=AvailabilityInput.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Status tidak valid."},{status:422});await setItemAvailability(await requireApiContext(),id,parsed.data.available);return new NextResponse(null,{status:204})}catch{return NextResponse.json({error:"Status menu belum dapat diubah."},{status:422})}}
