import { describe, expect, it } from "vitest";
import { getSession, login, registerUser, verifyEmail } from "@saturoom/core/auth";
import { formatBusinessCode } from "@/lib/business-code";
import { getAcademy } from "@/server/academy";
import { loadAcademyContext } from "@/server/context";
import { db } from "@/server/db";
import { acceptInvitation, inviteStaff, myInvitations } from "@/server/staff";
import { academyOf } from "./helpers";

const MAILPIT = "http://127.0.0.1:8026";

describe("email undangan staf", () => {
  it("memuat ID bisnis dan tautan daftar; penerima daftar sendiri, terima, lalu masuk dengan ID bisnis", async () => {
    const a = await academyOf(`Akademi Undang ${Math.random()}`);
    const code = formatBusinessCode((await getAcademy(a.ctx)).code);
    const email = `pelatih${Date.now()}@contoh.id`;

    await inviteStaff(a.ctx, { email, roles: ["coach"], teamIds: [] });

    const list = (await (await fetch(`${MAILPIT}/api/v1/messages`)).json()) as { messages: { ID: string; To: { Address: string }[] }[] };
    const mail = list.messages.find((m) => m.To.some((t) => t.Address === email));
    expect(mail).toBeTruthy();
    const full = (await (await fetch(`${MAILPIT}/api/v1/message/${mail!.ID}`)).json()) as { HTML: string; Text: string };
    expect(full.HTML).toContain(code);
    expect(full.Text).toContain(code);
    expect(full.HTML).toContain(`/daftar?undangan=1&amp;email=${encodeURIComponent(email)}`);
    expect(full.HTML).toContain("/masuk?lanjut=undangan");

    const reg = await registerUser(db(), { name: "Calon Pelatih", email, password: "password-pilihan-saya" });
    if (reg.status !== "created") throw new Error("gagal daftar");
    await verifyEmail(db(), reg.verifyToken);
    const invites = await myInvitations(reg.userId);
    expect(invites).toHaveLength(1);

    const res = await login(db(), { email, password: "password-pilihan-saya", product: "bola" });
    if (res.status !== "ok") throw new Error("gagal masuk");
    const session = (await getSession(db(), res.token, "bola"))!;
    expect(await acceptInvitation(session, invites[0]!.id)).toBe(a.id);
    const ctx = await loadAcademyContext({ ...session, activeBusinessId: a.id });
    expect(ctx.roles).toEqual(["coach"]);

    expect((await login(db(), { email, password: "password-pilihan-saya", product: "bola", businessCode: code })).status).toBe("ok");
    expect((await login(db(), { email, password: "salah-salah-salah", product: "bola", businessCode: code })).status).toBe("invalid");
  });
});
