import "server-only";

/** Sel yang diawali = + - @ bisa dibaca Excel sebagai rumus; diberi tanda petik di depan. */
const cell = (v: string | number | null | undefined): string => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV dengan BOM supaya Excel membaca huruf Indonesia dengan benar. */
export function csvResponse(filename: string, header: string[], rows: (string | number | null)[][]): Response {
  const body = "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
