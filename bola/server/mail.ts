import "server-only";
import nodemailer from "nodemailer";
import { env } from "./env";

let transport: nodemailer.Transporter | undefined;

function transporter() {
  const e = env();
  return (transport ??= nodemailer.createTransport({
    host: e.SMTP_HOST,
    port: e.SMTP_PORT,
    secure: e.SMTP_PORT === 465,
    auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASS } : undefined,
  }));
}

function layout(title: string, body: string, cta: { label: string; url: string }): string {
  return `<!doctype html><html lang="id"><body style="margin:0;background:#f1f4f0;font-family:Arial,sans-serif;color:#17201b">
<div style="max-width:480px;margin:0 auto;padding:32px 20px">
<p style="font-weight:800;font-size:18px;margin:0 0 24px">SatuRoom Bola</p>
<div style="background:#fff;border-radius:24px;padding:28px">
<h1 style="font-size:22px;margin:0 0 12px">${title}</h1>
<p style="font-size:15px;line-height:1.6;color:#4d5a52;margin:0 0 24px">${body}</p>
<a href="${cta.url}" style="display:inline-block;background:#ff6a00;color:#17201b;font-weight:700;text-decoration:none;padding:14px 24px;border-radius:999px">${cta.label}</a>
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
    "Konfirmasi email SatuRoom Bola",
    layout(`Halo, ${escapeHtml(name)}`, "Satu langkah lagi. Konfirmasi email Anda supaya bisa masuk ke SatuRoom Bola. Link berlaku 48 jam.", { label: "Konfirmasi email", url }),
    `Konfirmasi email Anda: ${url}`,
  );
}

export function sendResetPassword(to: string, token: string) {
  const url = `${env().APP_URL}/atur-password?token=${encodeURIComponent(token)}`;
  return send(
    to,
    "Atur ulang password SatuRoom Bola",
    layout("Atur ulang password", "Kami menerima permintaan untuk mengganti password Anda. Link berlaku 1 jam dan hanya bisa dipakai sekali.", { label: "Buat password baru", url }),
    `Buat password baru: ${url}`,
  );
}

export function sendStaffInvite(to: string, academyName: string, inviterName: string, roleLabels: string) {
  const url = `${env().APP_URL}/undangan`;
  return send(
    to,
    `Undangan bergabung ke ${academyName}`,
    layout(
      `Anda diundang ke ${escapeHtml(academyName)}`,
      `${escapeHtml(inviterName)} mengundang Anda sebagai ${escapeHtml(roleLabels)} di SatuRoom Bola. Masuk atau daftar dengan email ini (${escapeHtml(to)}), lalu terima undangannya. Undangan berlaku 14 hari.`,
      { label: "Lihat undangan", url },
    ),
    `${inviterName} mengundang Anda ke ${academyName} sebagai ${roleLabels}. Masuk atau daftar dengan email ${to}: ${url}`,
  );
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
