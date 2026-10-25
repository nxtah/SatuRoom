/**
 * Data demo untuk mencoba aplikasi di laptop: satu akademi dengan staf semua peran, tim, pemain,
 * jadwal, absensi, dan iuran. Akun langsung terverifikasi (tanpa email).
 *
 * HANYA untuk database dev. Menolak jalan bila DATABASE_URL bukan localhost.
 * Jalankan: pnpm --filter @saturoom/bola seed:demo
 */
import { getSession, login, registerUser, verifyEmail } from "@saturoom/core/auth";
import { withContext } from "@saturoom/core/db";
import { memberships, users } from "@saturoom/core/schema";
import { eq, sql } from "drizzle-orm";
import { createAcademy } from "@/server/academy";
import { saveAttendance } from "@/server/attendance";
import { loadAcademyContext } from "@/server/context";
import { db } from "@/server/db";
import { generateInvoices, monthSummary, setTeamFee, updateInvoice } from "@/server/fees";
import { submitNotice } from "@/server/player-account";
import { createPlayer } from "@/server/players";
import type { Role } from "@/server/permissions";
import { addDays, createSchedule, listSessions } from "@/server/schedule";
import { staffRoles, teamCoaches } from "@/server/schema";
import { createTeam } from "@/server/teams";

const PASSWORD = "demo-saturoom-2026";
const DOMAIN = "demo.saturoom.id";

if (!/@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "")) {
  console.error("Ditolak: seed demo hanya untuk database di localhost.");
  process.exit(1);
}

async function account(name: string, local: string) {
  const email = `${local}@${DOMAIN}`;
  const reg = await registerUser(db(), { name, email, password: PASSWORD });
  if (reg.status !== "created") throw new Error(`Akun ${email} sudah ada. Data demo sudah pernah dibuat.`);
  await verifyEmail(db(), reg.verifyToken);
  const res = await login(db(), { email, password: PASSWORD, product: "bola" });
  if (res.status !== "ok") throw new Error(`gagal masuk ${email}`);
  return { ...(await getSession(db(), res.token, "bola"))!, email, token: res.token };
}

const FIRST = ["Andi", "Bayu", "Cahya", "Dimas", "Eko", "Fajar", "Gilang", "Hafiz", "Irfan", "Joko", "Krisna", "Lutfi", "Malik", "Nanda", "Oki", "Putra", "Raka", "Satria", "Tegar", "Umar", "Vino", "Wahyu", "Yoga", "Zaki"];
const LAST = ["Pratama", "Saputra", "Wijaya", "Nugroho", "Santoso", "Hidayat", "Kurniawan", "Setiawan"];
const PARENT = ["Ibu Sari", "Bapak Budi", "Ibu Rina", "Bapak Agus", "Ibu Dewi", "Bapak Hendra"];

