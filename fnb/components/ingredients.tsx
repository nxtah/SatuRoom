/* Gambar bahan makanan sederhana untuk halaman perkenalan: bentuk datar, warna dari palet Rasa. */
export function Tomato({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 100 100" className={className}>
      <ellipse cx="50" cy="58" rx="40" ry="36" fill="#e0452a" />
      <ellipse cx="36" cy="46" rx="9" ry="6" fill="#fff" opacity="0.28" transform="rotate(-30 36 46)" />
      <path d="M50 24 L40 12 L50 18 L60 10 L56 24 L70 22 L56 30 Q50 34 44 30 L30 22 Z" fill="#317159" />
    </svg>
  );
}

export function Chili({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 100 100" className={className}>
      <path d="M22 28 Q70 6 86 54 Q90 80 76 90 Q82 56 56 40 Q38 32 22 28 Z" fill="#bf2f17" />
      <path d="M22 28 Q16 18 24 12 Q30 20 34 26 Z" fill="#317159" />
      <path d="M60 34 Q78 44 80 66" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.3" />
    </svg>
  );
}

export function Leaf({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 100 100" className={className}>
      <path d="M14 86 Q8 30 62 12 Q92 8 90 38 Q84 82 14 86 Z" fill="#317159" />
      <path d="M14 86 Q44 56 78 24" stroke="#fff4e2" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6" />
    </svg>
  );
}

export function Egg({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 100 100" className={className}>
      <path d="M50 14 C74 14 92 34 88 58 C84 84 60 92 42 88 C20 84 8 62 18 38 C24 24 36 14 50 14 Z" fill="#fff" />
      <circle cx="52" cy="54" r="19" fill="#f7cb45" />
      <circle cx="46" cy="48" r="5" fill="#fff" opacity="0.5" />
    </svg>
  );
}
