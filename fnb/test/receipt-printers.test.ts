import { describe, expect, it } from "vitest";
import { createOrder } from "@/server/orders";
import { archivePrinter, listPrinters, savePrinter } from "@/server/printers";
import { getReceipt } from "@/server/receipt";
import { getTemplate, saveTemplate } from "@/server/receipt-template";
import { businessOf, menuItemOf, staffOf } from "./helpers";

const rejects = (p: Promise<unknown>, code: string) =>
  expect(p).rejects.toSatisfy((e: unknown) => (e as { code?: string }).code === code || (e as Error).message === code);
const tpl = { logoUrl: null, paper: 58, header: "Jl. Mawar 1", footer: "Terima kasih", showCashier: false, showTable: true, showCustomer: true, showTaxDetail: false, showPayment: true } as const;
const printer = { name: "Kasir", purpose: "receipt", paper: 58, location: "Depan", copies: 1, isDefault: true, isActive: true } as const;

describe("templat struk dan printer", () => {
  it("templat dibaca struk, printer bawaan menentukan lebar kertas, satu bawaan per fungsi", async () => {
    const biz = await businessOf(`Kafe Struk ${Math.random()}`);
    expect(await getTemplate(biz.ctx)).toMatchObject({ paper: 80, showCashier: true, logoUrl: null });
    await saveTemplate(biz.ctx, { ...tpl });
    const o = await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: await menuItemOf(biz.ctx), quantity: 1 }] });
    const r1 = await getReceipt(biz.ctx, o.id);
    expect(r1).toMatchObject({ paper: 58, header: "Jl. Mawar 1", footer: "Terima kasih", printerName: null });
    expect(r1.template).toMatchObject({ showCashier: false, showTaxDetail: false });

    const a = await savePrinter(biz.ctx, { ...printer, name: "Printer 80", paper: 80 });
    await savePrinter(biz.ctx, { ...printer, name: "Printer 58", paper: 58 });
    const list = await listPrinters(biz.ctx);
    expect(list.filter((p) => p.isDefault)).toHaveLength(1);
    expect(list.find((p) => p.name === "Printer 58")!.isDefault).toBe(true);
    expect(list.find((p) => p.id === a.id)!.isDefault).toBe(false);
    await rejects(savePrinter(biz.ctx, { ...printer, name: "printer 80" }), "duplicate");
    await savePrinter(biz.ctx, { ...printer, name: "Printer 80", paper: 80 }, a.id);
    expect(await getReceipt(biz.ctx, o.id)).toMatchObject({ paper: 80, printerName: "Printer 80" });
    await archivePrinter(biz.ctx, a.id);
    expect(await getReceipt(biz.ctx, o.id)).toMatchObject({ paper: 58, printerName: null });
  });

  it("logo harus dari Cloudinary milik bisnis, izin dan isolasi dijaga", async () => {
    const a = await businessOf(`Kafe SA ${Math.random()}`);
    const b = await businessOf(`Kafe SB ${Math.random()}`);
    await rejects(saveTemplate(a.ctx, { ...tpl, logoUrl: "https://contoh.com/logo.png" }), "invalid_image");
    await rejects(saveTemplate(await staffOf(a, ["cashier"]), { ...tpl }), "forbidden");
    await rejects(savePrinter(await staffOf(a, ["cashier"]), { ...printer }), "forbidden");
    await savePrinter(a.ctx, { ...printer });
    expect(await listPrinters(b.ctx)).toHaveLength(0);
    await rejects(archivePrinter(b.ctx, (await listPrinters(a.ctx))[0]!.id), "not_found");
  });
});
