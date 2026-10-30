import "server-only";
import { withContext, type Tx } from "@saturoom/core/db";
import { sql } from "drizzle-orm";
import { can, type FnbContext } from "./context";
import { db } from "./db";
import { AppError, forbidden } from "./errors";
import { REPORT_DATE } from "./reports";

/** Satu mesin untuk semua laporan rinci: tiap laporan hanya mengisi ringkasan dan satu atau beberapa tabel. */
export type ColKind = "text" | "money" | "int" | "num" | "pct";
export type Col = { key: string; label: string; kind: ColKind };
export type Row = Record<string, string | number | null>;
export type Section = { title: string; note?: string; columns: Col[]; rows: Row[]; totals?: Row };
export type Report = { summary: { label: string; value: number; kind: ColKind }[]; sections: Section[]; truncated?: boolean };
export type Filter = { from: string; to: string; cashierId: string | null };

export const REPORTS = [
  { slug: "penjualan", title: "Rincian penjualan", hint: "Setiap nota: tipe, meja, kasir, diskon, pajak, pembayaran." },
  { slug: "produk", title: "Penjualan per produk", hint: "Terjual, penjualan bersih, HPP, dan laba tiap menu." },
  { slug: "penerimaan", title: "Rincian penerimaan", hint: "Uang masuk per metode bayar dan per hari, setelah refund." },
  { slug: "kategori", title: "Penjualan per kategori", hint: "Kategori mana yang paling menghasilkan." },
  { slug: "tipe-pesanan", title: "Penjualan per tipe pesanan", hint: "Makan di tempat, bungkus, ojol, dan tipe lainnya." },
  { slug: "diskon-pajak", title: "Diskon, pajak, dan biaya lain", hint: "Potongan per jenis, service charge, dan pajak." },
  { slug: "pemakaian-bahan", title: "Penggunaan barang", hint: "Bahan dan barang jadi: masuk, terpakai, terbuang, selisih." },
  { slug: "shift", title: "Riwayat shift", hint: "Kas awal, kas seharusnya, hitung fisik, dan selisih tiap shift." },
  { slug: "kas", title: "Pencatatan kas", hint: "Kas masuk dan keluar dari laci, termasuk pengeluaran." },
  { slug: "dibatalkan", title: "Pesanan dihapus", hint: "Pesanan batal, pembayaran dibatalkan, dan refund beserta alasannya." },
] as const;
export type ReportSlug = (typeof REPORTS)[number]["slug"];
export const isReportSlug = (s: string): s is ReportSlug => REPORTS.some((r) => r.slug === s);

const TYPE_LABEL = sql`CASE o.type::text WHEN 'dine_in' THEN 'Makan di tempat' WHEN 'takeaway' THEN 'Bungkus' ELSE 'Ambil sendiri' END`;
const typeName = sql`coalesce(o.order_type_name, ${TYPE_LABEL})`;
const ordersIn = (f: Filter) => sql`(o.opened_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${f.from}::date AND ${f.to}::date AND (${f.cashierId}::uuid IS NULL OR o.opened_by = ${f.cashierId}::uuid)`;
const day = (col: string) => sql.raw(`(${col} AT TIME ZONE 'Asia/Jakarta')::date`);
const stamp = (col: string) => sql.raw(`to_char(${col} AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI')`);
const rows = async <T>(tx: Tx, q: ReturnType<typeof sql>) => (await tx.execute(q)) as unknown as T[];
const n = (v: unknown) => Number(v ?? 0);
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
const sum = (list: Row[], key: string) => list.reduce((s, r) => s + n(r[key]), 0);
const METHOD: Record<string, string> = { cash: "Tunai", transfer: "Transfer", qris: "QRIS", card: "Kartu", other: "Lainnya" };
const money = (key: string, label: string): Col => ({ key, label, kind: "money" });
const text = (key: string, label: string): Col => ({ key, label, kind: "text" });
const int = (key: string, label: string): Col => ({ key, label, kind: "int" });

