import "server-only";
import { redirect } from "next/navigation";
import { currentSession,loadContext } from "./context";
import { setActiveBusiness } from "@saturoom/core/auth";
import { db } from "./db";
import { listMyFnbBusinesses } from "./business";
export async function requireFnbPage(){const session=await currentSession();if(!session)redirect("/masuk");const current=await loadContext(session);if(current)return current;const mine=await listMyFnbBusinesses(session.userId);if(mine.length!==1)redirect("/mulai");await setActiveBusiness(db(),session.sessionId,mine[0]!.id);const ctx=await loadContext({...session,activeBusinessId:mine[0]!.id});if(!ctx)redirect("/mulai");return ctx;}
