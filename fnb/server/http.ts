import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type z } from "zod";
import type { SessionInfo } from "@saturoom/core/auth";
import { currentSession, requireApiContext, type FnbContext } from "./context";
import { env } from "./env";
import { AppError } from "./errors";
import { withinLimit } from "./rate-limit";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/** Kode kesalahan lama (string) dari modul kasir/dapur/stok, dipetakan ke pesan yang ramah. */
const LEGACY: Record<string, [number, string]> = {
  FORBIDDEN: [403, "Anda belum punya izin untuk tindakan ini."],
  NOT_FOUND: [404, "Data tidak ditemukan."],
  ITEM_UNAVAILABLE: [422, "Ada menu yang sedang habis."],
  INSUFFICIENT_STOCK: [409, "Bahan tidak cukup untuk pesanan ini."],
  NO_OUTLET: [422, "Outlet belum tersedia."],
  ORDER_NOT_READY: [422, "Pesanan ini belum siap dibayar."],
  INVALID_TRANSITION: [409, "Status pesanan tidak bisa diubah ke tahap itu."],
  SHIFT_OPEN: [409, "Masih ada shift kas yang belum ditutup."],
  NO_SHIFT: [409, "Tidak ada shift kas yang terbuka."],
  INVALID_DATE: [422, "Tanggal tidak valid."],
};

/**
 * Membungkus route handler: cek asal permintaan untuk method yang mengubah data, memuat konteks
 * bisnis, dan memetakan error ke `{ error: "pesan" }` seperti route Rasa lainnya.
 */
export function route<P = Record<string, never>>(handler: (req: Request, ctx: FnbContext, params: P) => Promise<Response>) {
  return async (req: Request, { params }: { params: Promise<P> }): Promise<Response> => {
    try {
      if (req.method !== "GET" && req.headers.get("origin") !== new URL(env().APP_URL).origin) return fail(403, "Permintaan ditolak.");
      return await handler(req, await requireApiContext(), await params);
    } catch (error) {
      if (error instanceof AppError) return fail(error.status, error.message);
      if (error instanceof ZodError) return fail(422, "Data yang dikirim tidak valid.");
      const code = error instanceof Error ? error.message : "";
      if (code === "UNAUTHORIZED") return fail(401, "Silakan masuk lagi.");
      if (LEGACY[code]) return fail(...LEGACY[code]);
      console.error("[api]", req.method, new URL(req.url).pathname, code);
      return fail(500, "Terjadi gangguan di server. Data Anda aman; coba lagi sebentar lagi.");
    }
  };
}

export async function body<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  const parsed = schema.safeParse(await req.json().catch(() => undefined));
  if (!parsed.success) throw new AppError(422, "invalid", parsed.error.issues[0]?.message ?? "Periksa lagi isian Anda.");
  return parsed.data;
}

/** Route tanpa login (daftar, lupa password): hanya cek asal permintaan dan petakan error. */
export function publicRoute<P = Record<string, never>>(handler: (req: Request, params: P) => Promise<Response>) {
  return guarded<P>(async (req, params) => handler(req, params));
}

/** Route untuk pengguna yang sudah masuk tetapi belum tentu punya bisnis aktif (undangan). */
export function sessionRoute(handler: (req: Request, session: SessionInfo) => Promise<Response>) {
  return guarded<Record<string, never>>(async (req) => {
    const session = await currentSession();
    if (!session) throw new Error("UNAUTHORIZED");
    return handler(req, session);
  });
}

function guarded<P>(handler: (req: Request, params: P) => Promise<Response>) {
  return async (req: Request, { params }: { params: Promise<P> }): Promise<Response> => {
    try {
      if (req.method !== "GET" && req.headers.get("origin") !== new URL(env().APP_URL).origin) return fail(403, "Permintaan ditolak.");
      return await handler(req, await params);
    } catch (error) {
      if (error instanceof AppError) return fail(error.status, error.message);
      if (error instanceof Error && error.message === "UNAUTHORIZED") return fail(401, "Silakan masuk lagi.");
      console.error("[api]", req.method, new URL(req.url).pathname, error instanceof Error ? error.message : error);
      return fail(500, "Terjadi gangguan di server. Data Anda aman; coba lagi sebentar lagi.");
    }
  };
}

export function limited(key: string, max: number, windowMs: number) {
  if (!withinLimit(key, max, windowMs)) throw new AppError(429, "rate_limited", "Terlalu banyak percobaan. Coba lagi nanti.");
}