export function parseFilter(q: { dari?: string | null; sampai?: string | null; kasir?: string | null }, today: string): Filter {
  const to = q.sampai && REPORT_DATE.test(q.sampai) ? q.sampai : today;
  const from = q.dari && REPORT_DATE.test(q.dari) ? q.dari : to.slice(0, 8) + "01";
  if (from > to) throw new AppError(422, "invalid_date", "Tanggal awal tidak boleh setelah tanggal akhir.");
  if ((Date.parse(to) - Date.parse(from)) / 86_400_000 > 366) throw new AppError(422, "range_too_long", "Rentang maksimal 366 hari.");
  const cashierId = q.kasir && /^[0-9a-f-]{36}$/i.test(q.kasir) ? q.kasir : null;
  return { from, to, cashierId };
}

export async function listCashiers(ctx: FnbContext): Promise<{ id: string; name: string }[]> {
  if (!can(ctx, "reports.read")) throw forbidden();
  return withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, (tx) => rows(tx, sql`
    SELECT DISTINCT u.id, u.name FROM fnb.orders o JOIN core.users u ON u.id = o.opened_by ORDER BY u.name`));
}

async function salesDetail(tx: Tx, f: Filter): Promise<Report> {
  const list = await rows<Row>(tx, sql`
    SELECT o.receipt_no AS no, ${stamp("o.opened_at")} AS tanggal, ${typeName} AS tipe, t.name AS meja, u.name AS kasir, o.customer_name AS pelanggan,
           o.subtotal, o.discount, o.service_charge AS service, o.tax, o.total,
           (SELECT coalesce(sum(p.amount), 0) FROM fnb.payments p WHERE p.order_id = o.id AND p.voided_at IS NULL)::int AS dibayar,
           (SELECT coalesce(sum(r.amount), 0) FROM fnb.refunds r WHERE r.order_id = o.id)::int AS refund,
           (SELECT string_agg(DISTINCT p.method::text, ', ') FROM fnb.payments p WHERE p.order_id = o.id AND p.voided_at IS NULL) AS metode
    FROM fnb.orders o LEFT JOIN fnb.dining_tables t ON t.id = o.table_id LEFT JOIN core.users u ON u.id = o.opened_by
    WHERE o.status <> 'cancelled' AND ${ordersIn(f)} ORDER BY o.opened_at DESC LIMIT 1000`);
  const [t] = await rows<Row>(tx, sql`
    SELECT count(*)::int AS nota, coalesce(sum(o.subtotal), 0)::int AS subtotal, coalesce(sum(o.discount), 0)::int AS discount, coalesce(sum(o.service_charge), 0)::int AS service,
           coalesce(sum(o.tax), 0)::int AS tax, coalesce(sum(o.total), 0)::int AS total FROM fnb.orders o WHERE o.status <> 'cancelled' AND ${ordersIn(f)}`);
  const mapped = list.map((r): Row => ({ ...r, metode: String(r.metode ?? "").split(", ").filter(Boolean).map((m) => METHOD[m] ?? m).join(", ") || "Belum dibayar" }));
  return {
    truncated: n(t!.nota) > mapped.length,
    summary: [{ label: "Jumlah nota", value: n(t!.nota), kind: "int" }, { label: "Subtotal", value: n(t!.subtotal), kind: "money" }, { label: "Diskon", value: n(t!.discount), kind: "money" },
      { label: "Service + pajak", value: n(t!.service) + n(t!.tax), kind: "money" }, { label: "Total", value: n(t!.total), kind: "money" }, { label: "Rata-rata per nota", value: n(t!.nota) ? Math.round(n(t!.total) / n(t!.nota)) : 0, kind: "money" }],
    sections: [{ title: "Daftar nota", columns: [text("no", "No. struk"), text("tanggal", "Waktu"), text("tipe", "Tipe"), text("meja", "Meja"), text("kasir", "Kasir"), text("pelanggan", "Pelanggan"), money("subtotal", "Subtotal"), money("discount", "Diskon"), money("service", "Service"), money("tax", "Pajak"), money("total", "Total"), money("dibayar", "Dibayar"), money("refund", "Refund"), text("metode", "Metode")], rows: mapped,
      totals: { no: "Total", subtotal: n(t!.subtotal), discount: n(t!.discount), service: n(t!.service), tax: n(t!.tax), total: n(t!.total) } }],
  };
}

