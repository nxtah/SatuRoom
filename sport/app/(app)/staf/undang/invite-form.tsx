"use client";

import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";
import { InviteInput } from "@/lib/schemas";
import { useForm } from "@/lib/use-form";
import { RoleFields } from "../role-fields";

export function InviteForm({
  teams,
  canGrantOwner,
  customRoles,
  branches,
}: {
  teams: { id: string; name: string }[];
  canGrantOwner: boolean;
  customRoles: { id: string; name: string; description: string | null }[];
  branches: { id: string; name: string }[];
}) {
  const router = useRouter();
  const form = useForm(InviteInput);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const raw = { email: data.get("email"), roles: data.getAll("roles"), customRoleIds: data.getAll("customRoleIds"), branchIds: data.getAll("branchIds"), teamIds: data.getAll("teamIds") };
    const done = await form.submit(raw, (input) => api<{ id: string }>("/staff", { body: input }));
    if (!done) return;
    router.push("/staf?terkirim=1");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6" aria-label="Undang staf">
      {form.error && !form.error.fields ? <Alert tone="error">{form.error.message}</Alert> : null}
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="off"
        placeholder="pelatih@contoh.id"
        hint="Undangan dikirim ke email ini. Ia masuk atau daftar dengan email yang sama."
        error={form.fields.email}
        autoFocus
      />
      <RoleFields canGrantOwner={canGrantOwner} roles={["coach"]} customRoles={customRoles} branches={branches} teams={teams} errors={form.fields} />
      <Button type="submit" disabled={form.pending} className="justify-self-start">
        {form.pending ? "Mengirim…" : "Kirim undangan"}
      </Button>
    </form>
  );
}