async function main() {
  const owner = await account("Hendra Wijaya", "pemilik");
  const academyId = await createAcademy(owner, { name: "SSB Garuda Muda", city: "Bandung" });
  // Sesi dibaca ulang: createAcademy sudah memilih akademi ini sebagai akademi aktif.
  const ownerSession = (await getSession(db(), owner.token, "bola"))!;
  const ctx = await loadAcademyContext(ownerSession);

  const teams = [
    { name: "KU 6-9", ageMin: 6, ageMax: 9, fee: 100_000, born: 2018 },
    { name: "KU 10-13", ageMin: 10, ageMax: 13, fee: 150_000, born: 2014 },
    { name: "KU 14-17", ageMin: 14, ageMax: 17, fee: 200_000, born: 2010 },
  ];
  const teamIds: string[] = [];
  let n = 0;
  for (const t of teams) {
    const id = await createTeam(ctx, { name: t.name, ageMin: t.ageMin, ageMax: t.ageMax });
    teamIds.push(id);
    await setTeamFee(ctx, id, t.fee);
    for (let i = 0; i < 8; i++, n++) {
      await createPlayer(ctx, {
        fullName: `${FIRST[n % FIRST.length]} ${LAST[(n * 3) % LAST.length]}`,
        birthDate: `${t.born + (i % 3)}-${String((i % 12) + 1).padStart(2, "0")}-${String(((i * 7) % 27) + 1).padStart(2, "0")}`,
        teamIds: [id],
        position: (["kiper", "belakang", "tengah", "depan"] as const)[i % 4],
        shirtNumber: i + 1,
        guardianName: PARENT[n % PARENT.length],
        guardianPhone: i % 4 === 3 ? null : `0812 ${String(1000 + n).padStart(4, "0")} ${String(5000 + n * 7).slice(0, 4)}`,
      });
    }
  }

  // Staf dengan semua peran. Pelatih memegang KU 10-13 saja.
  const staff: { name: string; local: string; roles: Role[]; teams: string[] }[] = [
    { name: "Rina Admin", local: "admin", roles: ["admin"], teams: [] },
    { name: "Budi Kepala Pelatih", local: "kepalapelatih", roles: ["head_coach"], teams: [teamIds[2]!] },
    { name: "Tomi Pelatih", local: "pelatih", roles: ["coach"], teams: [teamIds[1]!] },
    { name: "Ani Bendahara", local: "bendahara", roles: ["treasurer"], teams: [] },
  ];
  for (const s of staff) {
    const user = await account(s.name, s.local);
    await withContext(db(), { userId: ctx.userId, businessId: academyId }, async (tx) => {
      const [m] = await tx.insert(memberships).values({ businessId: academyId, userId: user.userId }).returning();
      await tx.insert(staffRoles).values(s.roles.map((role) => ({ businessId: academyId, membershipId: m!.id, role })));
      if (s.teams.length) {
        await tx.insert(teamCoaches).values(s.teams.map((teamId) => ({ businessId: academyId, teamId, membershipId: m!.id })));
      }
    });
  }

  // Jadwal rutin Selasa, Kamis, Sabtu. Aplikasi hanya mengizinkan mulai 7 hari lalu, jadi untuk riwayat
  // 6 minggu tanggal mulainya dimundurkan langsung di database, lalu sesinya dibuat.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const start = addDays(today, -41);
  for (const id of teamIds) {
    await createSchedule(ctx, { teamId: id, weekdays: [2, 4, 6], startTime: "15:30", durationMin: 90, startsOn: addDays(today, -7) });
  }
  await withContext(db(), { userId: ctx.userId, businessId: academyId }, async (tx) => {
    await tx.execute(sql`UPDATE bola.schedules SET starts_on = ${start}::date`);
    await tx.execute(sql`SELECT bola.generate_sessions(${start}::date, ${today}::date)`);
  });
  const past = (await listSessions(ctx, { from: start, to: addDays(today, -1) })).filter((s) => s.status === "scheduled");
  const roster = async (teamId: string) =>
    (await withContext(db(), { userId: ctx.userId, businessId: academyId }, (tx) =>
      tx.execute(sql`SELECT player_id AS id FROM bola.team_players WHERE team_id = ${teamId}::uuid ORDER BY player_id`),
    )) as unknown as { id: string }[];
  for (const [si, s] of past.entries()) {
    const players = await roster(s.teamId);
    // Kehadiran naik pelan dari minggu ke minggu agar grafik terlihat hidup.
    const week = Math.floor((si / past.length) * 6);
    await saveAttendance(ctx, s.id, {
      entries: players.map((p, i) => ({
        playerId: p.id,
        // Satu pemain KU 10-13 alpa terus di sesi terakhir agar muncul di "Perlu perhatian".
        status:
          s.teamId === teamIds[1] && i === 0 && s.date >= addDays(today, -9)
            ? "absent"
            : (i + si) % (9 + week * 2) === 0
              ? "sick"
              : (i * 3 + si) % (10 + week * 2) === 0
                ? "excused"
                : (i + 2 * si) % (8 + week * 3) === 0
                  ? "absent"
                  : "present",
      })),
    });
  }

  // Iuran bulan ini: sebagian sudah lunas.
  const month = today.slice(0, 7);
  await generateInvoices(ctx, month);
  const { invoices } = await monthSummary(ctx, month);
  for (const [i, inv] of invoices.entries()) {
    if (i % 3 !== 0) await updateInvoice(ctx, inv.id, { action: "pay", method: i % 2 ? "transfer" : "cash" });
  }

  // Akun pemain (satu pemain satu akun) dengan persetujuan orang tua, plus satu izin untuk latihan berikutnya.
  const playerUser = await account("Oki Santoso", "pemain");
  const kid = (await roster(teamIds[1]!))[1]!.id;
  await withContext(db(), { userId: ctx.userId, businessId: academyId }, (tx) =>
    tx.execute(sql`INSERT INTO bola.player_accounts (business_id, player_id, user_id, consent_at, consent_by)
                   VALUES (${academyId}::uuid, ${kid}::uuid, ${playerUser.userId}::uuid, now(), 'Ibu Sari (demo)')`),
  );
  const next = (await listSessions(ctx, { from: today, to: addDays(today, 7) })).find(
    (s) => s.teamId === teamIds[1] && s.status === "scheduled" && s.date > today,
  );
  if (next) await submitNotice(playerUser, { sessionId: next.id, status: "excused", note: "Acara keluarga" });

  const [count] = await db().select({ n: sql<number>`count(*)::int` }).from(users).where(eq(users.email, owner.email));
  console.log(`Data demo siap (${count?.n} pemilik, ${n} pemain, ${past.length} sesi berabsen).`);
  console.log(`Password semua akun: ${PASSWORD}`);
  for (const l of ["pemilik", ...staff.map((s) => s.local), "pemain"]) console.log(`  ${l}@${DOMAIN}`);
  process.exit(0);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
