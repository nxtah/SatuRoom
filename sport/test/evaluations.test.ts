import { withContext } from "@saturoom/core/db";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { createEvaluation, deleteEvaluation, listEvaluations, sendEvaluation, updateEvaluation } from "@/server/evaluations";
import { acceptPlayerInvitation, invitePlayerAccount, myPlayerInvitations, playerHome } from "@/server/player-account";
import { createPlayer } from "@/server/players";
import { teamCoaches } from "@/server/schema";
import { createTeam } from "@/server/teams";
import { academyOf, staffOf, userWithSession } from "./helpers";

const input = { period: "Semester 1 2026", technique: 4, tactics: 3, fitness: 5, attitude: 4, strengths: "Operan akurat.", focus: "Berani duel." };

async function coachOf(a: Awaited<ReturnType<typeof academyOf>>, teamId: string, name = "Pelatih") {
  const coach = await staffOf(a, ["coach"], name);
  await withContext(db(), { userId: a.ctx.userId, businessId: a.id }, (tx) =>
    tx.insert(teamCoaches).values({ businessId: a.id, teamId, membershipId: coach.membershipId }),
  );
  return coach;
}

describe("rapor pemain", () => {
  it("draf tidak terlihat pemain sampai dikirim, lalu terkunci", async () => {
    const a = await academyOf("Garuda");
    const team = await createTeam(a.ctx, { name: "U-10", ageMin: null, ageMax: null });
    const pid = await createPlayer(a.ctx, { fullName: "Raka", birthDate: "2015-03-14", teamIds: [team] });
    const user = await userWithSession("Raka");
    await invitePlayerAccount(a.ctx, pid, user.email);
    const [invite] = await myPlayerInvitations(user.userId);
    await acceptPlayerInvitation(user, invite!.id, "Ibu Sari");

    const id = await createEvaluation(a.ctx, pid, input);
    expect((await playerHome(user))!.evaluations).toEqual([]);
    await updateEvaluation(a.ctx, id, { ...input, technique: 5 });
    await sendEvaluation(a.ctx, id);
    const [rapor] = (await playerHome(user))!.evaluations;
    expect(rapor).toMatchObject({ period: "Semester 1 2026", technique: 5, focus: "Berani duel.", authorName: "Pemilik Garuda" });

    await expect(updateEvaluation(a.ctx, id, input)).rejects.toMatchObject({ status: 409 });
    await expect(deleteEvaluation(a.ctx, id)).rejects.toMatchObject({ status: 409 });
    const [row] = await listEvaluations(a.ctx, pid);
    expect(row).toMatchObject({ status: "sent", canEdit: false });
  });

  it("kirim langsung dan hapus draf", async () => {
    const a = await academyOf("Garuda");
    const team = await createTeam(a.ctx, { name: "U-10", ageMin: null, ageMax: null });
    const pid = await createPlayer(a.ctx, { fullName: "Raka", birthDate: "2015-03-14", teamIds: [team] });
    const sent = await createEvaluation(a.ctx, pid, { ...input, send: true });
    const draft = await createEvaluation(a.ctx, pid, input);
    await deleteEvaluation(a.ctx, draft);
    expect((await listEvaluations(a.ctx, pid)).map((e) => e.id)).toEqual([sent]);
  });

  it("pelatih hanya menilai pemain timnya dan hanya mengubah drafnya sendiri; kepala pelatih boleh semua", async () => {
    const a = await academyOf("Garuda");
    const u10 = await createTeam(a.ctx, { name: "U-10", ageMin: null, ageMax: null });
    const u12 = await createTeam(a.ctx, { name: "U-12", ageMin: null, ageMax: null });
    const mine = await createPlayer(a.ctx, { fullName: "Raka", birthDate: "2015-03-14", teamIds: [u10] });
    const other = await createPlayer(a.ctx, { fullName: "Bayu", birthDate: "2013-03-14", teamIds: [u12] });
    const coach = await coachOf(a, u10);
    const rival = await coachOf(a, u10, "Pelatih Lain");
    const head = await staffOf(a, ["head_coach"], "Kepala");

    const id = await createEvaluation(coach, mine, input);
    await expect(createEvaluation(coach, other, input)).rejects.toMatchObject({ status: 404 });
    await expect(listEvaluations(coach, other)).rejects.toMatchObject({ status: 404 });
    await expect(updateEvaluation(rival, id, input)).rejects.toMatchObject({ status: 403 });
    await updateEvaluation(head, id, { ...input, attitude: 2 });
    expect((await listEvaluations(coach, mine))[0]).toMatchObject({ attitude: 2, canEdit: true });
    await createEvaluation(head, other, input);
  });

  it("bendahara dan admin tidak punya akses; isolasi antar-akademi", async () => {
    const a = await academyOf("Garuda");
    const b = await academyOf("Elang");
    const team = await createTeam(a.ctx, { name: "U-10", ageMin: null, ageMax: null });
    const pid = await createPlayer(a.ctx, { fullName: "Raka", birthDate: "2015-03-14", teamIds: [team] });
    const treasurer = await staffOf(a, ["treasurer"], "Bendahara");
    await expect(createEvaluation(treasurer, pid, input)).rejects.toMatchObject({ status: 403 });
    await expect(listEvaluations(treasurer, pid)).rejects.toMatchObject({ status: 403 });
    await expect(createEvaluation(b.ctx, pid, input)).rejects.toMatchObject({ status: 404 });
  });
});
