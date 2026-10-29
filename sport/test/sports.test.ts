import { describe, expect, it } from "vitest";
import { createAcademy, getAcademy, updateAcademy } from "@/server/academy";
import { loadAcademyContext } from "@/server/context";
import { createPlayer, getPlayer } from "@/server/players";
import { createTeam } from "@/server/teams";
import { academyOf, refresh, userWithSession } from "./helpers";

describe("cabang olahraga", () => {
  it("akademi baru berisi sepak bola bila cabang tidak dipilih, dan bisa memilih cabang lain", async () => {
    const a = await academyOf("Bawaan");
    expect(a.ctx.sport).toBe("football");
    const owner = await userWithSession("Pemilik Basket");
    await createAcademy(owner, { name: "Basket Muda", city: "Medan", sport: "basketball" });
    const ctx = await loadAcademyContext(await refresh(owner));
    expect(ctx.sport).toBe("basketball");
    expect(await getAcademy(ctx)).toMatchObject({ sport: "basketball", sportLocked: false });
  });

  it("posisi pemain harus sesuai cabang akademi", async () => {
    const owner = await userWithSession("Pemilik Basket");
    await createAcademy(owner, { name: "Basket Muda", city: "Medan", sport: "basketball" });
    const ctx = await loadAcademyContext(await refresh(owner));
    const team = await createTeam(ctx, { name: "U-14", ageMin: 12, ageMax: 14 });
    const kid = { fullName: "Dimas", birthDate: "2013-05-01", teamIds: [team] };
    await expect(createPlayer(ctx, { ...kid, position: "kiper" })).rejects.toMatchObject({ status: 422 });
    const id = await createPlayer(ctx, { ...kid, position: "point_guard" });
    expect((await getPlayer(ctx, id)).position).toBe("point_guard");
  });

  it("cabang bisa diganti selama belum ada pemain, lalu terkunci", async () => {
    const owner = await userWithSession("Pemilik Voli");
    await createAcademy(owner, { name: "Voli Muda", city: "Solo", sport: "volleyball" });
    const ctx = await loadAcademyContext(await refresh(owner));
    await updateAcademy(ctx, { name: "Voli Muda", city: "Solo", sport: "tennis" });
    expect((await getAcademy(ctx)).sport).toBe("tennis");
    const ctx2 = await loadAcademyContext(await refresh(owner));
    const team = await createTeam(ctx2, { name: "Pemula", ageMin: null, ageMax: null });
    await createPlayer(ctx2, { fullName: "Rani", birthDate: "2014-01-01", teamIds: [team] });
    expect((await getAcademy(ctx2)).sportLocked).toBe(true);
    await expect(updateAcademy(ctx2, { name: "Voli Muda", city: "Solo", sport: "swimming" })).rejects.toMatchObject({ code: "sport_locked" });
    await expect(updateAcademy(ctx2, { name: "Nama Baru", city: "Solo", sport: "tennis" })).resolves.toBeUndefined();
  });
});
