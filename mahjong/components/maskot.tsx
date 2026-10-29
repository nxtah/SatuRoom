import Image from "next/image";

/**
 * Maskot SatuRoom: naga oranye (versi umum). Belum ada versi khusus mahjong dari pemilik.
 * Dekoratif (alt kosong) kecuali diberi `alt`.
 */
export function Maskot({ className = "", alt = "", priority = false }: { className?: string; alt?: string; priority?: boolean }) {
  return <Image src="/brand/maskot.webp" alt={alt} width={697} height={720} priority={priority} unoptimized className={`h-auto w-full select-none ${className}`} />;
}

/** Logo SatuRoom (huruf S bergelombang). */
export function LogoMark({ className = "h-9" }: { className?: string }) {
  return <Image src="/brand/logo-mark.png" alt="" width={224} height={320} unoptimized className={`w-auto object-contain ${className}`} />;
}
