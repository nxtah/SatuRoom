import { useId, type ComponentProps, type ReactNode } from "react";

interface FieldProps extends ComponentProps<"input"> {
  label: string;
  hint?: ReactNode;
  error?: string;
  trailing?: ReactNode;
}

/** Isian dengan label, petunjuk, dan pesan error yang terhubung ke pembaca layar. */
export function Field({ label, hint, error, trailing, id, className = "", ...props }: FieldProps) {
  const auto = useId();
  const inputId = id ?? auto;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-2 block text-sm font-bold text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ") || undefined}
          className={`h-13 w-full rounded-2xl border-2 bg-chalk px-4 text-base text-ink transition outline-none placeholder:text-ink-soft/60 focus:border-pitch ${
            error ? "border-[#d92d20]" : "border-line hover:border-ink-soft/30"
          } ${trailing ? "pr-14" : ""}`}
          {...props}
        />
        {trailing ? <div className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</div> : null}
      </div>
      {hint && !error ? (
        <p id={hintId} className="mt-2 text-sm text-ink-soft">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-2 text-sm font-semibold text-[#b42318]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
