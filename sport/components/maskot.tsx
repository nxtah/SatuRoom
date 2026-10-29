import Image from "next/image";

const VARIANT = {
  umum: { src: "/brand/maskot.webp", width: 697, height: 720 },
  bola: { src: "/brand/maskot-bola.webp", width: 900, height: 891 },
  basket: { src: "/brand/maskot-basket.webp", width: 874, height: 900 },
} as const;

/**
 * Maskot SatuRoom: naga oranye. Varian `bola` dan `basket` berseragam cabangnya; cabang lain
 * memakai maskot umum (bawa laptop). Dekoratif (alt kosong) kecuali diberi `alt`.
 */
export function Maskot({ className = "", alt = "", priority = false, variant = "umum" }: { className?: string; alt?: string; priority?: boolean; variant?: keyof typeof VARIANT }) {
  const v = VARIANT[variant];
  return (
    <Image
      src={v.src}
      alt={alt}
      width={v.width}
      height={v.height}
      priority={priority}
      unoptimized
      className={`h-auto w-full select-none ${className}`}
    />
  );
}

/** Logo SatuRoom (huruf S bergelombang). */
export function LogoMark({ className = "h-9" }: { className?: string }) {
  return <Image src="/brand/logo-mark.png" alt="" width={224} height={320} unoptimized className={`w-auto object-contain ${className}`} />;
}
