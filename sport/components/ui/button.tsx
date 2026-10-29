import Link from "next/link";
import type { ComponentProps } from "react";

const VARIANT = {
  primary:
    "bg-ember text-ink shadow-[0_10px_24px_-12px_rgb(120_160_0/0.6)] hover:bg-[#d7ff55] disabled:bg-line disabled:text-ink-soft disabled:shadow-none",
  dark: "bg-pitch text-white hover:bg-pitch-2 disabled:opacity-50",
  outline: "border border-line bg-chalk text-ink hover:border-ink-soft/40 hover:bg-mist disabled:opacity-50",
  ghost: "text-ink hover:bg-chalk/70 disabled:opacity-50",
  danger: "bg-[#fdecec] text-[#b42318] hover:bg-[#fbdcdc] disabled:opacity-50",
} as const;

const SIZE = {
  md: "h-12 px-6 text-[15px]",
  sm: "h-10 px-4 text-sm",
  lg: "h-14 px-8 text-base",
} as const;

type Style = { variant?: keyof typeof VARIANT; size?: keyof typeof SIZE; block?: boolean };

const classes = ({ variant = "primary", size = "md", block }: Style, extra = "") =>
  `inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-bold transition active:scale-[0.98] disabled:pointer-events-none ${VARIANT[variant]} ${SIZE[size]} ${block ? "w-full" : ""} ${extra}`;

export function Button({ variant, size, block, className, ...props }: ComponentProps<"button"> & Style) {
  return <button type="button" className={classes({ variant, size, block }, className)} {...props} />;
}

export function ButtonLink({ variant, size, block, className, ...props }: ComponentProps<typeof Link> & Style) {
  return <Link className={classes({ variant, size, block }, className)} {...props} />;
}
