import Link from "next/link";
import { LogoMark } from "./maskot";

export function Brand({ tone = "ink", href = "/" }: { tone?: "ink" | "white"; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 rounded-xl">
      <LogoMark className="h-9" />
      <span className={`text-xl font-extrabold tracking-tight ${tone === "white" ? "text-white" : "text-ink"}`}>SatuRoom</span>
      <span className={`cjk rounded-md px-1.5 py-0.5 text-sm leading-none ${tone === "white" ? "bg-ember text-white" : "bg-ember text-white"}`}>
        麻将
      </span>
      <span className={`text-xs font-bold ${tone === "white" ? "text-white/70" : "text-ink-soft"}`}>Mahjong</span>
    </Link>
  );
}
