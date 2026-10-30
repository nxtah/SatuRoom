import { redirect } from "next/navigation";
import { PageHead } from "@/components/ui";
import { can } from "@/server/context";
import { requireFnbPage } from "@/server/routing";
import { listTableGroups } from "@/server/table-groups";
import { listTables } from "@/server/tables";
import { TableGroupManager } from "./table-group-manager";

export default async function TableGroupPage() {
  const ctx = await requireFnbPage();
  if (!can(ctx, "settings.manage")) redirect("/");
  const [groups, tables] = await Promise.all([listTableGroups(ctx), listTables(ctx)]);
  return <main className="mx-auto max-w-5xl p-4 sm:p-8">
    <PageHead kicker="Bisnis" title="Meja dan grup meja">Kelompokkan meja per area (Indoor, Teras, Lantai 2). Kasir memilih meja per grup, dan satu meja hanya punya satu pesanan aktif.</PageHead>
    <TableGroupManager groups={groups} tables={tables} />
  </main>;
}
