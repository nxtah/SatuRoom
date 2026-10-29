import { describe, expect, it } from "vitest";
import { archiveLocation, createLocation, listLocations } from "@/server/locations";
import { createSession } from "@/server/schedule";
import { createTeam } from "@/server/teams";
import { academyOf, staffOf } from "./helpers";

const tomorrow = new Date(Date.now() + 86_400_000).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

describe("lokasi", () => {
  it("menambah, menolak nama kembar, dan mengarsipkan lokasi", async () => {
    const a = await academyOf("Garuda");
    const id = await createLocation(a.ctx, { name: "Lapangan B", address: null });
    await expect(createLocation(a.ctx, { name: "lapangan b" })).rejects.toMatchObject({ status: 409 });
    expect((await listLocations(a.ctx)).map((l) => l.name)).toContain("Lapangan B");
    await archiveLocation(a.ctx, id);
    expect((await listLocations(a.ctx)).map((l) => l.name)).not.toContain("Lapangan B");
    const primary = (await listLocations(a.ctx)).find((l) => l.isPrimary)!;
    await expect(archiveLocation(a.ctx, primary.id)).rejects.toMatchObject({ status: 409 });
  });

  it("jadwal bentrok di lokasi sama ditolak, lokasi berbeda boleh", async () => {
    const a = await academyOf("Garuda");
    const t1 = await createTeam(a.ctx, { name: "KU 10", ageMin: null, ageMax: null });
    const t2 = await createTeam(a.ctx, { name: "KU 12", ageMin: null, ageMax: null });
    const second = await createLocation(a.ctx, { name: "Lapangan B" });
    const s = (teamId: string, locationId?: string) => ({ teamId, date: tomorrow, startTime: "16:00", durationMin: 90, kind: "training" as const, locationId });
    await createSession(a.ctx, s(t1));
    await expect(createSession(a.ctx, s(t2))).rejects.toMatchObject({ status: 409, code: "clash" });
    await expect(createSession(a.ctx, s(t2, second))).resolves.toBeTruthy();
  });

  it("pelatih tidak boleh mengelola lokasi", async () => {
    const a = await academyOf("Garuda");
    const coach = await staffOf(a, ["coach"], "Coach Tomi");
    await expect(createLocation(coach, { name: "Liar" })).rejects.toMatchObject({ status: 403 });
  });
});