/** Penjualan bersih = harga baris dikurangi bagian diskon pesanan (dibagi menurut porsi nilai baris). Laba = bersih dikurangi HPP yang tersimpan saat transaksi. */
async function byProductOrCategory(tx: Tx, f: Filter, mode: "produk" | "kategori"): Promise<Report> {
  const group = mode === "produk" ? sql`l.menu_item_id` : sql`c.id`;
  const label = mode === "produk" ? sql`max(l.item_name)` : sql`max(c.name)`;
  const list = await rows<Row>(tx, sql`
    SELECT ${label} AS nama, ${mode === "produk" ? sql`max(c.name)` : sql`count(DISTINCT l.menu_item_id)::int`} AS ${sql.raw(mode === "produk" ? "kategori" : '"jumlahMenu"')}, ${mode === "produk" ? sql`max(i.sku)` : sql`NULL`} AS sku,
           sum(l.quantity)::int AS qty, sum(l.unit_price * l.quantity)::int AS kotor,
           round(sum(CASE WHEN o.subtotal > 0 THEN o.discount::numeric * l.unit_price * l.quantity / o.subtotal ELSE 0 END))::int AS diskon,
           sum(l.unit_cost * l.quantity)::int AS hpp
    FROM fnb.order_lines l JOIN fnb.orders o ON o.id = l.order_id JOIN fnb.menu_items i ON i.id = l.menu_item_id JOIN fnb.menu_categories c ON c.id = i.category_id
    WHERE o.status <> 'cancelled' AND ${ordersIn(f)} GROUP BY ${group} ORDER BY sum(l.unit_price * l.quantity) DESC LIMIT 1000`);
  const totalNet = list.reduce((s, r) => s + n(r.kotor) - n(r.diskon), 0);
  const out = list.map((r): Row => { const bersih = n(r.kotor) - n(r.diskon); const laba = bersih - n(r.hpp); return { ...r, bersih, laba, margin: pct(laba, bersih), porsi: pct(bersih, totalNet) }; });
  const t: Row = { nama: "Total", qty: sum(out, "qty"), kotor: sum(out, "kotor"), diskon: sum(out, "diskon"), bersih: sum(out, "bersih"), hpp: sum(out, "hpp"), laba: sum(out, "laba") };
  const base: Col[] = [int("qty", "Terjual"), money("kotor", "Penjualan kotor"), money("diskon", "Diskon"), money("bersih", "Penjualan bersih"), money("hpp", "HPP"), money("laba", "Laba kotor"), { key: "margin", label: "Margin", kind: "pct" }, { key: "porsi", label: "Porsi", kind: "pct" }];
  return {
    summary: [{ label: "Terjual", value: n(t.qty), kind: "int" }, { label: "Penjualan bersih", value: n(t.bersih), kind: "money" }, { label: "HPP", value: n(t.hpp), kind: "money" }, { label: "Laba kotor", value: n(t.laba), kind: "money" }, { label: "Margin", value: pct(n(t.laba), n(t.bersih)), kind: "pct" }],
    sections: [{ title: mode === "produk" ? "Per produk" : "Per kategori", note: "Penjualan bersih = harga dikurangi bagian diskon pesanan. HPP dari harga pokok yang tersimpan saat transaksi; menu tanpa HPP dianggap 0.", columns: mode === "produk" ? [text("nama", "Produk"), text("kategori", "Kategori"), text("sku", "SKU"), ...base] : [text("nama", "Kategori"), int("jumlahMenu", "Menu"), ...base], rows: out, totals: t }],
  };
}

