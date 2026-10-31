import { thumb } from "@/lib/images";
import { Img } from "./img";

/** Logo akademi; tanpa logo tampil huruf pertama nama akademi. */
export function AcademyMark({ name, logoUrl, className = "size-10 rounded-xl text-base" }: { name: string; logoUrl: string | null; className?: string }) {
  const src = thumb(logoUrl, 160);
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden bg-pitch font-extrabold text-white ${className}`}>
      {src ? <Img src={src} alt={`Logo ${name}`} className="size-full bg-white object-cover" /> : name[0]?.toUpperCase()}
    </span>
  );
}
