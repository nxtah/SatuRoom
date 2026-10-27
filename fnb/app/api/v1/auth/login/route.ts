import { login } from "@saturoom/core/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { cookieName,PRODUCT } from "@/server/context";
import { db } from "@/server/db";
import { env } from "@/server/env";
const Input=z.object({email:z.string().email(),password:z.string().min(1)});
export async function POST(req:Request){if(req.headers.get("origin")!==new URL(env().APP_URL).origin)return NextResponse.json({error:"Permintaan ditolak."},{status:403});const parsed=Input.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Periksa email dan password."},{status:422});const result=await login(db(),{...parsed.data,product:PRODUCT});if(result.status!=="ok")return NextResponse.json({error:result.status==="unverified"?"Email belum dikonfirmasi.":"Email atau password salah."},{status:result.status==="unverified"?403:401});(await cookies()).set(cookieName(),result.token,{httpOnly:true,secure:env().COOKIE_SECURE,sameSite:"lax",path:"/",maxAge:30*24*60*60});return NextResponse.json({ok:true});}