async function receipts(tx: Tx, f: Filter): Promise<Report> {
  const pay = (extra = sql``) => sql`(p.recorded_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${f.from}::date AND ${f.to}::date AND (${f.cashierId}::uuid IS NULL OR p.recorded_by = ${f.cashierId}::uuid) ${extra}`;
  const ref = sql`(r.refunded_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${f.from}::date AND ${f.to}::date AND (${f.cashierId}::uuid IS NULL OR r.refunded_by = ${f.cashierId}::uuid)`;
  const paid = await rows<{ k: string; count: number; amount: number }>(tx, sql`SELECT p.method::text AS k, count(*)::int AS count, sum(p.amount)::int AS amount FROM fnb.payments p WHERE p.voided_at IS NULL AND ${pay()} GROUP BY 1`);
  const refunded = await rows<{ k: string; count: number; amount: number }>(tx, sql`SELECT r.method::text AS k, count(*)::int AS count, sum(r.amount)::int AS amount FROM fnb.refunds r WHERE ${ref} GROUP BY 1`);
  const keys = [...new Set([...paid.map((x) => x.k), ...refunded.map((x) => x.k)])];
  const byMethod: Row[] = keys.map((k) => { const a = paid.find((x) => x.k === k); const b = refunded.find((x) => x.k === k); return { metode: METHOD[k] ?? k, jumlah: n(a?.count), diterima: n(a?.amount), refund: n(b?.amount), bersih: n(a?.amount) - n(b?.amount) }; }).sort((a, b) => n(b.bersih) - n(a.bersih));
  const perDay = await rows<Row>(tx, sql`
    SELECT to_char(d::date, 'YYYY-MM-DD') AS tanggal,
      coalesce((SELECT sum(p.amount) FROM fnb.payments p WHERE p.voided_at IS NULL AND ${day("p.recorded_at")} = d::date AND (${f.cashierId}::uuid IS NULL OR p.recorded_by = ${f.cashierId}::uuid)), 0)::int AS diterima,
      coalesce((SELECT sum(r.amount) FROM fnb.refunds r WHERE ${day("r.refunded_at")} = d::date AND (${f.cashierId}::uuid IS NULL OR r.refunded_by = ${f.cashierId}::uuid)), 0)::int AS refund
    FROM generate_series(${f.from}::date, ${f.to}::date, interval '1 day') d ORDER BY d`);
  const days = perDay.map((r): Row => ({ ...r, bersih: n(r.diterima) - n(r.refund) })).filter((r) => n(r.diterima) || n(r.refund));
  const t: Row = { metode: "Total", jumlah: sum(byMethod, "jumlah"), diterima: sum(byMethod, "diterima"), refund: sum(byMethod, "refund"), bersih: sum(byMethod, "bersih") };
  const cash = byMethod.find((m) => m.metode === "Tunai");
  return {
    summary: [{ label: "Uang diterima", value: n(t.diterima), kind: "money" }, { label: "Refund", value: n(t.refund), kind: "money" }, { label: "Penerimaan bersih", value: n(t.bersih), kind: "money" }, { label: "Tunai", value: n(cash?.bersih), kind: "money" }, { label: "Non-tunai", value: n(t.bersih) - n(cash?.bersih), kind: "money" }],
    sections: [
      { title: "Per metode bayar", columns: [text("metode", "Metode"), int("jumlah", "Transaksi"), money("diterima", "Diterima"), money("refund", "Refund"), money("bersih", "Bersih")], rows: byMethod, totals: t },
      { title: "Per hari", columns: [text("tanggal", "Tanggal"), money("diterima", "Diterima"), money("refund", "Refund"), money("bersih", "Bersih")], rows: days, totals: { tanggal: "Total", diterima: sum(days, "diterima"), refund: sum(days, "refund"), bersih: sum(days, "bersih") } },
    ],
  };
}

async function byOrderType(tx: Tx, f: Filter): Promise<Report> {
  const list = await rows<Row>(tx, sql`
    SELECT ${typeName} AS tipe, count(*)::int AS nota, sum(o.subtotal)::int AS subtotal, sum(o.discount)::int AS discount, sum(o.service_charge)::int AS service, sum(o.tax)::int AS tax, sum(o.total)::int AS total
    FROM fnb.orders o WHERE o.status <> 'cancelled' AND ${ordersIn(f)} GROUP BY 1 ORDER BY sum(o.total) DESC`);
  const grand = sum(list, "total");
  const out = list.map((r): Row => ({ ...r, rata: n(r.nota) ? Math.round(n(r.total) / n(r.nota)) : 0, porsi: pct(n(r.total), grand) }));
  const t: Row = { tipe: "Total", nota: sum(out, "nota"), subtotal: sum(out, "subtotal"), discount: sum(out, "discount"), service: sum(out, "service"), tax: sum(out, "tax"), total: grand };
  return {
    summary: [{ label: "Nota", value: n(t.nota), kind: "int" }, { label: "Total penjualan", value: grand, kind: "money" }, { label: "Rata-rata per nota", value: n(t.nota) ? Math.round(grand / n(t.nota)) : 0, kind: "money" }],
    sections: [{ title: "Per tipe pesanan", columns: [text("tipe", "Tipe"), int("nota", "Nota"), money("subtotal", "Subtotal"), money("discount", "Diskon"), money("service", "Service"), money("tax", "Pajak"), money("total", "Total"), money("rata", "Rata-rata nota"), { key: "porsi", label: "Porsi", kind: "pct" }], rows: out, totals: t }],
  };
}

