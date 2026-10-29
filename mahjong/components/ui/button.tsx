import Link from "next/link";
import type { ComponentProps } from "react";

const VARIANT = {
  primary:
    "bg-ember text-white shadow-[0_4px_0_var(--color-ember-deep)] hover:brightness-110 active:translate-y-[3px] active:shadow-[0_1px_0_var(--color-ember-deep)] disabled:bg-line disabled:text-ink-soft disabled:shadow-[0_4px_0_var(--color-edge)]",
  dark: "bg-pitch text-white shadow-[0_4px_0_var(--color-night)] hover:bg-pitch-2 active:translate-y-[3px] active:shadow-[0_1px_0_var(--color-night)] disabled:opacity-50",
  outline: "border border-line bg-chalk text-ink shadow-[0_3px_0_var(--color-edge)] hover:border-ink-soft/40 active:translate-y-[2px] active:shadow-[0_1px_0_var(--color-edge)] disabled:opacity-50",
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
  `inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-bold transition disabled:pointer-events-none ${VARIANT[variant]} ${SIZE[size]} ${block ? "w-full" : ""} ${extra}`;

export function Button({ variant, size, block, className, ...props }: ComponentProps<"button"> & Style) {
  return <button type="button" className={classes({ variant, size, block }, className)} {...props} />;
}

export function ButtonLink({ variant, size, block, className, ...props }: ComponentProps<typeof Link> & Style) {
  return <Link className={classes({ variant, size, block }, className)} {...props} />;
}
