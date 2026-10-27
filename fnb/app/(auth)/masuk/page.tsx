import { redirect } from "next/navigation";
import { currentSession } from "@/server/context";
import { LoginForm } from "./form";
export default async function LoginPage(){if(await currentSession())redirect("/");return <><p className="font-bold text-tomato">SatuRoom Rasa</p><h1 className="mt-2 text-4xl font-extrabold">Masuk</h1><p className="mt-2 text-stone-600">Gunakan akun SatuRoom Anda.</p><LoginForm/></>}
