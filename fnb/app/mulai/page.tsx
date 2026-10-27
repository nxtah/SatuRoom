import { redirect } from "next/navigation";
import { currentSession,loadContext } from "@/server/context";
import { listMyFnbBusinesses } from "@/server/business";
import { setActiveBusiness } from "@saturoom/core/auth";
import { db } from "@/server/db";
import { StartForm } from "./form";
export default async function StartPage(){const s=await currentSession();if(!s)redirect("/masuk");if(await loadContext(s))redirect("/");const mine=await listMyFnbBusinesses(s.userId);if(mine.length===1){await setActiveBusiness(db(),s.sessionId,mine[0]!.id);redirect("/")}return <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center p-6"><p className="font-bold text-tomato">Langkah pertama</p><h1 className="mt-2 text-4xl font-extrabold">Buat bisnis F&B</h1><p className="mt-2 text-stone-600">Kami otomatis menyiapkan outlet utama dan akses Pemilik.</p><StartForm/></main>}
