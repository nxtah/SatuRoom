/**
 * Akun dan sesi bersama semua produk. Tidak tahu apa pun tentang akademi; produk memanggil fungsi
 * ini dan menambahkan aturannya sendiri (peran, izin).
 */
import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { dummyPasswordHash, hashPassword, newToken, tokenHash, verifyPassword } from "./crypto";
import type { Db } from "./db";
import { authTokens, sessions, users } from "./schema";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_TOUCH_MS = 60 * 60 * 1000;
const TOKEN_TTL_MS = { verify_email: 48 * 60 * 60 * 1000, reset_password: 60 * 60 * 1000 } as const;

export type TokenKind = keyof typeof TOKEN_TTL_MS;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export type RegisterResult = { status: "created"; userId: string; verifyToken: string } | { status: "exists" };

/** Email yang sudah terdaftar tidak dibedakan di layar (mencegah orang menebak akun). */
export async function registerUser(
  db: Db,
  input: { name: string; email: string; password: string },
): Promise<RegisterResult> {
  const passwordHash = await hashPassword(input.password);
  const [user] = await db
    .insert(users)
    .values({ name: input.name.trim(), email: normalizeEmail(input.email), passwordHash })
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id });
  if (!user) return { status: "exists" };
  const verifyToken = await issueToken(db, user.id, "verify_email");
  return { status: "created", userId: user.id, verifyToken };
}

export async function issueToken(db: Db, userId: string, kind: TokenKind): Promise<string> {
  const { token, hash } = newToken();
  await db.transaction(async (tx) => {
    // Link lama yang belum dipakai dibatalkan: hanya link terbaru yang berlaku.
    await tx
      .update(authTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(authTokens.userId, userId), eq(authTokens.kind, kind), isNull(authTokens.usedAt)));
    await tx.insert(authTokens).values({
      userId,
      kind,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS[kind]),
    });
  });
  return token;
}

/** Memakai token sekali saja. Mengembalikan userId bila sah. */
export async function consumeToken(db: Db, token: string, kind: TokenKind): Promise<string | null> {
  const [row] = await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(authTokens.tokenHash, tokenHash(token)),
        eq(authTokens.kind, kind),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, new Date()),
      ),
    )
    .returning({ userId: authTokens.userId });
  return row?.userId ?? null;
}

export async function verifyEmail(db: Db, token: string): Promise<boolean> {
  const userId = await consumeToken(db, token, "verify_email");
  if (!userId) return false;
  await db
    .update(users)
    .set({ emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())`, updatedAt: new Date() })
    .where(eq(users.id, userId));
  return true;
}

export type LoginResult =
  | { status: "ok"; token: string; userId: string }
  | { status: "invalid" }
  | { status: "unverified"; userId: string };

export async function login(
  db: Db,
  input: { email: string; password: string; product: string },
): Promise<LoginResult> {
  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash, verified: users.emailVerifiedAt })
    .from(users)
    .where(eq(users.email, normalizeEmail(input.email)));
  if (!user) {
    await verifyPassword(await dummyPasswordHash(), input.password);
    return { status: "invalid" };
  }
  if (!(await verifyPassword(user.passwordHash, input.password))) return { status: "invalid" };
  if (!user.verified) return { status: "unverified", userId: user.id };

  const { token, hash } = newToken();
  await db.transaction(async (tx) => {
    await tx.delete(sessions).where(and(eq(sessions.userId, user.id), lt(sessions.expiresAt, new Date())));
    await tx.insert(sessions).values({
      userId: user.id,
      tokenHash: hash,
      product: input.product,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    });
  });
  return { status: "ok", token, userId: user.id };
}

export interface SessionInfo {
  sessionId: string;
  userId: string;
  name: string;
  email: string;
  activeBusinessId: string | null;
}

/** Mencari sesi dari token cookie. Masa berlaku diperpanjang paling sering sekali per jam. */
export async function getSession(db: Db, token: string, product: string): Promise<SessionInfo | null> {
  const [row] = await db
    .select({
      sessionId: sessions.id,
      userId: sessions.userId,
      activeBusinessId: sessions.activeBusinessId,
      lastSeenAt: sessions.lastSeenAt,
      name: users.name,
      email: users.email,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash(token)),
        eq(sessions.product, product),
        gt(sessions.expiresAt, new Date()),
      ),
    );
  if (!row) return null;
  if (Date.now() - row.lastSeenAt.getTime() > SESSION_TOUCH_MS) {
    await db
      .update(sessions)
      .set({ lastSeenAt: new Date(), expiresAt: new Date(Date.now() + SESSION_TTL_MS) })
      .where(eq(sessions.id, row.sessionId));
  }
  const { lastSeenAt: _ignored, ...info } = row;
  return info;
}

export async function setActiveBusiness(db: Db, sessionId: string, businessId: string | null): Promise<void> {
  await db.update(sessions).set({ activeBusinessId: businessId }).where(eq(sessions.id, sessionId));
}

export async function logout(db: Db, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash(token)));
}

/** Password baru membatalkan semua sesi lama (mis. HP yang hilang). */
export async function resetPassword(db: Db, token: string, password: string): Promise<boolean> {
  const userId = await consumeToken(db, token, "reset_password");
  if (!userId) return false;
  const passwordHash = await hashPassword(password);
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date(),
        // Membuka link dari email juga membuktikan pemilik email.
        emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())`,
      })
      .where(eq(users.id, userId));
    await tx.delete(sessions).where(eq(sessions.userId, userId));
  });
  return true;
}

export async function findUserIdByEmail(db: Db, email: string): Promise<string | null> {
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizeEmail(email)));
  return row?.id ?? null;
}

/** Dibersihkan berkala: sesi dan token yang sudah kedaluwarsa. */
export async function purgeExpired(db: Db): Promise<void> {
  const now = new Date();
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
  await db.delete(authTokens).where(lt(authTokens.expiresAt, now));
}
