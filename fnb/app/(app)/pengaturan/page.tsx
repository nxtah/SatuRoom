import { redirect } from "next/navigation";
import { can } from "@/server/context";
import { requireFnbPage } from "@/server/routing";
import { getSettings } from "@/server/settings";
import { getProfile } from "@/server/business-profile";
import { ProfileForm } from "./profile-form";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const ctx = await requireFnbPage();
  if (!can(ctx, "settings.manage")) redirect("/");
  const [settings, profile] = await Promise.all([getSettings(ctx), getProfile(ctx)]);
  return <main className="mx-auto max-w-4xl p-4 sm:p-8">
    <h1 className="text-3xl font-extrabold">Pengaturan</h1>
    <p className="mt-1 text-stone-600">Profil bisnis, alur pesanan (lewat dapur atau langsung disajikan), pajak, dan struk. Perubahan alur, pajak, dan struk berlaku untuk pesanan berikutnya.</p>
    <ProfileForm initial={profile} />
    <SettingsForm initial={settings} />
    <p className="mt-4 rounded-2xl bg-cream p-4 text-sm">Meja, tipe pesanan, struk, dan printer diatur di grup menu <b>Bisnis</b> dan <b>Penjualan</b> di samping.</p>
  </main>;
}
