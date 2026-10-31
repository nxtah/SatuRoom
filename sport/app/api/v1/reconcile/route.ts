import { ReconcileInput } from "@/lib/schemas";
import { reconcile } from "@/server/accounting";
import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";

export const POST = route(async (req) => ok(await reconcile(await academyContext(), await body(req, ReconcileInput))));
