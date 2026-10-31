import { withContext } from "@saturoom/core/db";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import {
  createAssessment,
  createDefaultTemplate,
  createGoal,
  createTemplate,
  listAssessments,
  listTemplates,
  publishTemplate,
  sendAssessment,
  setGoalStatus,
  updateTemplate,
} from "@/server/assessments";
import { acceptPlayerInvitation, invitePlayerAccount, myPlayerInvitations, playerHome } from "@/server/player-account";
import { createPlayer } from "@/server/players";
import { teamCoaches } from "@/server/schema";
import { createTeam } from "@/server/teams";
import { academyOf, staffOf, userWithSession } from "./helpers";

const metrics = [
  { key: "sprint", label: "Lari 20 m", type: "number" as const, unit: "detik", better: "lower" as const },
  { key: "passing", label: "Mengoper", type: "rating" as const, better: "higher" as const },
];

describe("template penilaian berversi", () => {
  it("mengubah versi terbit membuat draf versi baru; hasil lama tetap memakai versinya", async () => {
    const a = await academyOf("Garuda Nilai");
    const v1 = await createTemplate(a.ctx, { name: "Semester", metrics });
    await publishTemplate(a.ctx, v1);
    const team = await createTeam(a.ctx, { name: "U-10", ageMin: null, ageMax: null });
    const pid = await createPlayer(a.ctx, { fullName: "Raka", birthDate: "2015-03-14", teamIds: [team] });
    await createAssessment(a.ctx, pid, { templateId: v1, assessedOn: "2026-03-01", values: { sprint: 4.2, passing: 3 }, send: true });

    const v2 = await updateTemplate(a.ctx, v1, { name: "Semester", metrics: [...metrics, { key: "jump", label: "Lompat", type: "number", unit: "cm", better: "higher" }] });
    expect(v2).not.toBe(v1);
    await expect(createAssessment(a.ctx, pid, { templateId: v2, assessedOn: "2026-06-01", values: { sprint: 4 } })).rejects.toMatchObject({ status: 422 });
    await publishTemplate(a.ctx, v2);
    const [fam] = await listTemplates(a.ctx);
    expect(fam).toMatchObject({ versions: 2, published: { id: v2, version: 2 }, draft: null });
    await expect(createAssessment(a.ctx, pid, { templateId: v1, assessedOn: "2026-06-01", values: { sprint: 4 } })).rejects.toMatchObject({ status: 422 });

    await expect(createAssessment(a.ctx, pid, { templateId: v2, assessedOn: "2026-06-01", values: { passing: 7 } })).rejects.toMatchObject({ status: 422, fields: { passing: expect.any(String) } });
    const second = await createAssessment(a.ctx, pid, { templateId: v2, assessedOn: "2026-06-01", values: { sprint: 3.9, passing: 4, jump: 30 } });
    await sendAssessment(a.ctx, second);
    const rows = await listAssessments(a.ctx, pid);
    expect(rows.map((r) => r.version)).toEqual([2, 1]);

    // Akun pemain: perkembangan lintas versi dan target yang dibagikan saja.
    const user = await userWithSession("Raka");
    await invitePlayerAccount(a.ctx, pid, user.email);
    const [invite] = await myPlayerInvitations(user.userId);
    await acceptPlayerInvitation(user, invite!.id, "Ibu Sari");
    await createGoal(a.ctx, pid, { title: "Juggling 50 kali", shared: true });
    const hidden = await createGoal(a.ctx, pid, { title: "Catatan staf", shared: false });
    await setGoalStatus(a.ctx, hidden, "achieved");
    const home = (await playerHome(user))!;
    const sprint = home.assessments!.progress.find((p) => p.key === "sprint")!;
    expect(sprint).toMatchObject({ previous: 4.2, latest: 3.9, trend: "improved" });
    expect(home.assessments!.goals.map((g) => g.title)).toEqual(["Juggling 50 kali"]);
  });

  it("template bawaan sesuai cabang, hanya kepala pelatih/pemilik yang mengelola, terisolasi antar akademi", async () => {
    const a = await academyOf("Garuda Bawaan");
    const b = await academyOf("Elang Bawaan");
    const id = await createDefaultTemplate(a.ctx);
    expect((await listTemplates(a.ctx))[0]!.published!.id).toBe(id);
    expect(await listTemplates(b.ctx)).toEqual([]);
    const coach = await staffOf(a, ["coach"], "Pelatih");
    await expect(createTemplate(coach, { name: "Coba", metrics })).rejects.toMatchObject({ status: 403 });

    // Pelatih hanya menilai pemain timnya.
    const t1 = await createTeam(a.ctx, { name: "U-10", ageMin: null, ageMax: null });
    const t2 = await createTeam(a.ctx, { name: "U-12", ageMin: null, ageMax: null });
    const mine = await createPlayer(a.ctx, { fullName: "Raka", birthDate: "2015-03-14", teamIds: [t1] });
    const other = await createPlayer(a.ctx, { fullName: "Bayu", birthDate: "2013-03-14", teamIds: [t2] });
    await withContext(db(), { userId: a.ctx.userId, businessId: a.id }, (tx) =>
      tx.insert(teamCoaches).values({ businessId: a.id, teamId: t1, membershipId: coach.membershipId }),
    );
    await createAssessment(coach, mine, { templateId: id, assessedOn: "2026-06-01", values: { passing: 3 } });
    await expect(createAssessment(coach, other, { templateId: id, assessedOn: "2026-06-01", values: { passing: 3 } })).rejects.toMatchObject({ status: 404 });
    await expect(createAssessment(b.ctx, mine, { templateId: id, assessedOn: "2026-06-01", values: { passing: 3 } })).rejects.toMatchObject({ status: 404 });
  });
});
