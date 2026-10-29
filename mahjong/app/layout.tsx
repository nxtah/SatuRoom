import type { Metadata, Viewport } from "next";
import { Figtree, Shippori_Mincho_B1 } from "next/font/google";
import "./globals.css";

const body = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const display = Shippori_Mincho_B1({
  variable: "--font-mincho",
  subsets: ["latin"],
  weight: ["700", "800"],
});

export const metadata: Metadata = {
  title: { default: "SatuRoom Mahjong", template: "%s | SatuRoom Mahjong" },
  description: "Aplikasi rumah mahjong: meja, booking, member, makanan dan minuman, serta turnamen.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0f3a2d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${body.variable} ${display.variable}`}>
      <body className="min-h-dvh bg-mist">{children}</body>
    </html>
  );
}
