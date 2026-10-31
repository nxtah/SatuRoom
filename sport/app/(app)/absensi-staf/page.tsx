import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { requireAcademyPage } from "@/server/routing";
import { attendanceBoard, listStaffRequests, monthlyRecap, myAttendance } from "@/server/staff-attendance";
import { ApprovalList, ClockCard, MyRequests, RecapTable, RequestForm, TeamBoard } from "./parts";

export const metadata: Metadata = { title: "Absensi staf" };

const TABS = [
  { key: "saya", label: "Absen saya" },
  { key: "tim", label: "Hari ini" },
  { key: "pengajuan", label: "Pengajuan" },
  { key: "rekap", label: "Rekap bulanan" },
] as const;

export default async function AbsensiStafPage({ searchParams }: { searchParams: Promise<{ tab?: string; tanggal?: string; bulan?: string }> }) {
  const ctx = await requireAcademyPage();
  if (!ctx.modules.has("staff_attendance")) redirect("/");
  const params = await searchParams;
  const manage = ctx.can("staff_attendance.manage");
  const tab = manage && TABS.some((t) => t.key === params.tab) ? params.tab! : "saya";
  const me = await myAttendance(ctx);
  const pending = manage ? await listStaffRequests(ctx, "pending") : [];

  return (
    <div className="max-w-4xl">
      <PageHeader title="Absensi staf" subtitle="Absen masuk dan pulang, ajukan koreksi, cuti, atau lembur. Pengelola menyetujui dan melihat rekap." />
      {manage ? (
        <nav aria-label="Bagian absensi staf" className="rise mb-5 flex gap-2 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/absensi-staf?tab=${t.key}`}
              aria-current={tab === t.key ? "page" : undefined}
              className={`flex h-11 shrink-0 items-center gap-2 rounded-full px-4 font-bold transition ${tab === t.key ? "bg-pitch text-white" : "bg-chalk hover:bg-mist"}`}
            >
              {t.label}
              {t.key === "pengajuan" && pending.length ? (
                <span className="grid min-w-6 place-items-center rounded-full bg-ember px-1.5 text-xs font-extrabold text-ink">{pending.length}</span>
              ) : null}
            </Link>
          ))}
        </nav>
      ) : null}

      {tab === "saya" ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="grid content-start gap-5">
            <ClockCard me={me} />
            <MyRequests requests={me.requests} />
          </div>
          <RequestForm today={me.today} />
        </div>
      ) : null}
      {tab === "tim" ? <TeamBoard board={await attendanceBoard(ctx, params.tanggal)} /> : null}
      {tab === "pengajuan" ? <ApprovalList pending={pending} done={await listStaffRequests(ctx, "done")} selfId={ctx.membershipId} isOwner={ctx.roles.includes("owner")} /> : null}
      {tab === "rekap" ? <RecapTable month={/^\d{4}-\d{2}$/.test(params.bulan ?? "") ? params.bulan! : me.today.slice(0, 7)} rows={await monthlyRecap(ctx, /^\d{4}-\d{2}$/.test(params.bulan ?? "") ? params.bulan! : me.today.slice(0, 7))} /> : null}
    </div>
  );
}
