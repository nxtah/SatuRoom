
import { useId } from "react";

/**
 * Ruru: maskot SatuRoom, "kamar" kecil yang bulat. Satu karakter untuk semua kategori; kategori
 * hanya mengganti kostum. Dekoratif secara bawaan (aria-hidden); beri `title` bila gambar membawa makna.
 */
export type RuruPose = "wave" | "happy" | "think" | "cheer";
export type RuruCostume = "none" | "academy";

const INK = "#1E1B18";
const BODY = "#FF6A00";
const BODY_DEEP = "#C25000";
const PITCH = "#1F8A5B";

interface RuruProps {
  pose?: RuruPose;
  costume?: RuruCostume;
  className?: string;
  title?: string;
}

// Lengan sebagai garis tebal berujung bulat: [kiri, kanan] per pose.
const ARMS: Record<RuruPose, [string, string]> = {
  wave: ["M44 122 q-16 10 -14 28", "M154 114 q20 -6 22 -36"],
  happy: ["M44 122 q-16 10 -14 28", "M156 122 q16 10 14 28"],
  think: ["M44 122 q-16 10 -14 28", "M150 126 q-10 -4 -24 -6"],
  cheer: ["M44 108 q-20 -14 -16 -40", "M156 108 q20 -14 16 -40"],
};

const PUPIL_SHIFT: Record<RuruPose, [number, number]> = {
  wave: [2, 3],
  happy: [0, 3],
  think: [3, -4],
  cheer: [0, 2],
};

function Mouth({ pose }: { pose: RuruPose }) {
  if (pose === "think") return <ellipse cx="104" cy="124" rx="5" ry="6" fill="#7A1F00" />;
  const wide = pose === "cheer" ? 18 : 14;
  return (
    <g>
      <path
        d={`M${100 - wide} 116 Q100 ${pose === "cheer" ? 144 : 136} ${100 + wide} 116 Z`}
        fill="#7A1F00"
      />
      <ellipse cx="100" cy={pose === "cheer" ? 132 : 126} rx={wide * 0.45} ry="5" fill="#FF8A9A" />
    </g>
  );
}

export function Ruru({ pose = "happy", costume = "none", className, title }: RuruProps) {
  const [px, py] = PUPIL_SHIFT[pose];
  const [leftArm, rightArm] = ARMS[pose];
  // id clipPath harus unik: satu halaman bisa memuat beberapa Ruru.
  const clipId = `ruru-body-${useId().replace(/:/g, "")}`;
  return (
    <svg
      viewBox="0 0 200 210"
      className={`h-auto w-full overflow-visible ${className ?? ""}`}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <clipPath id={clipId}>
          <rect x="44" y="40" width="112" height="128" rx="42" />
        </clipPath>
      </defs>

      {/* bayangan lantai */}
      <ellipse cx="100" cy="196" rx="58" ry="7" fill={INK} opacity="0.08" />

      {/* lengan di belakang badan */}
      <g stroke={BODY_DEEP} strokeWidth="15" strokeLinecap="round" fill="none">
        <path d={leftArm} />
        <path d={rightArm} className={pose === "wave" ? "ruru-wave" : undefined} />
      </g>

      {/* kaki */}
      <ellipse cx="80" cy="184" rx="17" ry="10" fill={BODY_DEEP} />
      <ellipse cx="120" cy="184" rx="17" ry="10" fill={BODY_DEEP} />

      {/* jambul */}
      <path d="M98 42 C92 22 112 12 120 24 C112 26 104 32 98 42 Z" fill={BODY_DEEP} />

      {/* badan: bibir bawah lebih gelap agar terasa taktil */}
      <rect x="44" y="48" width="112" height="128" rx="42" fill={BODY_DEEP} />
      <rect x="44" y="40" width="112" height="128" rx="42" fill={BODY} />
      <ellipse
        cx="64"
        cy="66"
        rx="7"
        ry="12"
        transform="rotate(30 64 66)"
        fill="#FFFFFF"
        opacity="0.3"
      />

      {costume === "academy" ? (
        <g clipPath={`url(#${clipId})`}>
          <rect x="40" y="136" width="120" height="40" fill={PITCH} />
          <rect x="40" y="136" width="120" height="6" fill="#FFFFFF" opacity="0.9" />
          <text
            x="100"
            y="166"
            textAnchor="middle"
            fontSize="22"
            fontWeight="700"
            fill="#FFFFFF"
            fontFamily="var(--font-bricolage), sans-serif"
          >
            1
          </text>
        </g>
      ) : null}

      {/* mata */}
      {[78, 122].map((cx) => (
        <g key={cx}>
          <ellipse cx={cx} cy="94" rx="14" ry="17" fill="#FFFFFF" />
          <circle cx={cx + px} cy={94 + py} r="7.5" fill={INK} />
          <circle cx={cx + px + 2.5} cy={94 + py - 3} r="2.6" fill="#FFFFFF" />
        </g>
      ))}

      {/* pipi */}
      <ellipse cx="60" cy="120" rx="9" ry="5" fill="#FF8A9A" opacity="0.75" />
      <ellipse cx="140" cy="120" rx="9" ry="5" fill="#FF8A9A" opacity="0.75" />

      <Mouth pose={pose} />

      {costume === "academy" ? (
        <g transform="translate(166 176)">
          <circle r="17" fill="#FFFFFF" stroke={INK} strokeWidth="3" />
          <path d="M0 -7 L6.7 -2.2 L4.1 5.7 L-4.1 5.7 L-6.7 -2.2 Z" fill={INK} />
          <path
            d="M0 -7 L0 -16 M6.7 -2.2 L15 -5 M4.1 5.7 L9 13 M-4.1 5.7 L-9 13 M-6.7 -2.2 L-15 -5"
            stroke={INK}
            strokeWidth="2.5"
          />
        </g>
      ) : null}
    </svg>
  );
}

/** Kepala Ruru untuk logo kecil (sidebar, header). Selalu dekoratif: nama SatuRoom ada di teks. */
export function RuruMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={className}>
      <rect x="2" y="6" width="36" height="32" rx="12" fill={BODY_DEEP} />
      <rect x="2" y="3" width="36" height="32" rx="12" fill={BODY} />
      <path d="M19 4 C17 -1 23 -3 25 1 C22 1 20 2 19 4 Z" fill={BODY_DEEP} />
      <ellipse cx="14" cy="17" rx="4" ry="5" fill="#FFFFFF" />
      <ellipse cx="26" cy="17" rx="4" ry="5" fill="#FFFFFF" />
      <circle cx="14.5" cy="18" r="2.2" fill={INK} />
      <circle cx="26.5" cy="18" r="2.2" fill={INK} />
      <path d="M15 25 Q20 30 25 25 Z" fill="#7A1F00" />
    </svg>
  );
}
