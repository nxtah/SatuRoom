import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { Progress } from "@/server/assessments";

export function TrendIcon({ trend }: { trend: Progress["trend"] }) {
  if (trend === "improved") return <TrendingUp aria-label="membaik" className="size-4 text-pitch" />;
  if (trend === "worse") return <TrendingDown aria-label="menurun" className="size-4 text-flame" />;
  return <Minus aria-label="tetap" className="size-4 text-ink-soft" />;
}

export function ProgressList({ progress }: { progress: Progress[] }) {
  if (!progress.length) return null;
  return (
    <ul className="grid gap-1.5">
      {progress.map((p) => (
        <li key={p.key} className="flex items-center gap-3 rounded-2xl bg-mist px-3 py-2 text-sm">
          <span className="min-w-0 flex-1 font-bold">{p.label}</span>
          <span className="tabular-nums">
            {p.previous !== null ? <span className="text-ink-soft">{p.previous} → </span> : null}
            <b>{p.latest}</b>
            {p.type === "rating" ? "/5" : p.unit ? ` ${p.unit}` : ""}
          </span>
          {p.previous !== null ? <TrendIcon trend={p.trend} /> : null}
        </li>
      ))}
    </ul>
  );
}
