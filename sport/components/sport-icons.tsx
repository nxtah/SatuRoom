import type { SportId } from "@/lib/sports";

/** Ikon cabang olahraga: bentuk datar satu warna (currentColor), digambar sendiri. */
export function SportIcon({ sport, className = "size-8" }: { sport: SportId; className?: string }) {
  const common = { "aria-hidden": true, viewBox: "0 0 48 48", fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round", className } as const;
  switch (sport) {
    case "football":
    case "futsal":
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="18" />
          <path d="M24 15l8 6-3 9h-10l-3-9z" fill="currentColor" stroke="none" />
          <path d="M24 15V6M32 21l9-3M29 30l5 8M19 30l-5 8M16 21l-9-3" />
        </svg>
      );
    case "basketball":
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="18" />
          <path d="M6 24h36M24 6v36M10 11c7 5 7 21 0 26M38 11c-7 5-7 21 0 26" />
        </svg>
      );
    case "volleyball":
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="18" />
          <path d="M24 6c-1 9 3 14 14 15M9 14c9-1 14 3 15 10M13 38c-1-9 3-14 11-14M40 31c-9 1-14-3-16-7" />
        </svg>
      );
    case "badminton":
      return (
        <svg {...common}>
          <path d="M20 28l-11 11M18 22l8 8M12 40l-3-3" />
          <path d="M24 24l15-15c3 3 3 7 0 10L28 30" />
          <path d="M31 17l-5-5M35 21l-5-5" />
        </svg>
      );
    case "tennis":
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="18" />
          <path d="M8 13c9 3 15 10 14 22M40 35c-9-3-15-10-14-22" />
        </svg>
      );
    case "swimming":
      return (
        <svg {...common}>
          <circle cx="32" cy="12" r="4" fill="currentColor" stroke="none" />
          <path d="M8 26l10-7 8 4 5-5M4 34c4 0 4-3 8-3s4 3 8 3 4-3 8-3 4 3 8 3 4-3 8-3M4 42c4 0 4-3 8-3s4 3 8 3 4-3 8-3 4 3 8 3 4-3 8-3" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M14 8h20v10a10 10 0 01-20 0zM14 12H7c0 7 3 10 8 10M34 12h7c0 7-3 10-8 10M24 28v8M16 40h16" />
        </svg>
      );
  }
}
