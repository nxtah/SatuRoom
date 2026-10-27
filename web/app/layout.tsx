import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Satu keluarga font untuk judul dan teks agar menyatu; judul memakai bobot 800 dengan spasi rapat.
const body = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const display = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://saturoom.com"),
  title: "SatuRoom: aplikasi rapi untuk akademi bola dan usaha makanan",
  description:
    "SatuRoom Bola mengurus pemain, jadwal, dan absensi akademi sepak bola. SatuRoom Rasa mengurus kasir, dapur, dan stok kafe atau warung. Mudah dipakai dari HP.",
  openGraph: {
    title: "SatuRoom",
    description: "Aplikasi sederhana untuk akademi sepak bola dan usaha makanan.",
    locale: "id_ID",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#1d1b18" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${body.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
