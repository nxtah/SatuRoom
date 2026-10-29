import { getSession, login, registerUser, verifyEmail } from "@saturoom/core/auth";
import { describe, expect, it } from "vitest";
import { createAcademy, getAcademy } from "@/server/academy";
import { db } from "@/server/db";
import { academyOf, refresh } from "./helpers";

const pw = "password-rahasia";
const mail = () => `k${Date.now()}${Math.random().toString(36).slice(2, 6)}@contoh.id`;

async function owner() {
  const email = mail();
  const reg = await registerUser(db(), { name: "Pemilik", email, password: pw });
  if (reg.status !== "created") throw new Error("gagal daftar");
  await verifyEmail(db(), reg.verifyToken);
  return { email, userId: reg.userId };
}

describe("masuk dengan ID bisnis", () => {
  it("setiap akademi mendapat ID unik 8 karakter", async () => {
    const a = await academyOf("Akademi A");
    const b = await academyOf("Akademi B");
    const [pa, pb] = await Promise.all([getAcademy(a.ctx), getAcademy(b.ctx)]);
    expect(pa.code).toMatch(/^[A-Z2-9]{8}$/);
    expect(pa.code).not.toBe(pb.code);
  });

  it("satu orang dengan dua akademi membuka akademi sesuai ID yang diketik", async () => {
    const { email, userId } = await owner();
    const first = await login(db(), { email, password: pw, product: "bola" });
    if (first.status !== "ok") throw new Error("gagal masuk");
    const s0 = (await getSession(db(), first.token, "bola"))!;
    const one = await createAcademy(s0, { name: "Satu", city: "Bandung" });
    const two = await createAcademy({ ...s0, userId }, { name: "Dua", city: "Medan" });
    const ctxOf = async (id: string) => (await import("@/server/context")).loadAcademyContext({ ...(await refresh(first)), activeBusinessId: id });
    const [codeOne, codeTwo] = [await getAcademy(await ctxOf(one)), await getAcademy(await ctxOf(two))].map((a) => a.code) as [string, string];

    const inTwo = await login(db(), { email, password: pw, product: "bola", businessCode: `${codeTwo.slice(0, 4)}-${codeTwo.slice(4).toLowerCase()}` });
    if (inTwo.status !== "ok") throw new Error("seharusnya berhasil");
    expect((await getSession(db(), inTwo.token, "bola"))!.activeBusinessId).toBe(two);
    const inOne = await login(db(), { email, password: pw, product: "bola", businessCode: codeOne });
    if (inOne.status !== "ok") throw new Error("seharusnya berhasil");
    expect((await getSession(db(), inOne.token, "bola"))!.activeBusinessId).toBe(one);
  });

  it("ID bisnis orang lain, ID ngawur, atau tanpa ID (padahal sudah punya akademi) ditolak sama saja", async () => {
    const other = await academyOf("Orang Lain");
    const otherCode = (await getAcademy(other.ctx)).code;
    const { email } = await owner();
    const s = (await getSession(db(), (await login(db(), { email, password: pw, product: "bola" }) as { token: string }).token, "bola"))!;
    await createAcademy(s, { name: "Punyaku", city: "Solo" });
    for (const businessCode of [otherCode, "ZZZZZZZZ", "", undefined]) {
      expect((await login(db(), { email, password: pw, product: "bola", businessCode })).status).toBe("invalid");
    }
  });

  it("pengguna baru tanpa akademi boleh masuk tanpa ID", async () => {
    const { email } = await owner();
    expect((await login(db(), { email, password: pw, product: "bola" })).status).toBe("ok");
  });
});
