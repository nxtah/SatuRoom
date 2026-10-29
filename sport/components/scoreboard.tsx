import type { MatchResult } from "@/server/matches-shared";

export const RESULT_LABEL: Record<MatchResult, string> = { W: "Menang", D: "Seri", L: "Kalah" };
const RESULT_TONE: Record<MatchResult, string> = {
  W: "bg-ember text-ink",
  D: "bg-white/20 text-white",
  L: "bg-[#fdecec] text-[#912018]",
};

/** Chip hasil satu huruf (M, S, K), dipakai untuk deretan performa terakhir. */
export function FormChip({ result, className = "" }: { result: MatchResult; className?: string }) {
  const letter = { W: "M", D: "S", L: "K" }[result];
  return (
    <span
      title={RESULT_LABEL[result]}
      className={`grid size-8 place-items-center rounded-full text-sm font-extrabold ${RESULT_TONE[result]} ${className}`}
    >
      <span aria-hidden>{letter}</span>
      <span className="sr-only">{RESULT_LABEL[result]}</span>
    </span>
  );
}

/** Papan skor: tim kita di kiri, lawan di kanan. Skor kosong ditampilkan sebagai strip. */
export function Scoreboard({
  teamName,
  opponent,
  scoreUs,
  scoreThem,
  result,
}: {
  teamName: string;
  opponent: string | null;
  scoreUs: number | null;
  scoreThem: number | null;
  result: MatchResult | null;
}) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-pitch p-5 text-white sm:p-7">
      <span aria-hidden className="pointer-events-none absolute -top-8 right-[18%] h-48 w-4 -rotate-[24deg] bg-ember/80" />
      <span aria-hidden className="pointer-events-none absolute -top-8 right-[calc(18%-2rem)] h-48 w-1.5 -rotate-[24deg] bg-ember/40" />
      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
        <p className="min-w-0 text-right text-base leading-tight font-extrabold break-words sm:text-xl">{teamName}</p>
        <p className="font-display text-5xl leading-none font-extrabold italic tabular-nums sm:text-7xl" aria-label={scoreUs === null ? "Skor belum diisi" : `Skor ${scoreUs} lawan ${scoreThem}`}>
          {scoreUs ?? "-"}
          <span aria-hidden className="mx-1.5 text-ember sm:mx-3">:</span>
          {scoreThem ?? "-"}
        </p>
        <p className="min-w-0 text-base leading-tight font-extrabold break-words text-white/85 sm:text-xl">{opponent ?? "Lawan belum diisi"}</p>
      </div>
      {result ? (
        <p className="relative mt-4 text-center">
          <span className={`inline-block rounded-full px-4 py-1 text-sm font-extrabold ${RESULT_TONE[result]}`}>{RESULT_LABEL[result]}</span>
        </p>
      ) : null}
    </div>
  );
}