async function discountsTaxes(tx: Tx, f: Filter): Promise<Report> {
  const label = sql`CASE WHEN o.voucher_id IS NOT NULL THEN 'Voucher ' || o.voucher_code WHEN o.discount_id IS NOT NULL THEN 'Diskon ' || coalesce(d.name, 'bernama') ELSE 'Diskon manual' END`;
  const kinds = await rows<Row>(tx, sql`SELECT ${label} AS jenis, count(*)::int AS nota, sum(o.discount)::int AS potongan FROM fnb.orders o LEFT JOIN fnb.discounts d ON d.id = o.discount_id
    WHERE o.status <> 'cancelled' AND o.discount > 0 AND ${ordersIn(f)} GROUP BY 1 ORDER BY sum(o.discount) DESC`);
  const perDay = await rows<Row>(tx, sql`SELECT to_char(${day("o.opened_at")}, 'YYYY-MM-DD') AS tanggal, count(*)::int AS nota, sum(o.subtotal)::int AS subtotal, sum(o.discount)::int AS discount, sum(o.service_charge)::int AS service, sum(o.tax)::int AS tax
    FROM fnb.orders o WHERE o.status <> 'cancelled' AND ${ordersIn(f)} GROUP BY 1 ORDER BY 1`);
  const t: Row = { tanggal: "Total", nota: sum(perDay, "nota"), subtotal: sum(perDay, "subtotal"), discount: sum(perDay, "discount"), service: sum(perDay, "service"), tax: sum(perDay, "tax") };
  return {
    summary: [{ label: "Diskon diberikan", value: n(t.discount), kind: "money" }, { label: "Service charge", value: n(t.service), kind: "money" }, { label: "Pajak", value: n(t.tax), kind: "money" }, { label: "Diskon dari subtotal", value: pct(n(t.discount), n(t.subtotal)), kind: "pct" }],
    sections: [
      { title: "Diskon per jenis", columns: [text("jenis", "Jenis"), int("nota", "Nota"), money("potongan", "Total potongan")], rows: kinds, totals: { jenis: "Total", nota: sum(kinds, "nota"), potongan: sum(kinds, "potongan") } },
      { title: "Per hari", columns: [text("tanggal", "Tanggal"), int("nota", "Nota"), money("subtotal", "Subtotal"), money("discount", "Diskon"), money("service", "Service charge"), money("tax", "Pajak")], rows: perDay, totals: t },
    ],
  };
}

