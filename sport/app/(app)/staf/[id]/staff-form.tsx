"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { StaffUpdateInput } from "@/lib/schemas";
import { useForm } from "@/lib/use-form";
import type { Role } from "@/server/permissions";
import { RoleFields } from "../role-fields";

interface Props {
  id: string;
  name: string;
  roles: Role[];
  customRoles: { id: string; name: string; description: string | null }[];
  customRoleIds: string[];
  branches: { id: string; name: string }[];
  branchIds: string[];
  teamIds: string[];
  teams: { id: string; name: string }[];
  canGrantOwner: boolean;
  active: boolean;
}

export function StaffForm({ id, name, roles, customRoles, customRoleIds, branches, branchIds, teamIds, teams, canGrantOwner, active }: Props) {
  const router = useRouter();
  const form = useForm(StaffUpdateInput);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusError, setStatusError] = useState<string>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    const data = new FormData(e.currentTarget);
    const done = await form.submit({ roles: data.getAll("roles"), customRoleIds: data.getAll("customRoleIds"), branchIds: data.getAll("branchIds"), teamIds: data.getAll("teamIds") }, (input) =>
      api<void>(`/staff/${id}`, { method: "PATCH", body: input }),
    );
    if (!done) return;
    setSaved(true);
    router.refresh();
  }

  async function toggle() {
    setBusy(true);
    const r = await api<void>(`/staff/${id}/status`, { body: { status: active ? "suspended" : "active" } });
    setBusy(false);
    if (!r.ok) return setStatusError(r.error.message);
    router.refresh();
  }

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="rise grid gap-6 rounded-[2rem] bg-chalk p-6 sm:p-8" aria-label="Peran dan tim">
        {form.error && !form.error.fields ? <Alert tone="error">{form.error.message}</Alert> : null}
        {saved ? <Alert tone="success">Peran dan tim tersimpan.</Alert> : null}
        <RoleFields canGrantOwner={canGrantOwner} roles={roles} customRoles={customRoles} customRoleIds={customRoleIds} branches={branches} branchIds={branchIds} teams={teams} teamIds={teamIds} errors={form.fields} />
        <Button type="submit" disabled={form.pending} className="justify-self-start">
          {form.pending ? "Menyimpan…" : "Simpan perubahan"}
        </Button>
      </form>
      <section className="mt-5 rounded-[2rem] border-2 border-dashed border-line p-6">
        <p className="text-sm text-ink-soft">
          {active
            ? `Nonaktifkan bila ${name} tidak lagi bekerja di akademi. Aksesnya langsung tertutup; riwayat absensinya tetap tersimpan.`
            : `${name} tidak bisa membuka akademi ini sampai diaktifkan lagi.`}
        </p>
        {statusError ? (
          <div className="mt-3">
            <Alert tone="error">{statusError}</Alert>
          </div>
        ) : null}
        <Button variant={active ? "outline" : "dark"} className="mt-4" disabled={busy} onClick={toggle}>
          {busy ? "Menyimpan…" : active ? "Nonaktifkan akses" : "Aktifkan lagi"}
        </Button>
      </section>
    </>
  );
}
