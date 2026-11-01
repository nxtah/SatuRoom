import { describe, expect, it } from "vitest";
import { createPurchase, createSupplier, listItems, payOrder, placeOrder, receivePurchase, saveItem } from "@/server/inventory";
import { getRun, listPayProfiles, prepareRun, setPayProfile } from "@/server/payroll";
import { createSession, setSessionPlan } from "@/server/schedule";
import { attendanceBoard, canMonitorAttendance, clockIn, clockOut, setMonitor } from "@/server/staff-attendance";
import { createTeam } from "@/server/teams";
import { academyOf, staffOf } from "./helpers";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

describe("toko lengkap", () => {
  it("varian dengan stok sendiri, tambahan harga, isian nomor punggung", async () => {
    const a = await academyOf("Varian FC");
    const id = await saveItem(a.ctx, null, {
      name: "Jersey home", forSale: true, salePrice: 150_000, category: "Jersey",
      customFields: [{ label: "Nomor punggung", required: true, kind: "number", max: 3 }],
      variants: [{ label: "M", qty: 0 }, { label: "XXL", qty: 0, extraPrice: 10_000 }],
    });
    // Stok varian tidak boleh melebihi stok barang.
    const item0 = (await listItems(a.ctx)).find((i) => i.id === id)!;
    await expect(saveItem(a.ctx, id, { name: "Jersey home", forSale: true, salePrice: 150_000, variants: item0.variants.map((v) => ({ ...v, qty: 5 })) })).rejects.toMatchObject({ status: 422 });

    const sup = await createSupplier(a.ctx, { name: "Konveksi" });
    const [m, xxl] = item0.variants;
    const po = await createPurchase(a.ctx, { supplierId: sup, orderedOn: today(), lines: [{ itemId: id, variantId: m!.id, qty: 3, unitCost: 70_000 }, { itemId: id, variantId: xxl!.id, qty: 1, unitCost: 70_000 }] });
    await receivePurchase(a.ctx, po, today());
    const item = (await listItems(a.ctx)).find((i) => i.id === id)!;
    expect(item.qty).toBe(4);
    expect(item.variants.map((v) => v.qty)).toEqual([3, 1]);

    await expect(placeOrder(a.ctx, { buyerName: "Ortu", lines: [{ itemId: id, qty: 1 }] })).rejects.toMatchObject({ status: 422 });
    await expect(placeOrder(a.ctx, { buyerName: "Ortu", lines: [{ itemId: id, variantId: xxl!.id, qty: 1 }] })).rejects.toMatchObject({ status: 422 });
    await expect(placeOrder(a.ctx, { buyerName: "Ortu", lines: [{ itemId: id, variantId: xxl!.id, qty: 2, custom: { "Nomor punggung": "10" } }] })).rejects.toMatchObject({ status: 409 });
    const order = await placeOrder(a.ctx, { buyerName: "Ortu", lines: [{ itemId: id, variantId: xxl!.id, qty: 1, custom: { "Nomor punggung": "10" } }] });
    await payOrder(a.ctx, order, "cash", today());
    const after = (await listItems(a.ctx)).find((i) => i.id === id)!;
    expect(after.qty).toBe(3);
    expect(after.variants.find((v) => v.label === "XXL")!.qty).toBe(0);
  });
});

describe("absen kamera, pemantau, gaji dari absensi, rencana latihan", () => {
  it("lokasi tersimpan; kepala pelatih memantau setelah diizinkan; gaji harian dihitung", async () => {
    const a = await academyOf("Absen FC");
    const head = await staffOf(a, ["head_coach"], "Kepala Pelatih");
    const photo = (k: string) => `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/v1/sport/${a.ctx.businessId}/clock/${k}.jpg`;
    await expect(clockIn(head, { lat: -6.2, lng: 106.8 })).rejects.toMatchObject({ status: 422 });
    await clockIn(head, { photoUrl: photo("in"), lat: -6.2, lng: 106.8, accuracy: 15 });
    await clockOut(head, { photoUrl: photo("out") });
    const board = await attendanceBoard(a.ctx);
    const row = board.rows.find((r) => r.name === "Kepala Pelatih")!;
    expect(row.inLoc).toMatchObject({ lat: -6.2, lng: 106.8, accuracy: 15 });
    expect(row.inPhoto).toBe(photo("in"));

    expect(await canMonitorAttendance(head)).toBe(false);
    await expect(attendanceBoard(head)).rejects.toMatchObject({ status: 403 });
    await setMonitor(a.ctx, head.membershipId, true);
    expect((await attendanceBoard(head)).rows.length).toBeGreaterThan(0);
    await expect(setMonitor(head, head.membershipId, false)).rejects.toMatchObject({ status: 403 });

    const p = (await listPayProfiles(a.ctx)).find((x) => x.name === "Kepala Pelatih")!;
    await setPayProfile(a.ctx, p.membershipId, { payMode: "attendance", perDay: 100_000, perHour: 0, baseSalary: 5_000_000, perSession: 0, allowance: 0, overtimePerHour: 0, lateDeduction: 0, unpaidLeaveDeduction: 0 });
    await prepareRun(a.ctx, today().slice(0, 7));
    const slip = (await getRun(a.ctx, today().slice(0, 7)))!.slips.find((s) => s.staffName === "Kepala Pelatih")!;
    expect(slip.gross).toBe(100_000);

    const team = await createTeam(a.ctx, { name: "U-10", ageMin: null, ageMax: null });
    const s = await createSession(a.ctx, { teamId: team, date: today(), startTime: "16:00", durationMin: 90, kind: "training", topic: "Passing" });
    await setSessionPlan(a.ctx, s, "Passing pendek", "Rondo 4v1");
    const coach = await staffOf(a, ["coach"]);
    await expect(setSessionPlan(coach, s, "x", null)).rejects.toMatchObject({ status: 404 });
  });
});