async function usage(tx: Tx, f: Filter): Promise<Report> {
  const mv = sql`(m.created_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${f.from}::date AND ${f.to}::date`;
  const ing = await rows<Row>(tx, sql`
    SELECT i.name AS nama, i.unit AS satuan,
      coalesce(sum(m.quantity) FILTER (WHERE m.reference_type = 'purchase'), 0)::float8 AS masuk,
      coalesce(-sum(m.quantity) FILTER (WHERE m.reference_type IN ('order', 'order_cancel')), 0)::float8 AS terpakai,
      coalesce(-sum(m.quantity) FILTER (WHERE m.reference_type = 'waste'), 0)::float8 AS terbuang,
      coalesce(sum(m.quantity) FILTER (WHERE m.reference_type = 'opname'), 0)::float8 AS opname,
      coalesce(sum(m.quantity) FILTER (WHERE m.reference_type IS NULL OR m.reference_type NOT IN ('purchase', 'order', 'order_cancel', 'waste', 'opname')), 0)::float8 AS penyesuaian,
      i.stock::float8 AS sisa, i.average_cost AS hpp
    FROM fnb.ingredients i LEFT JOIN fnb.stock_movements m ON m.ingredient_id = i.id AND ${mv}
    WHERE i.archived_at IS NULL GROUP BY i.id ORDER BY i.name`);
  const ingredients = ing.map((r): Row => ({ ...r, nilaiTerpakai: Math.round(n(r.terpakai) * n(r.hpp)), nilaiTerbuang: Math.round(n(r.terbuang) * n(r.hpp)) })).filter((r) => n(r.masuk) || n(r.terpakai) || n(r.terbuang) || n(r.opname) || n(r.penyesuaian));
  const imv = sql`(m.created_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${f.from}::date AND ${f.to}::date`;
  const goods = await rows<Row>(tx, sql`
    SELECT i.name AS nama, i.sku,
      coalesce(sum(m.quantity) FILTER (WHERE m.reference_type = 'adjust' AND m.quantity > 0), 0)::int AS masuk,
      coalesce(-sum(m.quantity) FILTER (WHERE m.reference_type IN ('order', 'order_cancel')), 0)::int AS terjual,
      coalesce(-sum(m.quantity) FILTER (WHERE m.reference_type = 'adjust' AND m.quantity < 0), 0)::int AS "keluarLain"
    FROM fnb.menu_items i LEFT JOIN fnb.item_stock_movements m ON m.menu_item_id = i.id AND ${imv}
    WHERE i.archived_at IS NULL AND i.track_stock GROUP BY i.id ORDER BY i.name`);
  const goodsOut = goods.filter((r) => n(r.masuk) || n(r.terjual) || n(r.keluarLain));
  const num = (key: string, label: string): Col => ({ key, label, kind: "num" });
  return {
    summary: [{ label: "Nilai bahan terpakai", value: sum(ingredients, "nilaiTerpakai"), kind: "money" }, { label: "Nilai bahan terbuang", value: sum(ingredients, "nilaiTerbuang"), kind: "money" }, { label: "Jenis bahan bergerak", value: ingredients.length, kind: "int" }, { label: "Barang jadi terjual", value: sum(goodsOut, "terjual"), kind: "int" }],
    sections: [
      { title: "Bahan baku", note: "Terpakai = terpotong resep dan add-on saat pesanan (sudah dikurangi pembatalan). Nilai memakai harga rata-rata bahan saat ini.", columns: [text("nama", "Bahan"), text("satuan", "Satuan"), num("masuk", "Masuk (pembelian)"), num("terpakai", "Terpakai"), num("terbuang", "Terbuang"), num("opname", "Selisih opname"), num("penyesuaian", "Penyesuaian"), num("sisa", "Stok sekarang"), money("nilaiTerpakai", "Nilai terpakai"), money("nilaiTerbuang", "Nilai terbuang")], rows: ingredients, totals: { nama: "Total", nilaiTerpakai: sum(ingredients, "nilaiTerpakai"), nilaiTerbuang: sum(ingredients, "nilaiTerbuang") } },
      { title: "Barang jadi", columns: [text("nama", "Barang"), text("sku", "SKU"), int("masuk", "Masuk"), int("terjual", "Terjual"), int("keluarLain", "Keluar lainnya")], rows: goodsOut },
    ],
  };
}

