import { Check } from "lucide-react";
import type { Role } from "@/server/permissions";

/** Penjelasan peran dengan bahasa sehari-hari. */
export const ROLE_INFO: { id: Role; label: string; hint: string }[] = [
  { id: "owner", label: "Pemilik", hint: "Semua akses, termasuk mengatur Pemilik lain." },
  { id: "admin", label: "Admin", hint: "Kelola staf, tim, pemain, jadwal, dan kontak orang tua." },
  { id: "head_coach", label: "Kepala pelatih", hint: "Kelola semua tim, pemain, jadwal, dan absensi." },
  { id: "coach", label: "Pelatih", hint: "Hanya tim yang dipegang: jadwal dan absensi." },
  { id: "treasurer", label: "Bendahara", hint: "Iuran bulanan dan kontak orang tua untuk penagihan." },
];

/** Pilihan peran (boleh lebih dari satu) dan tim yang dipegang. */
export function RoleFields({
  canGrantOwner,
  roles = [],
  teams,
  teamIds = [],
  errors,
}: {
  canGrantOwner: boolean;
  roles?: Role[];
  teams: { id: string; name: string }[];
  teamIds?: string[];
  errors: Record<string, string>;
}) {
  return (
    <>
      <fieldset>
        <legend className="mb-1 text-sm font-bold">Peran</legend>
        <p className="mb-3 text-sm text-ink-soft">Boleh lebih dari satu. Aksesnya digabung.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {ROLE_INFO.filter((r) => canGrantOwner || r.id !== "owner").map((r) => (
            <label key={r.id} className="cursor-pointer">
              <input type="checkbox" name="roles" value={r.id} defaultChecked={roles.includes(r.id)} className="peer sr-only" />
              <span className="flex h-full gap-3 rounded-[1.25rem] border-2 border-line bg-chalk p-4 transition peer-checked:border-pitch peer-checked:bg-turf-soft peer-focus-visible:outline-2 peer-focus-visible:outline-pitch hover:border-ink-soft/30 [&_svg]:invisible peer-checked:[&_svg]:visible">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 border-pitch">
                  <Check aria-hidden className="size-3.5 text-pitch" strokeWidth={3} />
                </span>
                <span>
                  <span className="block font-extrabold">{r.label}</span>
                  <span className="block text-sm text-ink-soft">{r.hint}</span>
                </span>
              </span>
            </label>
          ))}
        </div>
        {errors.roles ? <p className="mt-2 text-sm font-semibold text-[#b42318]">{errors.roles}</p> : null}
      </fieldset>
      {teams.length ? (
        <fieldset>
          <legend className="mb-1 text-sm font-bold">Tim yang dipegang</legend>
          <p className="mb-3 text-sm text-ink-soft">Wajib untuk Pelatih agar bisa melihat timnya.</p>
          <div className="flex flex-wrap gap-2">
            {teams.map((t) => (
              <label key={t.id} className="cursor-pointer">
                <input type="checkbox" name="teamIds" value={t.id} defaultChecked={teamIds.includes(t.id)} className="peer sr-only" />
                <span className="flex h-11 items-center gap-1.5 rounded-full border-2 border-line bg-chalk px-4 font-bold transition peer-checked:border-pitch peer-checked:bg-pitch peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-pitch [&>svg]:hidden peer-checked:[&>svg]:block">
                  <Check aria-hidden className="size-4" />
                  {t.name}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
    </>
  );
}
