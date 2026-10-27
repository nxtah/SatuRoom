import { AppShell } from "@/components/app-shell";
import { requireFnbPage } from "@/server/routing";
export default async function FnbAppLayout({ children }: { children: React.ReactNode }) { await requireFnbPage(); return <AppShell>{children}</AppShell>; }
