import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Bricolage untuk judul (berkarakter, tetap rapi); Plus Jakarta Sans untuk teks (jelas di HP).
const display = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });
const body = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://saturoom.com"),
  title: "SatuRoom Bola: aplikasi akademi sepak bola",
  description:
    "Data pemain, jadwal latihan, dan absensi akademi sepak bola dalam satu aplikasi yang mudah dipakai dari HP.",
  openGraph: {
    title: "SatuRoom Bola",
    description: "Urus akademi sepak bola cukup dari HP.",
    locale: "id_ID",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#0d3b2e" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
