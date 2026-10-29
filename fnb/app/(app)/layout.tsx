import { AppShell } from "@/components/app-shell";
import { can } from "@/server/context";
import { requireFnbPage } from "@/server/routing";

export default async function FnbAppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireFnbPage();
  return <AppShell hidden={can(ctx, "staff.manage") ? [] : ["/staf"]}>{children}</AppShell>;
}
