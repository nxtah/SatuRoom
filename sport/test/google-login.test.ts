import type { GoogleConfig } from "@saturoom/core/google";
import { profileFromClaims, startGoogle } from "@saturoom/core/google";
import { getSession, isEmailVerified, login, loginWithGoogle, registerUser } from "@saturoom/core/auth";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { acceptInvitation, inviteStaff, myInvitations } from "@/server/staff";
import { acceptPlayerInvitation, invitePlayerAccount, myPlayerInvitations } from "@/server/player-account";
import { createPlayer } from "@/server/players";
import { createTeam } from "@/server/teams";
import { academyOf } from "./helpers";

const cfg: GoogleConfig = { clientId: "klien-123456789", clientSecret: "rahasia-123456789", redirectUri: "http://x/cb" };
const mail = () => `g${Date.now()}${Math.random().toString(36).slice(2, 6)}@contoh.id`;
const claims = (over: Record<string, unknown> = {}) => ({
  iss: "https://accounts.google.com", aud: cfg.clientId, nonce: "n1", exp: Math.floor(Date.now() / 1000) + 600,
  email_verified: true, sub: "sub-1", email: "a@contoh.id", name: "Andi", ...over,
});

describe("awal Google", () => {
  it("memakai PKCE, state, nonce, dan hanya meminta email dan profil", () => {
    const { url, handshake } = startGoogle(cfg, "/undangan");
    const q = new URL(url).searchParams;
    expect(new URL(url).origin).toBe("https://accounts.google.com");
    expect(q.get("scope")).toBe("openid email profile");
    expect(q.get("state")).toBe(handshake.state);
    expect(q.get("nonce")).toBe(handshake.nonce);
    expect(q.get("code_challenge_method")).toBe("S256");
    expect(q.get("code_challenge")).not.toBe(handshake.verifier);
    expect(q.get("redirect_uri")).toBe(cfg.redirectUri);
    expect(handshake.next).toBe("/undangan");
  });
});

describe("klaim Google", () => {
  it("menerima klaim sah dan menolak yang salah penerbit, penerima, nonce, kedaluwarsa, atau email belum terverifikasi", () => {
    expect(profileFromClaims(claims(), cfg, "n1")).toEqual({ sub: "sub-1", email: "a@contoh.id", name: "Andi" });
    for (const bad of [
      { iss: "https://evil.example" }, { aud: "klien-lain" }, { nonce: "lain" }, { exp: 1 }, { email_verified: false }, { sub: undefined },
    ]) {
      expect(() => profileFromClaims(claims(bad), cfg, "n1")).toThrow("GOOGLE_INVALID");
    }
  });
});

describe("masuk dengan Google", () => {
  it("membuat akun baru yang langsung terverifikasi, lalu masuk lagi ke akun yang sama", async () => {
    const email = mail();
    const first = await loginWithGoogle(db(), { sub: `s-${email}`, email, name: "Andi" }, "bola");
    expect(first.created).toBe(true);
    expect(await isEmailVerified(db(), first.userId)).toBe(true);
    expect((await getSession(db(), first.token, "bola"))?.email).toBe(email);
    const again = await loginWithGoogle(db(), { sub: `s-${email}`, email: "ganti@contoh.id", name: "Andi" }, "bola");
    expect(again).toMatchObject({ created: false, userId: first.userId });
    // Akun Google tidak bisa dimasuki dengan password tebakan.
    expect((await login(db(), { email, password: "password-rahasia", product: "bola" })).status).toBe("invalid");
  });

  it("menautkan ke akun email yang sudah ada dan membuang password yang belum terbukti (anti pengambilalihan)", async () => {
    const email = mail();
    const reg = await registerUser(db(), { name: "Korban", email, password: "password-penyerang" });
    if (reg.status !== "created") throw new Error();
    const attackerSession = await login(db(), { email, password: "password-penyerang", product: "bola" });
    if (attackerSession.status !== "ok") throw new Error();

    const res = await loginWithGoogle(db(), { sub: `s-${email}`, email, name: "Korban" }, "bola");
    expect(res).toMatchObject({ created: false, userId: reg.userId });
    expect(await isEmailVerified(db(), reg.userId)).toBe(true);
    expect((await login(db(), { email, password: "password-penyerang", product: "bola" })).status).toBe("invalid");
    expect(await getSession(db(), attackerSession.token, "bola")).toBeNull();
  });

  it("akun email yang sudah terbukti tetap bisa masuk dengan password setelah tertaut", async () => {
    const email = mail();
    const reg = await registerUser(db(), { name: "Sari", email, password: "password-rahasia" });
    if (reg.status !== "created") throw new Error();
    const { verifyEmail } = await import("@saturoom/core/auth");
    await verifyEmail(db(), reg.verifyToken);
    await loginWithGoogle(db(), { sub: `s-${email}`, email, name: "Sari" }, "bola");
    expect((await login(db(), { email, password: "password-rahasia", product: "bola" })).status).toBe("ok");
  });

  it("email yang sudah tertaut ke Google lain tidak ditimpa", async () => {
    const email = mail();
    await loginWithGoogle(db(), { sub: `a-${email}`, email, name: "A" }, "bola");
    await expect(loginWithGoogle(db(), { sub: `b-${email}`, email, name: "B" }, "bola")).rejects.toThrow("GOOGLE_CONFLICT");
  });
});

describe("undangan butuh email terbukti", () => {
  it("akun email-password yang belum dikonfirmasi tidak melihat dan tidak bisa menerima undangan", async () => {
    const a = await academyOf("Garuda");
    const email = mail();
    const reg = await registerUser(db(), { name: "Calon", email, password: "password-rahasia" });
    if (reg.status !== "created") throw new Error();
    const res = await login(db(), { email, password: "password-rahasia", product: "bola" });
    if (res.status !== "ok") throw new Error();
    const session = (await getSession(db(), res.token, "bola"))!;

    await inviteStaff(a.ctx, { email, roles: ["coach"], teamIds: [] });
    const team = await createTeam(a.ctx, { name: "U-10", ageMin: null, ageMax: null });
    const pid = await createPlayer(a.ctx, { fullName: "Raka", birthDate: "2015-03-14", teamIds: [team] });
    await invitePlayerAccount(a.ctx, pid, email);
    expect(await myInvitations(reg.userId)).toEqual([]);
    expect(await myPlayerInvitations(reg.userId)).toEqual([]);

    await expect(acceptInvitation(session, "00000000-0000-4000-8000-000000000000")).rejects.toMatchObject({ code: "email_unverified" });
    await expect(acceptPlayerInvitation(session, "00000000-0000-4000-8000-000000000000", "Ibu")).rejects.toMatchObject({ code: "email_unverified" });

    // Setelah login Google dengan email yang sama, undangan terbuka.
    await loginWithGoogle(db(), { sub: `s-${email}`, email, name: "Calon" }, "bola");
    expect(await myInvitations(reg.userId)).toHaveLength(1);
    expect(await myPlayerInvitations(reg.userId)).toHaveLength(1);
  });
});
