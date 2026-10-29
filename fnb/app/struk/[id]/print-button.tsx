"use client";

/** Cetak ke printer, atau pilih "Simpan sebagai PDF" di dialog cetak browser. */
export function PrintButton() {
  return <button onClick={() => window.print()} className="h-12 rounded-full bg-saffron px-8 font-extrabold text-kitchen">Cetak atau simpan PDF</button>;
}
