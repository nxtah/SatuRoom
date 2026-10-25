import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const body = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: "SatuRoom Bola", template: "%s | SatuRoom Bola" },
  description: "Aplikasi akademi sepak bola: pemain, tim, jadwal latihan, dan absensi.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0d3b2e" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={body.variable}>
      <body className="min-h-dvh bg-mist">{children}</body>
    </html>
  );
}
