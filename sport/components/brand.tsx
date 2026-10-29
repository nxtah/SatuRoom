import Link from "next/link";
import { LogoMark } from "./maskot";

export function Brand({ tone = "ink", href = "/" }: { tone?: "ink" | "white"; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 rounded-full">
      <LogoMark className="h-9" />
      <span className={`text-xl font-extrabold tracking-tight ${tone === "white" ? "text-white" : "text-ink"}`}>
        SatuRoom
      </span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
          tone === "white" ? "bg-white/15 text-white" : "bg-turf-soft text-pitch"
        }`}
      >
        Sport
      </span>
    </Link>
  );
}
