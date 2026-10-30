import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { login, registerUser, verifyEmail } from "@saturoom/core/auth";
import { db } from "@/server/db";
import { acceptInvitation, inviteStaff, myInvitations } from "@/server/invitations";
import { getFnbBusinessCode } from "@/server/business";
import { loadContext, can } from "@/server/context";
import { getSession } from "@saturoom/core/auth";
import { formatBusinessCode } from "@/lib/business-code";
import { businessOf } from "./helpers";

const MAILPIT = "http://127.0.0.1:8026";

describe("email undangan dan alur penerima", () => {
  beforeAll(() => {
    vi.stubEnv("SMTP_HOST", "127.0.0.1");
    vi.stubEnv("SMTP_PORT", "1026");
    vi.resetModules();
  });
  afterAll(() => vi.unstubAllEnvs());

  it("email memuat ID bisnis dan tautan daftar; penerima daftar sendiri, terima undangan, dan masuk dengan ID bisnis", async () => {
    const biz = await businessOf(`Kafe Undang ${Math.random()}`);
    const code = formatBusinessCode(await getFnbBusinessCode(biz.ctx));
    const email = `calon${Date.now()}@contoh.id`;

    // Pemilik mengundang email yang BELUM punya akun.
    const { inviteStaff: invite } = await import("@/server/invitations");
    const sent = await invite(biz.ctx, { email, roles: ["cashier"], customRoleIds: [] });
    expect(sent.emailSent).toBe(true);

    const list = (await (await fetch(`${MAILPIT}/api/v1/messages`)).json()) as { messages: { ID: string; To: { Address: string }[] }[] };
    const mail = list.messages.find((m) => m.To.some((t) => t.Address === email))!;
    expect(mail).toBeTruthy();
    const full = (await (await fetch(`${MAILPIT}/api/v1/message/${mail.ID}`)).json()) as { HTML: string; Text: string; Subject: string };
    expect(full.HTML).toContain(code);
    expect(full.Text).toContain(code);
    expect(full.HTML).toContain(`/daftar?undangan=1&amp;email=${encodeURIComponent(email)}`);
    expect(full.HTML).toContain("/masuk?undangan=1");

    // Penerima membuat akun sendiri dengan password pilihannya, lalu konfirmasi email.
    const reg = await registerUser(db(), { name: "Calon Kasir", email, password: "password-pilihan-saya" });
    if (reg.status !== "created") throw new Error("gagal daftar");
    expect(await myInvitations(reg.userId)).toHaveLength(0); // belum terkonfirmasi: undangan belum terlihat
    await verifyEmail(db(), reg.verifyToken);
    const invites = await myInvitations(reg.userId);
    expect(invites).toHaveLength(1);

    // Masuk dengan ID bisnis + email + password yang tadi dibuat, lalu terima.
    const res = await login(db(), { email, password: "password-pilihan-saya", product: "fnb" });
    if (res.status !== "ok") throw new Error("gagal masuk");
    const session = (await getSession(db(), res.token, "fnb"))!;
    expect(await acceptInvitation(session, invites[0]!.id)).toBe(biz.id);
    const ctx = (await loadContext({ ...session, activeBusinessId: biz.id }))!;
    expect(can(ctx, "orders.sell")).toBe(true);
    expect(can(ctx, "staff.manage")).toBe(false);

    // Password tersimpan: masuk ulang berhasil, password salah ditolak.
    // Setelah punya bisnis, masuk wajib memakai ID bisnis (yang tertulis di email undangan).
    expect((await login(db(), { email, password: "password-pilihan-saya", product: "fnb" })).status).toBe("invalid");
    expect((await login(db(), { email, password: "password-pilihan-saya", product: "fnb", businessCode: code })).status).toBe("ok");
    expect((await login(db(), { email, password: "salah-salah-salah", product: "fnb", businessCode: code })).status).toBe("invalid");
  });
});
