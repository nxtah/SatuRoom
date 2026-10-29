import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { requireApiContext, type FnbContext } from "./context";
import { env } from "./env";
import { AppError } from "./errors";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

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
      const code = error instanceof Error ? error.message : "";
      if (code === "UNAUTHORIZED") return fail(401, "Silakan masuk lagi.");
      if (code === "FORBIDDEN") return fail(403, "Anda belum punya izin untuk tindakan ini.");
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
