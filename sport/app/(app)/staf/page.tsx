import { ChevronRight, Mail, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { ROLE_LABEL } from "@/server/permissions";
import { requireAcademyPage } from "@/server/routing";
import { listStaff, roleLabels } from "@/server/staff";
import { RevokeButton } from "./revoke-button";

export const metadata: Metadata = { title: "Staf" };

export default async function StafPage({ searchParams }: { searchParams: Promise<{ terkirim?: string }> }) {
  const ctx = await requireAcademyPage();
  if (!ctx.can("staff.read")) redirect("/");
  const [{ members, invites }, sp] = await Promise.all([listStaff(ctx), searchParams]);
  const canManage = ctx.can("staff.manage");

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Staf"
        subtitle={`${members.filter((m) => m.status === "active").length} staf aktif`}
        action={
          canManage ? (
            <ButtonLink href="/staf/undang">
              <UserPlus aria-hidden className="size-5" /> Undang staf
            </ButtonLink>
          ) : null
        }
      />
      {sp.terkirim === "1" ? (
        <div className="rise mb-4">
          <Alert tone="success">Undangan terkirim. Ia akan bergabung setelah menerima undangan.</Alert>
        </div>
      ) : null}

      <ul className="rise grid gap-2">
        {members.map((m) => {
          const content = (
            <>
              <span
                className={`grid size-12 shrink-0 place-items-center rounded-full font-extrabold ${
                  m.status === "active" ? "bg-ember text-ink" : "bg-mist text-ink-soft"
                }`}
              >
                {m.name[0]?.toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-extrabold">
                  {m.name}
                  {m.membershipId === ctx.membershipId ? <span className="font-semibold text-ink-soft"> (Anda)</span> : null}
                </span>
                <span className="mt-1 flex flex-wrap gap-1">
                  {m.status !== "active" ? (
                    <span className="rounded-full bg-[#fdecec] px-2.5 py-0.5 text-xs font-bold text-[#b42318]">Nonaktif</span>
                  ) : null}
                  {m.roles.map((r) => (
                    <span key={r} className="rounded-full bg-turf-soft px-2.5 py-0.5 text-xs font-bold text-pitch">
                      {ROLE_LABEL[r]}
                    </span>
                  ))}
                  {m.teams.map((t) => (
                    <span key={t.id} className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-bold text-ink-soft">
                      {t.name}
                    </span>
                  ))}
                </span>
              </span>
            </>
          );
          return (
            <li key={m.membershipId}>
              {canManage && m.membershipId !== ctx.membershipId ? (
                <Link
                  href={`/staf/${m.membershipId}`}
                  className="group flex items-center gap-4 rounded-[1.5rem] bg-chalk p-4 transition hover:-translate-y-0.5"
                >
                  {content}
                  <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-soft" />
                </Link>
              ) : (
                <div className="flex items-center gap-4 rounded-[1.5rem] bg-chalk p-4">{content}</div>
              )}
            </li>
          );
        })}
      </ul>

      {invites.length ? (
        <section className="rise mt-6" aria-labelledby="menunggu">
          <h2 id="menunggu" className="mb-2 text-sm font-extrabold text-ink-soft">
            Menunggu diterima
          </h2>
          <ul className="grid gap-2">
            {invites.map((i) => (
              <li key={i.id} className="flex items-center gap-4 rounded-[1.5rem] border-2 border-dashed border-line p-4">
                <Mail aria-hidden className="size-5 shrink-0 text-ink-soft" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{i.email}</span>
                  <span className="block text-sm text-ink-soft">{roleLabels(i.roles)}</span>
                </span>
                {canManage ? <RevokeButton id={i.id} email={i.email} /> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
