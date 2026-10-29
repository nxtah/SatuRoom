/**
 * Ubin mahjong digambar sendiri (SVG): titik, bambu, dan kehormatan. Dipakai sebagai hiasan dan penanda,
 * bukan untuk menyampaikan informasi, jadi selalu tersembunyi dari pembaca layar.
 */
const DOTS: Record<number, [number, number][]> = {
  1: [[50, 70]],
  2: [[50, 38], [50, 102]],
  3: [[28, 28], [50, 70], [72, 112]],
  4: [[30, 40], [70, 40], [30, 100], [70, 100]],
  5: [[30, 36], [70, 36], [50, 70], [30, 104], [70, 104]],
  6: [[30, 28], [70, 28], [30, 70], [70, 70], [30, 112], [70, 112]],
  7: [[24, 24], [50, 36], [76, 48], [30, 90], [70, 90], [30, 116], [70, 116]],
  8: [[30, 24], [70, 24], [30, 55], [70, 55], [30, 86], [70, 86], [30, 117], [70, 117]],
  9: [[26, 30], [50, 30], [74, 30], [26, 70], [50, 70], [74, 70], [26, 110], [50, 110], [74, 110]],
};
const DOT_COLOR = ["#1f8f64", "#d7371f", "#1b5fa8"];

const STICKS: Record<number, [number, number][]> = {
  1: [[50, 70]],
  2: [[36, 70], [64, 70]],
  3: [[50, 38], [34, 102], [66, 102]],
  4: [[34, 40], [66, 40], [34, 100], [66, 100]],
  5: [[30, 38], [70, 38], [50, 70], [30, 102], [70, 102]],
  6: [[26, 40], [50, 40], [74, 40], [26, 100], [50, 100], [74, 100]],
  7: [[50, 26], [26, 70], [50, 70], [74, 70], [26, 112], [50, 112], [74, 112]],
  8: [[30, 38], [70, 38], [50, 38], [30, 102], [70, 102], [50, 102], [50, 70], [50, 70]],
  9: [[26, 36], [50, 36], [74, 36], [26, 70], [50, 70], [74, 70], [26, 104], [50, 104], [74, 104]],
};

export type TileFace = { kind: "dots"; n: number } | { kind: "bamboo"; n: number } | { kind: "glyph"; text: string; tone?: "red" | "green" | "ink" };

export function Tile({ face, className = "", back = false }: { face: TileFace; className?: string; back?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 100 140" className={`block aspect-[5/7] ${className}`}>
      <rect x="2" y="8" width="96" height="130" rx="14" fill="#c3cbbb" />
      <rect x="2" y="2" width="96" height="130" rx="14" fill={back ? "#1f8f64" : "#fcfaf2"} stroke={back ? "#0f3a2d" : "#d3dccf"} strokeWidth="1.5" />
      {back ? (
        <rect x="14" y="14" width="72" height="106" rx="8" fill="none" stroke="#0f3a2d" strokeOpacity=".35" strokeWidth="2" />
      ) : face.kind === "dots" ? (
        DOTS[face.n]!.map(([x, y], i) => {
          const r = face.n === 1 ? 26 : face.n > 6 ? 9.5 : 11.5;
          const c = DOT_COLOR[(face.n + i) % 3 === 0 && face.n > 2 ? 1 : face.n % 2 === 0 ? 0 : i % 2 ? 2 : 0]!;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={r} fill={c} />
              <circle cx={x} cy={y} r={r * 0.52} fill="#fcfaf2" />
              <circle cx={x} cy={y} r={r * 0.28} fill={c} />
            </g>
          );
        })
      ) : face.kind === "bamboo" ? (
        STICKS[face.n]!.map(([x, y], i) => (
          <g key={i}>
            <rect x={x - 6} y={y - 20} width="12" height="40" rx="6" fill={i % 4 === 2 && face.n > 4 ? "#d7371f" : "#1f8f64"} />
            <rect x={x - 6} y={y - 2} width="12" height="3" fill="#fcfaf2" opacity=".8" />
          </g>
        ))
      ) : (
        <text x="50" y="86" textAnchor="middle" fontSize="64" className="cjk" fill={face.tone === "green" ? "#1f8f64" : face.tone === "ink" ? "#0c1f18" : "#d7371f"}>
          {face.text}
        </text>
      )}
    </svg>
  );
}

/** Deretan ubin kecil sebagai pemisah dekoratif. */
export function TileRow({ faces, className = "" }: { faces: TileFace[]; className?: string }) {
  return (
    <div aria-hidden className={`flex gap-1.5 ${className}`}>
      {faces.map((f, i) => (
        <Tile key={i} face={f} className="w-7 sm:w-8" />
      ))}
    </div>
  );
}
