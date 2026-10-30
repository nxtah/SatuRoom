import QRCode from "qrcode";
import { redirect } from "next/navigation";
import { PageHead } from "@/components/ui";
import { getProfile } from "@/server/business-profile";
import { can } from "@/server/context";
import { env } from "@/server/env";
import { requireFnbPage } from "@/server/routing";
import { QrCard } from "./qr-card";

export default async function DigitalMenuPage() {
  const ctx = await requireFnbPage();
  if (!can(ctx, "settings.manage")) redirect("/");
  const profile = await getProfile(ctx);
  const url = `${env().APP_URL}/m/${profile.code}`;
  const qr = await QRCode.toDataURL(url, { width: 720, margin: 2, errorCorrectionLevel: "M", color: { dark: "#3a2517", light: "#ffffff" } });
  return <main className="mx-auto max-w-5xl p-4 sm:p-8">
    <PageHead kicker="Bisnis" title="Menu digital (QR)">Pelanggan memindai QR ini dan langsung melihat menu Anda tanpa login. Isinya mengikuti menu di Produk dan diperbarui otomatis: harga, foto, dan tanda Habis berubah di layar pelanggan beberapa detik setelah Anda ubah.</PageHead>
    <QrCard name={profile.name} city={profile.city} url={url} qr={qr} enabled={profile.publicMenuEnabled} />
  </main>;
}
