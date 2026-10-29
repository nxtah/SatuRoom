import { describe, expect, it } from "vitest";
import { createOrder, listOrders, updateOrderStatus } from "@/server/orders";
import { openShift, payOrder } from "@/server/payments";
import { updateSettings } from "@/server/settings";
import { archiveTable, createTable, listTables, mergeOrders, moveOrder, splitOrder, updateTable } from "@/server/tables";
import { businessOf, menuItemOf, staffOf } from "./helpers";

const rejects = (p: Promise<unknown>, code: string) => expect(p).rejects.toSatisfy((e: unknown) => (e as { code?: string }).code === code);
const sit = (biz: Awaited<ReturnType<typeof businessOf>>, tableId: string, menuItemId: string, quantity = 1) =>
  createOrder(biz.ctx, { type: "dine_in", tableId, lines: [{ menuItemId, quantity }] });

describe("meja", () => {
  it("CRUD meja butuh izin pengaturan, nama unik, dan meja terpakai tidak bisa diarsipkan", async () => {
    const biz = await businessOf(`Kafe Meja ${Math.random()}`);
    const item = await menuItemOf(biz.ctx, "Mie", 10000);
    const cashier = await staffOf(biz, ["cashier"]);
    await rejects(createTable(cashier, { name: "M1" }), "forbidden");
    const { id } = await createTable(biz.ctx, { name: "M1", capacity: 4 });
    await rejects(createTable(biz.ctx, { name: "m1" }), "table_exists");
    await updateTable(biz.ctx, id, { name: "Meja 1", capacity: 6 });
    const order = await sit(biz, id, item);
    expect((await listTables(biz.ctx))[0]).toMatchObject({ name: "Meja 1", capacity: 6, order: { id: order.id } });
    await rejects(sit(biz, id, item), "table_busy");
    await rejects(archiveTable(biz.ctx, id), "table_busy");
    await updateOrderStatus(biz.ctx, order.id, "cancelled", "Batal");
    await archiveTable(biz.ctx, id);
    expect(await listTables(biz.ctx)).toHaveLength(0);
  });

  it("pindah meja: meja tujuan harus kosong", async () => {
    const biz = await businessOf(`Kafe Pindah ${Math.random()}`);
    const item = await menuItemOf(biz.ctx, "Mie", 10000);
    const a = (await createTable(biz.ctx, { name: "A" })).id, b = (await createTable(biz.ctx, { name: "B" })).id, c = (await createTable(biz.ctx, { name: "C" })).id;
    const oa = await sit(biz, a, item), ob = await sit(biz, b, item);
    await rejects(moveOrder(biz.ctx, oa.id, b), "table_busy");
    await moveOrder(biz.ctx, oa.id, c);
    expect((await listOrders(biz.ctx)).find((o) => o.id === oa.id)!.tableName).toBe("C");
    expect((await listTables(biz.ctx)).find((t) => t.id === a)!.order).toBeNull();
    expect(ob.id).toBeTruthy();
  });

  it("gabung: baris dan total pindah ke pesanan tujuan, pesanan asal ditutup", async () => {
    const biz = await businessOf(`Kafe Gabung ${Math.random()}`);
    await updateSettings(biz.ctx, { taxPercent: 10, servicePercent: 0, receiptPrefix: "RSA", receiptHeader: null, receiptFooter: null });
    const item = await menuItemOf(biz.ctx, "Mie", 10000);
    const a = (await createTable(biz.ctx, { name: "A" })).id, b = (await createTable(biz.ctx, { name: "B" })).id;
    const oa = await sit(biz, a, item, 1), ob = await sit(biz, b, item, 2);
    await rejects(mergeOrders(biz.ctx, oa.id, oa.id), "same_order");
    expect(await mergeOrders(biz.ctx, oa.id, ob.id)).toEqual({ total: 33000 });
    const orders = await listOrders(biz.ctx, "all");
    const target = orders.find((o) => o.id === ob.id)!;
    expect(target).toMatchObject({ subtotal: 30000, tax: 3000, total: 33000 });
    expect(target.lines).toHaveLength(2);
    expect(orders.find((o) => o.id === oa.id)).toMatchObject({ status: "cancelled", total: 0 });
    await rejects(mergeOrders(biz.ctx, oa.id, ob.id), "not_active");
  });

  it("pisah tagihan: baris terpilih jadi pesanan baru dengan nomor struk sendiri; yang sudah dibayar ditolak", async () => {
    const biz = await businessOf(`Kafe Pisah ${Math.random()}`);
    const item = await menuItemOf(biz.ctx, "Mie", 10000);
    const t = (await createTable(biz.ctx, { name: "A" })).id;
    const o = await createOrder(biz.ctx, { type: "dine_in", tableId: t, lines: [{ menuItemId: item, quantity: 1 }, { menuItemId: item, quantity: 2 }] });
    const lines = (await listOrders(biz.ctx)).find((x) => x.id === o.id)!.lines;
    await rejects(splitOrder(biz.ctx, o.id, lines.map((l) => l.id)), "split_all");
    const part = await splitOrder(biz.ctx, o.id, [lines[1]!.id]);
    expect(part.receiptNo).not.toBe(o.receiptNo);
    expect(part.total).toBe(20000);
    const orders = await listOrders(biz.ctx);
    expect(orders.find((x) => x.id === o.id)!.total).toBe(10000);
    expect(orders.find((x) => x.id === part.id)!.lines).toHaveLength(1);
    await openShift(biz.ctx, { openingCash: 0 });
    await updateOrderStatus(biz.ctx, part.id, "preparing");
    await updateOrderStatus(biz.ctx, part.id, "ready");
    await payOrder(biz.ctx, { orderId: part.id, amount: 5000, method: "cash" });
    await rejects(mergeOrders(biz.ctx, part.id, o.id), "has_payments");
  });

  it("bisnis lain tidak bisa memindah atau menggabung", async () => {
    const a = await businessOf(`Kafe A ${Math.random()}`), b = await businessOf(`Kafe B ${Math.random()}`);
    const t = (await createTable(a.ctx, { name: "A" })).id;
    const o = await sit(a, t, await menuItemOf(a.ctx));
    const tb = (await createTable(b.ctx, { name: "X" })).id;
    await rejects(moveOrder(b.ctx, o.id, tb), "not_found");
  });
});
