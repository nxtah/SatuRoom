import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const body = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const display = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["700", "800"],
  style: ["italic"],
});

export const metadata: Metadata = {
  title: { default: "SatuRoom Sport", template: "%s | SatuRoom Sport" },
  description: "Aplikasi akademi olahraga: pemain, tim, jadwal latihan, dan absensi.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0b1a3a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${body.variable} ${display.variable}`}>
      <body className="min-h-dvh bg-mist">{children}</body>
    </html>
  );
}
