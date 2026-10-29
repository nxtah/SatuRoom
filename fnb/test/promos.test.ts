import { describe, expect, it } from "vitest";
import { createOrder, updateOrderStatus } from "@/server/orders";
import { archiveCustomer, checkVoucher, createCustomer, createVoucher, listCustomers, listVouchers, setVoucherActive } from "@/server/promos";
import { businessOf, menuItemOf, staffOf } from "./helpers";

const rejects = (p: Promise<unknown>, code: string) => expect(p).rejects.toSatisfy((e: unknown) => (e as { code?: string }).code === code);
const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
const order = (ctx: Parameters<typeof createOrder>[0], menuItemId: string, extra: Record<string, unknown> = {}, quantity = 2) =>
  createOrder(ctx, { type: "takeaway", lines: [{ menuItemId, quantity }], ...extra });

describe("pelanggan", () => {
  it("nomor telepon unik, riwayat belanja terhubung ke pesanan, tersaring per bisnis", async () => {
    const a = await businessOf(`Kafe Pel ${Math.random()}`), b = await businessOf(`Kafe Pel B ${Math.random()}`);
    const item = await menuItemOf(a.ctx, "Mie", 10000);
    const { id } = await createCustomer(a.ctx, { name: "Sari", phone: "081234567890" });
    await rejects(createCustomer(a.ctx, { name: "Sari 2", phone: "081234567890" }), "phone_exists");
    expect((await createCustomer(b.ctx, { name: "Sari B", phone: "081234567890" })).id).toBeTruthy();
    const o = await order(a.ctx, item, { customerId: id });
    const [c] = await listCustomers(a.ctx);
    expect(c).toMatchObject({ name: "Sari", orders: 1, spent: o.total });
    expect(await listCustomers(a.ctx, "0812")).toHaveLength(1);
    expect(await listCustomers(a.ctx, "zzz")).toHaveLength(0);
    await rejects(order(b.ctx, await menuItemOf(b.ctx), { customerId: id }), "not_found");
    await archiveCustomer(a.ctx, id);
    expect(await listCustomers(a.ctx)).toHaveLength(0);
  });
});

describe("voucher", () => {
  it("diskon persen dan nominal diterapkan di server, kuota habis dan batal mengembalikan kuota", async () => {
    const biz = await businessOf(`Kafe Voucher ${Math.random()}`);
    const item = await menuItemOf(biz.ctx, "Mie", 10000);
    const cashier = await staffOf(biz, ["cashier"]);
    await rejects(createVoucher(cashier, { code: "HEMAT", kind: "percent", value: 10, minSpend: 0 }), "forbidden");
    await createVoucher(biz.ctx, { code: "hemat10", kind: "percent", value: 10, minSpend: 15000, maxUses: 1 });
    await rejects(createVoucher(biz.ctx, { code: "HEMAT10", kind: "amount", value: 5000, minSpend: 0 }), "code_exists");
    await rejects(order(cashier, item, { voucherCode: "NGAWUR" }), "voucher_invalid");
    await rejects(order(cashier, item, { voucherCode: "HEMAT10" }, 1), "voucher_min");
    const used = await order(cashier, item, { voucherCode: "hemat10" });
    expect(used.total).toBe(18000);
    expect((await listVouchers(biz.ctx))[0]).toMatchObject({ usedCount: 1 });
    await rejects(order(cashier, item, { voucherCode: "HEMAT10" }), "voucher_used_up");
    await updateOrderStatus(biz.ctx, used.id, "cancelled", "Salah pesan");
    expect((await listVouchers(biz.ctx))[0]).toMatchObject({ usedCount: 0 });
    expect((await order(cashier, item, { voucherCode: "HEMAT10" })).total).toBe(18000);
  });

  it("tidak bisa digabung dengan diskon manual; nonaktif dan kedaluwarsa ditolak; pratinjau tidak memakai kuota", async () => {
    const biz = await businessOf(`Kafe Voucher2 ${Math.random()}`);
    const item = await menuItemOf(biz.ctx, "Mie", 10000);
    const v = await createVoucher(biz.ctx, { code: "POTONG5", kind: "amount", value: 5000, minSpend: 0, maxUses: 3 });
    await rejects(order(biz.ctx, item, { voucherCode: "POTONG5", discountType: "percent", discountValue: 5, discountReason: "Tes" }), "voucher_conflict");
    expect(await checkVoucher(biz.ctx, "potong5", 20000)).toMatchObject({ discount: 5000 });
    expect((await listVouchers(biz.ctx))[0]).toMatchObject({ usedCount: 0 });
    await setVoucherActive(biz.ctx, v.id, false);
    await rejects(order(biz.ctx, item, { voucherCode: "POTONG5" }), "voucher_invalid");
    await createVoucher(biz.ctx, { code: "LAMA", kind: "amount", value: 1000, minSpend: 0, startsOn: "2020-01-01", endsOn: "2020-12-31" });
    await rejects(order(biz.ctx, item, { voucherCode: "LAMA" }), "voucher_expired");
    await createVoucher(biz.ctx, { code: "NANTI", kind: "amount", value: 1000, minSpend: 0, startsOn: "2999-01-01" });
    await rejects(order(biz.ctx, item, { voucherCode: "NANTI" }), "voucher_expired");
    void today;
  });
});
