import { describe, expect, it } from "vitest";
import { getProfile, saveProfile } from "@/server/business-profile";
import { createCatalog, setItemAvailability, updateItem } from "@/server/catalog";
import { getFnbBusinessCode } from "@/server/business";
import { publicMenu } from "@/server/public-menu";
import { businessOf, staffOf } from "./helpers";

const rejects = (p: Promise<unknown>, code: string) =>
  expect(p).rejects.toSatisfy((e: unknown) => (e as { code?: string }).code === code || (e as Error).message === code);

describe("menu digital publik", () => {
  it("menampilkan menu yang boleh tampil, mengikuti perubahan, dan menutup bila dimatikan", async () => {
    const biz = await businessOf(`Kafe QR ${Math.random()}`);
    const code = await getFnbBusinessCode(biz.ctx);
    const { id: drinks } = await createCatalog(biz.ctx, { type: "category", name: "Minuman" });
    const { id: empty } = await createCatalog(biz.ctx, { type: "category", name: "Kosong" });
    const { id: tea } = await createCatalog(biz.ctx, { type: "item", name: "Es teh", categoryId: drinks, stationId: null, price: 8000 });
    const { id: hidden } = await createCatalog(biz.ctx, { type: "item", name: "Rahasia", categoryId: drinks, stationId: null, price: 1000, showInPos: false });
    void empty; void hidden;

    let menu = (await publicMenu(code))!;
    expect(menu.business.name).toContain("Kafe QR");
    expect(menu.categories.map((c) => c.name)).toEqual(["Minuman"]); // kategori tanpa menu tersembunyi
    expect(menu.categories[0]!.items.map((i) => i.name)).toEqual(["Es teh"]);
    expect(menu.categories[0]!.items[0]).toMatchObject({ price: 8000, available: true });
    expect(await publicMenu(`${code.slice(0, 4)}-${code.slice(4)}`.toLowerCase())).not.toBeNull(); // dengan tanda hubung dan huruf kecil

    // Perubahan harga dan ketersediaan langsung terlihat pada pembacaan berikutnya.
    await updateItem(biz.ctx, tea, { name: "Es teh", categoryId: drinks, stationId: null, price: 9500 });
    await setItemAvailability(biz.ctx, tea, false);
    menu = (await publicMenu(code))!;
    expect(menu.categories[0]!.items[0]).toMatchObject({ price: 9500, available: false });

    await saveProfile(biz.ctx, { logoUrl: null, address: "Jl. Mawar 1", city: "Bandung Barat", publicMenuEnabled: true });
    expect((await publicMenu(code))!.business).toMatchObject({ address: "Jl. Mawar 1", city: "Bandung Barat" });
    await saveProfile(biz.ctx, { logoUrl: null, address: null, city: null, publicMenuEnabled: false });
    expect(await publicMenu(code)).toBeNull();
  });

  it("kode asing atau salah bentuk ditolak, dan data bisnis lain tidak ikut", async () => {
    const a = await businessOf(`Kafe A ${Math.random()}`);
    const b = await businessOf(`Kafe B ${Math.random()}`);
    const { id: ca } = await createCatalog(a.ctx, { type: "category", name: "Menu A" });
    await createCatalog(a.ctx, { type: "item", name: "Nasi A", categoryId: ca, stationId: null, price: 1000 });
    const menuB = (await publicMenu(await getFnbBusinessCode(b.ctx)))!;
    expect(menuB.categories).toHaveLength(0);
    expect(JSON.stringify(menuB)).not.toContain("Nasi A");
    expect(await publicMenu("ZZZZZZZZ")).toBeNull();
    expect(await publicMenu("'; DROP TABLE x;--")).toBeNull();
    expect(await publicMenu("")).toBeNull();
  });

  it("profil: hanya yang berizin mengubah, logo harus dari Cloudinary milik bisnis", async () => {
    const biz = await businessOf(`Kafe Profil ${Math.random()}`);
    await rejects(saveProfile(await staffOf(biz, ["cashier"]), { logoUrl: null, address: null, city: null, publicMenuEnabled: true }), "forbidden");
    await rejects(saveProfile(biz.ctx, { logoUrl: "https://contoh.com/a.png", address: null, city: null, publicMenuEnabled: true }), "invalid_image");
    expect(await getProfile(await staffOf(biz, ["cashier"]))).toMatchObject({ logoUrl: null, publicMenuEnabled: true }); // anggota boleh membaca
  });
});