async function shifts(tx: Tx, f: Filter): Promise<Report> {
  const list = await rows<Row>(tx, sql`
    SELECT ${stamp("s.opened_at")} AS dibuka, CASE WHEN s.closed_at IS NULL THEN 'Masih berjalan' ELSE ${stamp("s.closed_at")} END AS ditutup, uo.name AS kasir, s.opening_cash AS awal,
      coalesce((SELECT sum(p.amount) FROM fnb.payments p WHERE p.shift_id = s.id AND p.voided_at IS NULL AND p.method = 'cash'), 0)::int AS tunai,
      coalesce((SELECT sum(p.amount) FROM fnb.payments p WHERE p.shift_id = s.id AND p.voided_at IS NULL AND p.method <> 'cash'), 0)::int AS nontunai,
      coalesce((SELECT sum(m.amount) FROM fnb.cash_movements m WHERE m.shift_id = s.id AND m.kind = 'in'), 0)::int AS masuk,
      coalesce((SELECT sum(m.amount) FROM fnb.cash_movements m WHERE m.shift_id = s.id AND m.kind = 'out'), 0)::int AS keluar,
      s.expected_cash AS seharusnya, s.closing_cash AS hitung, s.variance AS selisih, s.notes AS catatan
    FROM fnb.cash_shifts s LEFT JOIN core.users uo ON uo.id = s.opened_by
    WHERE (s.opened_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${f.from}::date AND ${f.to}::date AND (${f.cashierId}::uuid IS NULL OR s.opened_by = ${f.cashierId}::uuid)
    ORDER BY s.opened_at DESC LIMIT 500`);
  const closed = list.filter((r) => r.selisih !== null);
  return {
    summary: [{ label: "Jumlah shift", value: list.length, kind: "int" }, { label: "Penjualan tunai", value: sum(list, "tunai"), kind: "money" }, { label: "Penjualan non-tunai", value: sum(list, "nontunai"), kind: "money" }, { label: "Total selisih kas", value: sum(closed, "selisih"), kind: "money" }],
    sections: [{ title: "Daftar shift", note: "Selisih = hitung fisik dikurangi kas seharusnya. Negatif berarti uang kurang.", columns: [text("dibuka", "Dibuka"), text("ditutup", "Ditutup"), text("kasir", "Dibuka oleh"), money("awal", "Kas awal"), money("tunai", "Penjualan tunai"), money("nontunai", "Non-tunai"), money("masuk", "Kas masuk"), money("keluar", "Kas keluar"), money("seharusnya", "Seharusnya"), money("hitung", "Hitung fisik"), money("selisih", "Selisih"), text("catatan", "Catatan")], rows: list }],
  };
}

async function cashLog(tx: Tx, f: Filter): Promise<Report> {
  const list = await rows<Row>(tx, sql`
    SELECT ${stamp("m.recorded_at")} AS waktu, ${stamp("s.opened_at")} AS shift, CASE m.kind WHEN 'in' THEN 'Masuk' ELSE 'Keluar' END AS jenis, m.category AS kategori, m.reason AS alasan, m.amount, m.kind AS arah, u.name AS oleh
    FROM fnb.cash_movements m JOIN fnb.cash_shifts s ON s.id = m.shift_id LEFT JOIN core.users u ON u.id = m.recorded_by
    WHERE ${day("m.recorded_at")} BETWEEN ${f.from}::date AND ${f.to}::date AND (${f.cashierId}::uuid IS NULL OR m.recorded_by = ${f.cashierId}::uuid) ORDER BY m.recorded_at DESC LIMIT 1000`);
  const inn = list.filter((r) => r.arah === "in").reduce((s, r) => s + n(r.amount), 0);
  const out = list.filter((r) => r.arah === "out").reduce((s, r) => s + n(r.amount), 0);
  return {
    summary: [{ label: "Kas masuk", value: inn, kind: "money" }, { label: "Kas keluar", value: out, kind: "money" }, { label: "Selisih", value: inn - out, kind: "money" }, { label: "Jumlah catatan", value: list.length, kind: "int" }],
    sections: [{ title: "Catatan kas laci", note: "Termasuk pengeluaran yang dibayar dari laci dan refund tunai.", columns: [text("waktu", "Waktu"), text("shift", "Shift dibuka"), text("jenis", "Jenis"), text("kategori", "Kategori"), text("alasan", "Alasan"), money("amount", "Jumlah"), text("oleh", "Dicatat oleh")], rows: list }],
  };
}

