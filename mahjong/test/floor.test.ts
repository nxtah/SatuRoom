import { describe, expect, it } from "vitest";
import { withContext } from "@saturoom/core/db";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import { createMenuItem } from "@/server/menu";
import { getMember, topUp } from "@/server/members";
import { addOrder, closeSession, getSession, openSession, patchSession, setOrderStatus, voidSession } from "@/server/sessions";
import { floorBoard } from "@/server/tables";
import { memberOf, staffOf, venueOf } from "./helpers";

const back = (ctx: { userId: string; businessId: string }, id: string, minutes: number) =>
  withContext(db(), ctx, (tx) => tx.execute(sql`UPDATE mahjong.play_sessions SET started_at = now() - make_interval(mins => ${minutes}) WHERE id = ${id}::uuid`));

describe("lantai dan sesi meja", () => {
  it("membuka meja, memesan, menutup dengan pembayaran, dan menolak meja ganda", async () => {
    const v = await venueOf("Naga Jade");
    const table = v.tables[0]!;
    const id = await openSession(v.ctx, { tableId: table.id, players: 4, guestName: "Rombongan Koh Ahong" });
    await expect(openSession(v.ctx, { tableId: table.id, players: 2 })).rejects.toMatchObject({ status: 409, code: "in_use" });
    expect((await floorBoard(v.ctx)).tables.find((t) => t.id === table.id)?.status).toBe("playing");

    const teh = await createMenuItem(v.ctx, { name: "Teh tarik", category: "drink", price: 15_000, stock: 2, isAvailable: true });
    await addOrder(v.ctx, id, { menuItemId: teh, qty: 2 });
    await expect(addOrder(v.ctx, id, { menuItemId: teh, qty: 1 })).rejects.toMatchObject({ code: "stock" });

    await back(v.ctx, id, 95);
    const live = await getSession(v.ctx, id);
    expect(live.bill).toMatchObject({ billableMin: 120, timeCharge: 80_000, fnb: 30_000, total: 110_000 });
    await expect(closeSession(v.ctx, id, { payments: [{ method: "cash", amount: 100_000 }] })).rejects.toMatchObject({ code: "payment_mismatch" });
    const done = await closeSession(v.ctx, id, { payments: [{ method: "cash", amount: 60_000 }, { method: "qris", amount: 50_000 }] });
    expect(done.bill.total).toBe(110_000);
    await expect(closeSession(v.ctx, id, { payments: [] })).rejects.toMatchObject({ code: "closed" });
    const closed = await getSession(v.ctx, id);
    expect(closed.status).toBe("closed");
    expect(closed.payments).toHaveLength(2);
    expect((await floorBoard(v.ctx)).tables.find((t) => t.id === table.id)?.status).toBe("free");
  });

  it("member gold dapat diskon dan membayar dengan saldo; saldo tidak boleh minus", async () => {
    const v = await venueOf("Naga Jade");
    const gold = await memberOf(v.ctx, "Mei Ling", "gold");
    const id = await openSession(v.ctx, { tableId: v.tables[0]!.id, players: 4, memberId: gold });
    await back(v.ctx, id, 59);
    // 60 menit x 40.000 = 40.000, diskon gold 10% = 4.000
    await expect(closeSession(v.ctx, id, { payments: [{ method: "balance", amount: 36_000 }] })).rejects.toMatchObject({ code: "insufficient_balance" });
    await topUp(v.ctx, gold, { amount: 100_000, method: "cash", note: null });
    const done = await closeSession(v.ctx, id, { payments: [{ method: "balance", amount: 36_000 }] });
    expect(done.bill).toMatchObject({ timeCharge: 40_000, discount: 4_000, total: 36_000 });
    const m = await getMember(v.ctx, gold);
    expect(m.balance).toBe(64_000);
    expect(m.visits).toBe(1);
    expect(m.ledger.map((l) => l.kind).sort()).toEqual(["spend", "topup"]);
  });

  it("tamu tidak bisa membayar dengan saldo", async () => {
    const v = await venueOf("Naga Jade");
    const id = await openSession(v.ctx, { tableId: v.tables[0]!.id, players: 4 });
    await back(v.ctx, id, 59);
    await expect(closeSession(v.ctx, id, { payments: [{ method: "balance", amount: 40_000 }] })).rejects.toMatchObject({ status: 422 });
  });

  it("membatalkan pesanan mengembalikan stok; batal sesi mengembalikan semuanya", async () => {
    const v = await venueOf("Naga Jade");
    const id = await openSession(v.ctx, { tableId: v.tables[0]!.id, players: 4 });
    const item = await createMenuItem(v.ctx, { name: "Kacang", category: "snack", price: 10_000, stock: 5, isAvailable: true });
    await addOrder(v.ctx, id, { menuItemId: item, qty: 3 });
    const order = (await getSession(v.ctx, id)).orders[0]!;
    await setOrderStatus(v.ctx, id, order.id, "void");
    expect((await getSession(v.ctx, id)).bill.fnb).toBe(0);
    await addOrder(v.ctx, id, { menuItemId: item, qty: 5 });
    await voidSession(v.ctx, id);
    expect((await floorBoard(v.ctx)).tables.find((t) => t.id === v.tables[0]!.id)?.status).toBe("free");
    const id2 = await openSession(v.ctx, { tableId: v.tables[0]!.id, players: 4 });
    await addOrder(v.ctx, id2, { menuItemId: item, qty: 5 });
  });

  it("memindahkan sesi ke meja kosong mengubah tarif; meja terpakai ditolak", async () => {
    const v = await venueOf("Naga Jade");
    const [a, b, , vip] = v.tables;
    const s1 = await openSession(v.ctx, { tableId: a!.id, players: 4 });
    await openSession(v.ctx, { tableId: b!.id, players: 4 });
    await expect(patchSession(v.ctx, s1, { moveToTableId: b!.id })).rejects.toMatchObject({ code: "in_use" });
    await patchSession(v.ctx, s1, { moveToTableId: vip!.id });
    const s = await getSession(v.ctx, s1);
    expect(s).toMatchObject({ tableName: "VIP", rate: 75_000 });
  });

  it("izin per peran: pelayan hanya memesan, wasit tidak membuka meja, host tidak mengelola menu", async () => {
    const v = await venueOf("Naga Jade");
    const server = await staffOf(v, ["server"]);
    const referee = await staffOf(v, ["referee"]);
    const host = await staffOf(v, ["host"]);
    const id = await openSession(host, { tableId: v.tables[0]!.id, players: 4 });
    await expect(openSession(server, { tableId: v.tables[1]!.id, players: 4 })).rejects.toMatchObject({ status: 403 });
    await expect(openSession(referee, { tableId: v.tables[1]!.id, players: 4 })).rejects.toMatchObject({ status: 403 });
    await expect(createMenuItem(host, { name: "X", category: "drink", price: 1000, isAvailable: true })).rejects.toMatchObject({ status: 403 });
    const item = await createMenuItem(v.ctx, { name: "Es teh", category: "drink", price: 8_000, isAvailable: true });
    await addOrder(server, id, { menuItemId: item, qty: 1 });
    await expect(closeSession(server, id, { payments: [] })).rejects.toMatchObject({ status: 403 });
    // Host hanya boleh membatalkan 10 menit pertama.
    await back(v.ctx, id, 30);
    await expect(voidSession(host, id)).rejects.toMatchObject({ status: 403 });
    await voidSession(v.ctx, id);
  });

  it("tempat lain tidak bisa melihat atau memakai meja ini", async () => {
    const a = await venueOf("Rumah A");
    const b = await venueOf("Rumah B");
    const id = await openSession(a.ctx, { tableId: a.tables[0]!.id, players: 4 });
    await expect(getSession(b.ctx, id)).rejects.toMatchObject({ status: 404 });
    await expect(openSession(b.ctx, { tableId: a.tables[1]!.id, players: 4 })).rejects.toMatchObject({ status: 404 });
  });
});
