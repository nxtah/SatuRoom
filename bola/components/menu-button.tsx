"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  label: string;
  buttonClassName: string;
  button: ReactNode;
  align: "left" | "right";
  children: (close: () => void) => ReactNode;
}

/** Tombol dengan menu melayang; tertutup saat klik di luar atau tekan Escape. */
export function MenuButton({ label, buttonClassName, button, align, children }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className={buttonClassName}
      >
        {button}
      </button>
      {open ? (
        <div
          role="menu"
          className={`absolute z-40 mt-2 w-72 rounded-[1.5rem] border border-line bg-chalk p-2 shadow-[0_24px_60px_-24px_rgb(13_59_46/0.45)] ${
            align === "left" ? "left-0" : "right-0"
          }`}
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}
