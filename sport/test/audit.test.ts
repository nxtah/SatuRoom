import { describe, expect, it } from "vitest";
import { listAudit } from "@/server/audit";
import { createCustomRole } from "@/server/roles";
import { academyOf, staffOf } from "./helpers";

describe("jejak aktivitas", () => {
  it("hanya menampilkan akademi sendiri, bisa disaring, dan butuh izin", async () => {
    const a = await academyOf("Garuda Jejak");
    const b = await academyOf("Elang Jejak");
    await createCustomRole(a.ctx, { name: "Pencatat", permissions: ["billing.read"] });

    const all = await listAudit(a.ctx);
    expect(all.map((r) => r.action)).toEqual(expect.arrayContaining(["academy.created", "role.created"]));
    expect(all[0]!.label).toBe("Peran dibuat");
    expect(all[0]!.actor).toContain("Pemilik");

    expect((await listAudit(a.ctx, "role")).map((r) => r.action)).toEqual(["role.created"]);
    expect((await listAudit(b.ctx)).map((r) => r.action)).toEqual(["academy.created"]);

    const coach = await staffOf(a, ["coach"], "Coach Jejak");
    await expect(listAudit(coach)).rejects.toMatchObject({ status: 403 });
    const admin = await staffOf(a, ["admin"], "Admin Jejak");
    expect((await listAudit(admin)).length).toBeGreaterThan(0);
  });
});
