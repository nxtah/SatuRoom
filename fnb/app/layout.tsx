import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
const font = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["400", "600", "700", "800"] });
const display = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["SOFT", "WONK"], style: ["normal", "italic"] });
export const metadata: Metadata = { title: "SatuRoom Rasa", description: "Operasional bisnis makanan dan minuman.", robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="id" className={`${font.variable} ${display.variable}`}><body>{children}</body></html>; }
