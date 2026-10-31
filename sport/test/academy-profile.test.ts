import { describe, expect, it } from "vitest";
import { getAcademy, setAcademyLogo, updateAcademy } from "@/server/academy";
import { signUpload } from "@/server/cloudinary";
import { inviteStaff, acceptInvitation, myInvitations } from "@/server/staff";
import { loadAcademyContext } from "@/server/context";
import { academyOf, refresh, userWithSession } from "./helpers";

const url = (businessId: string) => `https://res.cloudinary.com/tes-cloud/image/upload/v1/sport/${businessId}/logo/abc.png`;

describe("profil akademi dan logo", () => {
  it("pemilik memasang logo dan alamat; logo dari akademi lain atau situs lain ditolak", async () => {
    const a = await academyOf("Garuda Profil");
    const b = await academyOf("Elang Profil");

    const sign = signUpload(a.ctx, "logo");
    expect(sign.folder).toBe(`sport/${a.id}/logo`);
    expect(sign.signature).toMatch(/^[0-9a-f]{40}$/);

    await setAcademyLogo(a.ctx, url(a.id));
    await updateAcademy(a.ctx, { name: "Garuda Profil", city: "Bandung", sport: "football", address: "Jl. Merdeka 12" });
    const prof = await getAcademy(a.ctx);
    expect(prof).toMatchObject({ logoUrl: url(a.id), address: "Jl. Merdeka 12", city: "Bandung" });

    await expect(setAcademyLogo(a.ctx, url(b.id))).rejects.toMatchObject({ status: 422 });
    await expect(setAcademyLogo(a.ctx, "https://contoh.id/logo.png")).rejects.toMatchObject({ status: 422 });
    expect((await getAcademy(b.ctx)).logoUrl).toBeNull();

    // Alamat tidak dikirim berarti tidak berubah; logo bisa dihapus.
    await updateAcademy(a.ctx, { name: "Garuda Profil", city: "Bandung", sport: "football" });
    await setAcademyLogo(a.ctx, null);
    expect(await getAcademy(a.ctx)).toMatchObject({ logoUrl: null, address: "Jl. Merdeka 12" });
  });

  it("pelatih tidak bisa mengunggah atau mengganti logo", async () => {
    const a = await academyOf("Garuda Pelatih");
    const coach = await userWithSession("Coach Logo");
    await inviteStaff(a.ctx, { email: coach.email, roles: ["coach"], teamIds: [] });
    const [inv] = await myInvitations(coach.userId);
    await acceptInvitation(coach, inv!.id);
    const ctx = await loadAcademyContext(await refresh(coach));
    expect(() => signUpload(ctx, "logo")).toThrow();
    await expect(setAcademyLogo(ctx, url(a.id))).rejects.toMatchObject({ status: 403 });
  });
});
