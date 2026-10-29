/** Nilai 1 sampai 5 sebagai lima bulatan; teks untuk pembaca layar. */
export function RatingDots({ value, label }: { value: number; label: string }) {
  return (
    <span role="img" aria-label={`${label}: ${value} dari 5`} className="inline-flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} aria-hidden className={`size-3.5 rounded-full ${n <= value ? "bg-ember" : "bg-line"}`} />
      ))}
    </span>
  );
}