async function removed(tx: Tx, f: Filter): Promise<Report> {
  const cancelled = await rows<Row>(tx, sql`
    SELECT o.receipt_no AS no, ${stamp("o.opened_at")} AS tanggal, ${typeName} AS tipe, o.total, o.cancel_reason AS alasan, u.name AS kasir,
      (SELECT ua.name FROM core.audit_events a JOIN core.users ua ON ua.id = a.actor_user_id WHERE a.target_id = o.id::text AND a.action = 'fnb.order.status_changed' AND a.meta->>'to' = 'cancelled' ORDER BY a.created_at DESC LIMIT 1) AS "dibatalkanOleh"
    FROM fnb.orders o LEFT JOIN core.users u ON u.id = o.opened_by WHERE o.status = 'cancelled' AND ${ordersIn(f)} ORDER BY o.opened_at DESC LIMIT 1000`);
  const voids = await rows<Row>(tx, sql`
    SELECT o.receipt_no AS no, ${stamp("p.recorded_at")} AS tanggal, p.method::text AS metode, p.amount, p.void_reason AS alasan, u.name AS kasir
    FROM fnb.payments p JOIN fnb.orders o ON o.id = p.order_id LEFT JOIN core.users u ON u.id = p.recorded_by
    WHERE p.voided_at IS NOT NULL AND ${day("p.recorded_at")} BETWEEN ${f.from}::date AND ${f.to}::date AND (${f.cashierId}::uuid IS NULL OR p.recorded_by = ${f.cashierId}::uuid) ORDER BY p.recorded_at DESC LIMIT 1000`);
  const refunds = await rows<Row>(tx, sql`
    SELECT o.receipt_no AS no, ${stamp("r.refunded_at")} AS tanggal, r.method::text AS metode, r.amount, r.reason AS alasan, u.name AS kasir
    FROM fnb.refunds r JOIN fnb.orders o ON o.id = r.order_id LEFT JOIN core.users u ON u.id = r.refunded_by
    WHERE ${day("r.refunded_at")} BETWEEN ${f.from}::date AND ${f.to}::date AND (${f.cashierId}::uuid IS NULL OR r.refunded_by = ${f.cashierId}::uuid) ORDER BY r.refunded_at DESC LIMIT 1000`);
  const label = (list: Row[]) => list.map((r) => ({ ...r, metode: METHOD[String(r.metode)] ?? r.metode }));
  return {
    summary: [{ label: "Pesanan dibatalkan", value: cancelled.length, kind: "int" }, { label: "Nilai pesanan batal", value: sum(cancelled, "total"), kind: "money" }, { label: "Pembayaran dibatalkan", value: sum(voids, "amount"), kind: "money" }, { label: "Refund", value: sum(refunds, "amount"), kind: "money" }],
    sections: [
      { title: "Pesanan dibatalkan", columns: [text("no", "No. struk"), text("tanggal", "Waktu"), text("tipe", "Tipe"), money("total", "Nilai"), text("alasan", "Alasan"), text("kasir", "Dibuat oleh"), text("dibatalkanOleh", "Dibatalkan oleh")], rows: cancelled, totals: { no: "Total", total: sum(cancelled, "total") } },
      { title: "Pembayaran dibatalkan", columns: [text("no", "No. struk"), text("tanggal", "Waktu"), text("metode", "Metode"), money("amount", "Jumlah"), text("alasan", "Alasan"), text("kasir", "Dicatat oleh")], rows: label(voids), totals: { no: "Total", amount: sum(voids, "amount") } },
      { title: "Refund", columns: [text("no", "No. struk"), text("tanggal", "Waktu"), text("metode", "Metode"), money("amount", "Jumlah"), text("alasan", "Alasan"), text("kasir", "Diproses oleh")], rows: label(refunds), totals: { no: "Total", amount: sum(refunds, "amount") } },
    ],
  };
}

export async function buildReport(ctx: FnbContext, slug: ReportSlug, f: Filter): Promise<Report> {
  if (!can(ctx, "reports.read")) throw forbidden();
  return withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, (tx) => {
    switch (slug) {
      case "penjualan": return salesDetail(tx, f);
      case "produk": return byProductOrCategory(tx, f, "produk");
      case "kategori": return byProductOrCategory(tx, f, "kategori");
      case "penerimaan": return receipts(tx, f);
      case "tipe-pesanan": return byOrderType(tx, f);
      case "diskon-pajak": return discountsTaxes(tx, f);
      case "pemakaian-bahan": return usage(tx, f);
      case "shift": return shifts(tx, f);
      case "kas": return cashLog(tx, f);
      case "dibatalkan": return removed(tx, f);
    }
  });
}

/** Sel yang diawali = + - @ diberi tanda kutip agar tidak dijalankan sebagai rumus di Excel/Sheets. */
const cell = (v: unknown) => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !(typeof v === "number")) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};
export function reportCsv(report: Report): string {
  const lines: string[] = [];
  for (const sec of report.sections) {
    lines.push(cell(sec.title));
    lines.push(sec.columns.map((c) => cell(c.label)).join(","));
    for (const r of sec.rows) lines.push(sec.columns.map((c) => cell(r[c.key])).join(","));
    if (sec.totals) lines.push(sec.columns.map((c) => cell(sec.totals![c.key])).join(","));
    lines.push("");
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}
