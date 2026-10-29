import { describe, expect, it } from "vitest";
import { listAudit } from "@/server/audit";
import { salesCsv } from "@/server/exports";
import { createOrder, updateOrderStatus } from "@/server/orders";
import { todayJakarta } from "@/server/reports";
import { createTable } from "@/server/tables";
import { businessOf, menuItemOf, staffOf } from "./helpers";

const rejects = (p: Promise<unknown>, code: string) => expect(p).rejects.toSatisfy((e: unknown) => (e as { code?: string }).code === code);

describe("jejak aktivitas", () => {
  it("hanya yang berizin yang bisa membaca, tersaring per bisnis dan jenis", async () => {
    const a = await businessOf(`Kafe Audit ${Math.random()}`), b = await businessOf(`Kafe Audit B ${Math.random()}`);
    await createTable(a.ctx, { name: "M1" });
    await createOrder(a.ctx, { type: "takeaway", lines: [{ menuItemId: await menuItemOf(a.ctx), quantity: 1 }] });
    await createTable(b.ctx, { name: "Rahasia" });
    await rejects(listAudit(await staffOf(a, ["manager"])), "forbidden");
    const all = await listAudit(a.ctx);
    expect(all.map((r) => r.label)).toEqual(expect.arrayContaining(["Meja dibuat", "Pesanan dibuat"]));
    expect(JSON.stringify(all)).not.toContain("Rahasia");
    expect((await listAudit(a.ctx, "fnb.table")).every((r) => r.action.startsWith("fnb.table"))).toBe(true);
    expect(all[0]!.actor).toBeTruthy();
  });
});

describe("ekspor CSV", () => {
  it("memuat pesanan rentang tanggal, menetralkan rumus, dan butuh izin laporan", async () => {
    const biz = await businessOf(`Kafe CSV ${Math.random()}`);
    const item = await menuItemOf(biz.ctx, "Mie", 10000);
    await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: item, quantity: 2 }] });
    const gone = await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: item, quantity: 1 }] });
    await updateOrderStatus(biz.ctx, gone.id, "cancelled", "=1+1");
    const today = todayJakarta();
    const csv = await salesCsv(biz.ctx, today, today);
    const lines = csv.trim().split("\r\n");
    expect(lines[0]).toContain("No. struk");
    expect(lines).toHaveLength(3);
    expect(lines[2]).toContain(",'=1+1");
    expect(lines[1]).toMatch(/^INV-\d{6}-0001,/);
    expect(lines[1]).toContain(",20000,");
    await rejects(salesCsv(await staffOf(biz, ["cashier"]), today, today), "forbidden");
    await rejects(salesCsv(biz.ctx, "2020-01-01", "2026-12-31"), "range_too_long");
    await rejects(salesCsv(biz.ctx, today, "2020-01-01"), "invalid_date");
  });
});
