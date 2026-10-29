import { redirect } from "next/navigation";
import { can } from "@/server/context";
import { listExpenses } from "@/server/expenses";
import { requireFnbPage } from "@/server/routing";
import { todayJakarta } from "@/server/reports";
import { ExpensePanel } from "./expense-panel";

export default async function ExpensesPage() {
  const ctx = await requireFnbPage();
  if (!can(ctx, "expenses.manage")) redirect("/");
  return <main className="mx-auto max-w-4xl p-4 sm:p-8">
    <p className="font-bold text-tomato">Keuangan</p>
    <h1 className="text-3xl font-extrabold">Pengeluaran</h1>
    <p className="mt-1 text-stone-600">Listrik, sewa, gaji, dan biaya lain. Muncul di laporan harian sebagai pengurang laba.</p>
    <ExpensePanel initial={await listExpenses(ctx)} today={todayJakarta()} />
  </main>;
}
