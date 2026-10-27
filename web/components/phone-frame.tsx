/** Bingkai ponsel untuk contoh layar. Isi di dalamnya adalah contoh, bukan data asli. */
export function PhoneFrame({
  children,
  label,
  className = "",
  tone = "pitch",
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
  tone?: "pitch" | "kitchen";
}) {
  return (
    <figure
      aria-label={label}
      className={`relative mx-auto w-full max-w-[320px] rounded-[2.75rem] ${tone === "kitchen" ? "bg-kitchen" : "bg-pitch"} p-2.5 shadow-phone ${className}`}
    >
      <div className="relative overflow-hidden rounded-[2.25rem] bg-mist">
        <div className={`absolute top-2 left-1/2 z-10 h-6 w-24 -translate-x-1/2 rounded-full ${tone === "kitchen" ? "bg-kitchen" : "bg-pitch"}`} />
        {children}
      </div>
    </figure>
  );
}
