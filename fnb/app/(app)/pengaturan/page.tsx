import { redirect } from "next/navigation";
import { can } from "@/server/context";
import { requireFnbPage } from "@/server/routing";
import { getSettings } from "@/server/settings";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const ctx = await requireFnbPage();
  if (!can(ctx, "settings.manage")) redirect("/");
  const settings = await getSettings(ctx);
  return <main className="mx-auto max-w-4xl p-4 sm:p-8">
    <h1 className="text-3xl font-extrabold">Pengaturan</h1>
    <p className="mt-1 text-stone-600">Pajak, service charge, dan tampilan struk. Perubahan hanya berlaku untuk pesanan berikutnya.</p>
    <SettingsForm initial={settings} />
  </main>;
}
