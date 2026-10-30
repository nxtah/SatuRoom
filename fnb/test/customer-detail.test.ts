import { describe, expect, it } from "vitest";
import { createOrder, updateOrderStatus } from "@/server/orders";
import { createCustomer, getCustomer, listCustomers } from "@/server/promos";
import { businessOf, menuItemOf, staffOf } from "./helpers";

const rejects = (p: Promise<unknown>, code: string) =>
  expect(p).rejects.toSatisfy((e: unknown) => (e as { code?: string }).code === code || (e as Error).message === code);

describe("detail pelanggan", () => {
  it("menghitung belanja, favorit, transaksi terakhir, dan urutan daftar", async () => {
    const biz = await businessOf(`Kafe Pelanggan ${Math.random()}`);
    const item = await menuItemOf(biz.ctx, "Nasi", 20000);
    const a = await createCustomer(biz.ctx, { name: "Ani", phone: "081200000001", notes: "Alergi kacang" });
    const b = await createCustomer(biz.ctx, { name: "Budi", phone: "081200000002", notes: null });
    for (const qty of [1, 2]) await createOrder(biz.ctx, { type: "takeaway", customerId: a.id, lines: [{ menuItemId: item, quantity: qty }] });
    const gone = await createOrder(biz.ctx, { type: "takeaway", customerId: a.id, lines: [{ menuItemId: item, quantity: 5 }] });
    await updateOrderStatus(biz.ctx, gone.id, "cancelled", "Batal");
    await createOrder(biz.ctx, { type: "takeaway", customerId: b.id, lines: [{ menuItemId: item, quantity: 1 }] });

    const d = await getCustomer(biz.ctx, a.id);
    expect(d).toMatchObject({ name: "Ani", orders: 2, spent: 60000, avgTicket: 30000, notes: "Alergi kacang" });
    expect(d.favorites).toEqual([{ name: "Nasi", quantity: 3 }]);
    expect(d.recent).toHaveLength(3);
    expect((await listCustomers(biz.ctx, undefined, "belanja")).map((c) => c.name)).toEqual(["Ani", "Budi"]);
    expect((await listCustomers(biz.ctx, undefined, "tidak-ada")).map((c) => c.name)).toEqual(["Ani", "Budi"]);

    const other = await businessOf(`Kafe Lain ${Math.random()}`);
    await rejects(getCustomer(other.ctx, a.id), "not_found");
    await rejects(getCustomer(await staffOf(biz, ["kitchen"]), a.id), "forbidden");
  });
});
