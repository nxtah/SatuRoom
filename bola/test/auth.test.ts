import {
  getSession,
  issueToken,
  login,
  logout,
  registerUser,
  resetPassword,
  isEmailVerified,
  verifyEmail,
} from "@saturoom/core/auth";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";

const pw = "password-rahasia";
const mail = () => `a${Date.now()}${Math.random().toString(36).slice(2, 6)}@contoh.id`;

describe("akun dan sesi", () => {
  it("bisa masuk tanpa konfirmasi; email terbukti setelah link dipakai", async () => {
    const email = mail();
    const reg = await registerUser(db(), { name: "Sari", email, password: pw });
    expect(reg.status).toBe("created");
    expect((await login(db(), { email, password: pw, product: "bola" })).status).toBe("ok");
    if (reg.status !== "created") return;
    expect(await isEmailVerified(db(), reg.userId)).toBe(false);
    expect(await verifyEmail(db(), reg.verifyToken)).toBe(true);
    expect(await isEmailVerified(db(), reg.userId)).toBe(true);
    // Link konfirmasi hanya sekali pakai.
    expect(await verifyEmail(db(), reg.verifyToken)).toBe(false);
    const res = await login(db(), { email: email.toUpperCase(), password: pw, product: "bola" });
    expect(res.status).toBe("ok");
  });

  it("email yang sama tidak bisa didaftarkan dua kali dan tidak dibedakan di jawaban", async () => {
    const email = mail();
    await registerUser(db(), { name: "A", email, password: pw });
    expect((await registerUser(db(), { name: "B", email, password: pw })).status).toBe("exists");
  });

  it("password salah dan email tak dikenal sama-sama 'invalid'", async () => {
    const email = mail();
    const reg = await registerUser(db(), { name: "A", email, password: pw });
    if (reg.status === "created") await verifyEmail(db(), reg.verifyToken);
    expect((await login(db(), { email, password: "salah-sekali", product: "bola" })).status).toBe("invalid");
    expect((await login(db(), { email: mail(), password: pw, product: "bola" })).status).toBe("invalid");
  });

  it("keluar membatalkan sesi; sesi produk lain tidak berlaku di bola", async () => {
    const email = mail();
    const reg = await registerUser(db(), { name: "A", email, password: pw });
    if (reg.status === "created") await verifyEmail(db(), reg.verifyToken);
    const res = await login(db(), { email, password: pw, product: "bola" });
    if (res.status !== "ok") throw new Error();
    expect(await getSession(db(), res.token, "bola")).not.toBeNull();
    expect(await getSession(db(), res.token, "fnb")).toBeNull();
    await logout(db(), res.token);
    expect(await getSession(db(), res.token, "bola")).toBeNull();
  });

  it("reset password mengganti password, mengeluarkan semua sesi, dan link hanya sekali pakai", async () => {
    const email = mail();
    const reg = await registerUser(db(), { name: "A", email, password: pw });
    if (reg.status !== "created") throw new Error();
    await verifyEmail(db(), reg.verifyToken);
    const res = await login(db(), { email, password: pw, product: "bola" });
    if (res.status !== "ok") throw new Error();
    const token = await issueToken(db(), reg.userId, "reset_password");
    expect(await resetPassword(db(), token, "password-baru-123")).toBe(true);
    expect(await resetPassword(db(), token, "lagi-lagi-123")).toBe(false);
    expect(await getSession(db(), res.token, "bola")).toBeNull();
    expect((await login(db(), { email, password: pw, product: "bola" })).status).toBe("invalid");
    expect((await login(db(), { email, password: "password-baru-123", product: "bola" })).status).toBe("ok");
  });

  it("link lama tidak berlaku setelah link baru diminta", async () => {
    const email = mail();
    const reg = await registerUser(db(), { name: "A", email, password: pw });
    if (reg.status !== "created") throw new Error();
    const newer = await issueToken(db(), reg.userId, "verify_email");
    expect(await verifyEmail(db(), reg.verifyToken)).toBe(false);
    expect(await verifyEmail(db(), newer)).toBe(true);
  });
});
