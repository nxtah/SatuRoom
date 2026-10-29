import "server-only";
import { SESSION_TTL_MS } from "@saturoom/core/auth";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { sessionCookieName } from "./context";
import { env } from "./env";
import { AppError } from "./errors";

/** Header wajib untuk request yang mengubah data; form lintas situs tidak bisa memasangnya. */
export const CLIENT_HEADER = "x-saturoom-client";

export interface ApiError {
  error: { code: string; message: string; fields?: Record<string, string> };
}

const fail = (status: number, code: string, message: string, fields?: Record<string, string>) =>
  NextResponse.json<ApiError>({ error: { code, message, ...(fields ? { fields } : {}) } }, { status });

/**
 * Membungkus route handler: pemeriksaan CSRF untuk method yang mengubah data, dan pemetaan error
 * ke format JSON yang sama di semua endpoint (`{ error: { code, message, fields? } }`).
 */
export function route<C>(handler: (req: NextRequest, ctx: C) => Promise<Response>) {
  return async (req: NextRequest, ctx: C): Promise<Response> => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") {
        const origin = req.headers.get("origin");
        if (origin !== new URL(env().APP_URL).origin || req.headers.get(CLIENT_HEADER) !== "web") {
          return fail(403, "bad_origin", "Permintaan ditolak. Muat ulang halaman lalu coba lagi.");
        }
      }
      return await handler(req, ctx);
    } catch (error) {
      if (error instanceof AppError) return fail(error.status, error.code, error.message, error.fields);
      console.error("[api]", req.method, req.nextUrl.pathname, error instanceof Error ? error.message : error);
      return fail(500, "server_error", "Terjadi gangguan di server. Data Anda aman; coba lagi sebentar lagi.");
    }
  };
}

/** Membaca dan memvalidasi body JSON. Pesan per kolom dikirim balik agar form bisa menandai isian. */
export async function body<S extends z.ZodType>(req: NextRequest, schema: S): Promise<z.infer<S>> {
  const raw = await req.json().catch(() => undefined);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      fields[key] ??= issue.message;
    }
    throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", fields);
  }
  return parsed.data;
}

export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(sessionCookieName(), token, {
    httpOnly: true,
    secure: env().COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(sessionCookieName());
}

export const ok = <T>(data: T, status = 200) => NextResponse.json(data, { status });
export const noContent = () => new NextResponse(null, { status: 204 });

export function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
