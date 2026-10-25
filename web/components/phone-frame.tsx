/** Bingkai ponsel untuk contoh layar. Isi di dalamnya adalah contoh, bukan data asli. */
export function PhoneFrame({
  children,
  label,
  className = "",
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <figure
      aria-label={label}
      className={`relative mx-auto w-full max-w-[320px] rounded-[2.75rem] bg-pitch p-2.5 shadow-[0_40px_80px_-30px_rgb(13_59_46/0.55),0_0_0_1px_rgb(255_255_255/0.06)_inset] ${className}`}
    >
      <div className="relative overflow-hidden rounded-[2.25rem] bg-mist">
        <div className="absolute top-2 left-1/2 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-pitch" />
        {children}
      </div>
    </figure>
  );
}
