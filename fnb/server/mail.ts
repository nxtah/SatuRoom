import "server-only";
import nodemailer from "nodemailer";
import { env } from "./env";

let transport: nodemailer.Transporter | undefined;

function transporter() {
  const e = env();
  if (!e.SMTP_HOST) throw new Error("SMTP belum dikonfigurasi");
  return (transport ??= nodemailer.createTransport({
    host: e.SMTP_HOST,
    port: e.SMTP_PORT,
    secure: e.SMTP_PORT === 465,
    auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASS } : undefined,
  }));
}

function layout(title: string, body: string, cta: { label: string; url: string }): string {
  return `<!doctype html><html lang="id"><body style="margin:0;background:#fff4e2;font-family:Arial,sans-serif;color:#2a1a10">
<div style="max-width:480px;margin:0 auto;padding:32px 20px">
<p style="font-weight:800;font-size:18px;margin:0 0 24px">SatuRoom Rasa</p>
<div style="background:#fff;border-radius:24px;padding:28px">
<h1 style="font-size:22px;margin:0 0 12px">${title}</h1>
<p style="font-size:15px;line-height:1.6;color:#4d5a52;margin:0 0 24px">${body}</p>
<a href="${cta.url}" style="display:inline-block;background:#f7cb45;color:#2a1a10;font-weight:700;text-decoration:none;padding:14px 24px;border-radius:999px">${cta.label}</a>
<p style="font-size:13px;color:#4d5a52;margin:24px 0 0">Kalau tombol tidak bisa dibuka, salin link ini ke browser:<br><span style="word-break:break-all">${cta.url}</span></p>
</div>
<p style="font-size:12px;color:#4d5a52;margin:20px 0 0">Abaikan email ini kalau Anda tidak memintanya.</p>
</div></body></html>`;
}

async function send(to: string, subject: string, html: string, text: string) {
  await transporter().sendMail({ from: env().MAIL_FROM, to, subject, html, text });
}

export function sendVerifyEmail(to: string, name: string, token: string) {
  const url = `${env().APP_URL}/verifikasi?token=${encodeURIComponent(token)}`;
  return send(
    to,
    "Konfirmasi email SatuRoom Rasa",
    layout(`Halo, ${escapeHtml(name)}`, "Satu langkah lagi. Konfirmasi email Anda supaya bisa masuk ke SatuRoom Rasa. Link berlaku 48 jam.", { label: "Konfirmasi email", url }),
    `Konfirmasi email Anda: ${url}`,
  );
}

export function sendResetPassword(to: string, token: string) {
  const url = `${env().APP_URL}/atur-password?token=${encodeURIComponent(token)}`;
  return send(
    to,
    "Atur ulang password SatuRoom Rasa",
    layout("Atur ulang password", "Kami menerima permintaan untuk mengganti password Anda. Link berlaku 1 jam dan hanya bisa dipakai sekali.", { label: "Buat password baru", url }),
    `Buat password baru: ${url}`,
  );
}

export function sendStaffInvite(to: string, venueName: string, inviterName: string, roleLabels: string, businessCode: string) {
  const base = env().APP_URL;
  const signup = `${base}/daftar?undangan=1&email=${encodeURIComponent(to)}`;
  const login = `${base}/masuk?undangan=1`;
  const codeHtml = businessCode ? `<p style="margin:0 0 20px;font-size:15px;color:#4d5a52">ID bisnis<br><span style="display:inline-block;margin-top:6px;background:#fff4e2;border-radius:12px;padding:8px 14px;font-size:22px;font-weight:800;letter-spacing:2px;color:#2a1a10">${escapeHtml(businessCode)}</span></p>` : "";
  const html = layout(
    `Anda diundang ke ${escapeHtml(venueName)}`,
    `${escapeHtml(inviterName)} mengundang Anda sebagai ${escapeHtml(roleLabels)} di SatuRoom Rasa. Belum punya akun? Buat akun dengan email ini (${escapeHtml(to)}) dan atur password Anda sendiri, konfirmasi emailnya, lalu terima undangannya. Undangan berlaku 14 hari.`,
    { label: "Buat akun dan terima undangan", url: escapeHtml(signup) },
  ).replace('<a href="', `${codeHtml}<a href="`).replace('<p style="font-size:12px', `<p style="font-size:14px;margin:20px 0 0"><a href="${login}" style="color:#2a1a10;font-weight:700">Sudah punya akun? Masuk</a>. Saat masuk, isi ID bisnis di atas, lalu email dan password Anda.</p><p style="font-size:12px`);
  return send(
    to,
    `Undangan bergabung ke ${venueName}`,
    html,
    `${inviterName} mengundang Anda ke ${venueName} sebagai ${roleLabels}.${businessCode ? ` ID bisnis: ${businessCode}.` : ""} Belum punya akun? Buat akun dengan email ${to} dan atur password Anda: ${signup} . Sudah punya akun? Masuk: ${login}`,
  );
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
