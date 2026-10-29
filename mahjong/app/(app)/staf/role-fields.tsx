import { Check } from "lucide-react";
import { ROLE_HINT, ROLE_LABEL, ROLES, type Role } from "@/server/permissions";

export const ROLE_INFO: { id: Role; label: string; hint: string }[] = ROLES.map((id) => ({ id, label: ROLE_LABEL[id], hint: ROLE_HINT[id] }));

/** Pilihan peran (boleh lebih dari satu). */
export function RoleFields({ canGrantOwner, roles = [], errors }: { canGrantOwner: boolean; roles?: Role[]; errors: Record<string, string> }) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-bold">Peran</legend>
      <p className="mb-3 text-sm text-ink-soft">Boleh lebih dari satu. Aksesnya digabung.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {ROLE_INFO.filter((r) => canGrantOwner || r.id !== "owner").map((r) => (
          <label key={r.id} className="cursor-pointer">
            <input type="checkbox" name="roles" value={r.id} defaultChecked={roles.includes(r.id)} className="peer sr-only" />
            <span className="flex h-full gap-3 rounded-xl border-2 border-line bg-chalk p-4 transition peer-checked:border-pitch peer-checked:bg-turf-soft peer-focus-visible:outline-2 peer-focus-visible:outline-pitch hover:border-ink-soft/30 [&_svg]:invisible peer-checked:[&_svg]:visible">
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
  );
}
