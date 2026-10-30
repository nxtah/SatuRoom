/**
 * Hitungan total pesanan. Satu fungsi dipakai server (yang menentukan) dan kasir (pratinjau),
 * supaya angka di layar sama dengan angka di struk.
 *
 * Urutan: subtotal, dikurangi diskon, ditambah service charge, lalu pajak dihitung dari
 * (setelah diskon + service charge). Semua dibulatkan ke rupiah.
 */
export interface PricingInput {
  gross: number;
  discountType?: "amount" | "percent" | null;
  discountValue?: number;
  servicePercent: number;
  taxPercent: number;
  /** Bagian subtotal dari menu yang tidak kena pajak. */
  nonTaxable?: number;
}
export interface PricingResult {
  gross: number;
  discount: number;
  service: number;
  tax: number;
  total: number;
}

export function computeTotals(input: PricingInput): PricingResult {
  const { gross } = input;
  const raw = input.discountType === "percent" ? Math.round((gross * (input.discountValue ?? 0)) / 100) : input.discountType === "amount" ? (input.discountValue ?? 0) : 0;
  const discount = Math.min(Math.max(0, raw), gross);
  const base = gross - discount;
  const service = Math.round((base * input.servicePercent) / 100);
  const ratio = gross > 0 ? Math.max(0, gross - (input.nonTaxable ?? 0)) / gross : 1;
  const tax = Math.round(((base + service) * ratio * input.taxPercent) / 100);
  return { gross, discount, service, tax, total: base + service + tax };
}
