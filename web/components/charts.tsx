/**
 * Grafik SVG ringan, dirender di server (tanpa pustaka grafik, tanpa JS klien).
 * Warna mengikuti `currentColor` dan kelas Tailwind dari pemanggil.
 */

type Pt = { x: number; y: number };

/** Kurva halus melewati semua titik (Catmull-Rom ke Bezier), dijepit agar tidak melampaui bingkai. */
function smooth(p: Pt[], top: number, bottom: number): string {
  const clamp = (n: number) => Math.min(bottom, Math.max(top, n));
  let d = `M${p[0].x.toFixed(1)} ${p[0].y.toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] ?? p[i];
    const b = p[i];
    const c = p[i + 1];
    const e = p[i + 2] ?? c;
    const t = 0.18;
    d += ` C${(b.x + (c.x - a.x) * t).toFixed(1)} ${clamp(b.y + (c.y - a.y) * t).toFixed(1)} ${(c.x - (e.x - b.x) * t).toFixed(1)} ${clamp(c.y - (e.y - b.y) * t).toFixed(1)} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
  }
  return d;
}

/** Pecah deret yang punya jeda (null) menjadi ruas-ruas yang tersambung. */
function segments(points: { value: number | null }[], x: (i: number) => number, y: (v: number) => number): Pt[][] {
  const out: Pt[][] = [];
  let cur: Pt[] = [];
  points.forEach((p, i) => {
    if (p.value === null) {
      if (cur.length) out.push(cur);
      cur = [];
    } else cur.push({ x: x(i), y: y(p.value) });
  });
  if (cur.length) out.push(cur);
  return out;
}

/** Garis mini tanpa sumbu untuk ubin angka: hanya arah tren. */
export function Sparkline({ values, className = "" }: { values: (number | null)[]; className?: string }) {
  const W = 120;
  const H = 36;
  const real = values.filter((v): v is number => v !== null);
  if (real.length < 2) return null;
  const lo = Math.min(...real);
  const hi = Math.max(...real);
  const span = hi - lo || 1;
  const x = (i: number) => 3 + (i / (values.length - 1)) * (W - 6);
  const y = (v: number) => H - 5 - ((v - lo) / span) * (H - 10);
  const segs = segments(values.map((value) => ({ value })), x, y).filter((s) => s.length > 1);
  const last = segs.at(-1)?.at(-1);
  return (
    <svg aria-hidden viewBox={`0 0 ${W} ${H}`} className={`h-9 w-full overflow-visible ${className}`}>
      {segs.map((s, i) => (
        <path key={i} d={smooth(s, 2, H - 2)} pathLength={1} className="draw" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      ))}
      {last ? <circle cx={last.x} cy={last.y} r="3.5" fill="currentColor" /> : null}
    </svg>
  );
}

export interface TrendPoint {
  label: string;
  value: number | null;
  /** Teks untuk pembaca layar dan tooltip. */
  note?: string;
}

/** Grafik area halus untuk tren per periode; titik terakhir yang berisi data diberi label. */
export function AreaTrend({
  points,
  max,
  ticks,
  format,
  caption,
  className = "",
}: {
  points: TrendPoint[];
  max: number;
  ticks: number[];
  format: (n: number) => string;
  caption: string;
  className?: string;
}) {
  const W = 600;
  const H = 190;
  const T = 14;
  const B = H - 6;
  const x = (i: number) => 14 + (i / Math.max(points.length - 1, 1)) * (W - 28);
  const y = (v: number) => B - (Math.min(v, max) / max) * (B - T);
  const segs = segments(points, x, y);
  const lastIdx = points.findLastIndex((p) => p.value !== null);
  const last = lastIdx >= 0 ? { x: x(lastIdx), y: y(points[lastIdx].value as number) } : null;
  return (
    <div className={className}>
      <div className="relative">
        <svg role="img" aria-label={caption} viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible">
          {ticks.map((t) => (
            <line key={t} x1="0" x2={W} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity="0.12" strokeDasharray="3 6" />
          ))}
          {segs.map((s, i) => (
            <g key={i}>
              {s.length > 1 ? (
                <path
                  d={`${smooth(s, T, B)} L${s.at(-1)!.x.toFixed(1)} ${B} L${s[0].x.toFixed(1)} ${B} Z`}
                  className="fade-in"
                  fill="currentColor"
                  fillOpacity="0.14"
                />
              ) : null}
              <path d={s.length > 1 ? smooth(s, T, B) : `M${s[0].x} ${s[0].y}`} pathLength={1} className="draw" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
            </g>
          ))}
          {points.map((p, i) =>
            p.value === null ? null : (
              <circle key={i} cx={x(i)} cy={y(p.value)} r={i === lastIdx ? 6 : 3.5} className="fill-chalk" stroke="currentColor" strokeWidth="2.5">
                <title>{`${p.label}: ${p.note ?? format(p.value)}`}</title>
              </circle>
            ),
          )}
          {last ? <circle cx={last.x} cy={last.y} r="11" fill="currentColor" fillOpacity="0.18" className="pulse-dot" /> : null}
        </svg>
        {last ? (
          <span
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-[170%] rounded-full bg-ink px-2.5 py-1 text-xs font-extrabold whitespace-nowrap text-white"
            style={{ left: `${Math.min(Math.max((last.x / W) * 100, 6), 94)}%`, top: `${(last.y / H) * 100}%` }}
          >
            {format(points[lastIdx].value as number)}
          </span>
        ) : null}
      </div>
      <div aria-hidden className="mt-2 flex justify-between text-xs font-semibold text-ink-soft">
        {points.map((p) => (
          <span key={p.label} className="min-w-0 flex-1 text-center first:text-left last:text-right">
            {p.label}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.label}>
              <th scope="row">{p.label}</th>
              <td>{p.value === null ? "belum ada data" : (p.note ?? format(p.value))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Cincin progres: satu angka dalam hubungannya dengan keseluruhan. */
export function Ring({ value, size = 96, stroke = 11, children, className = "" }: { value: number; size?: number; stroke?: number; children?: React.ReactNode; className?: string }) {
  const r = (size - stroke) / 2;
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <span className={`relative inline-grid place-items-center ${className}`} style={{ width: size, height: size }}>
      <svg aria-hidden viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" pathLength={100} strokeDasharray={`${pct} 100`} className="ring-fill" />
      </svg>
      <span className="relative text-center leading-none">{children}</span>
    </span>
  );
}

/** Batang horizontal berurutan; lebar = nilai terhadap nilai terbesar. */
export function BarList({ rows, format, barClassName = "bg-turf", className = "" }: { rows: { label: string; value: number; hint?: string }[]; format: (n: number) => string; barClassName?: string; className?: string }) {
  const hi = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ol className={`grid gap-3.5 ${className}`}>
      {rows.map((r, i) => (
        <li key={r.label}>
          <span className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-bold">{r.label}</span>
            <span className="shrink-0 font-extrabold tabular-nums">{format(r.value)}</span>
          </span>
          <span aria-hidden className="mt-1.5 block h-2.5 overflow-hidden rounded-full bg-black/[0.07]">
            <span className={`grow-bar block h-full origin-left rounded-full ${barClassName}`} style={{ transform: `scaleX(${r.value / hi})`, animationDelay: `${i * 70}ms` }} />
          </span>
          {r.hint ? <span className="mt-1 block text-xs text-ink-soft">{r.hint}</span> : null}
        </li>
      ))}
    </ol>
  );
}
