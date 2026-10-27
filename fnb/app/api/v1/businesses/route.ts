import { NextResponse } from "next/server";
import { z } from "zod";
import { currentSession } from "@/server/context";
import { createFnbBusiness } from "@/server/business";
import { env } from "@/server/env";
const Input=z.object({name:z.string().trim().min(2).max(100),city:z.string().trim().min(2).max(80)});
export async function POST(req:Request){if(req.headers.get("origin")!==new URL(env().APP_URL).origin)return NextResponse.json({error:"Permintaan ditolak."},{status:403});const session=await currentSession();if(!session)return NextResponse.json({error:"Silakan masuk lagi."},{status:401});const parsed=Input.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Lengkapi nama usaha dan kota."},{status:422});return NextResponse.json({id:await createFnbBusiness(session,parsed.data)},{status:201});}
