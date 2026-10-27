import "server-only";
import { redirect } from "next/navigation";
import { currentSession,loadContext } from "./context";
export async function requireFnbPage(){const session=await currentSession();if(!session)redirect("/masuk");const ctx=await loadContext(session);if(!ctx)redirect("/mulai");return ctx;}
