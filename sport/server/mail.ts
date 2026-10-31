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
<p style="font-weight:800;font-size:18px;margin:0 0 24px">SatuRoom Sport</p>
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
    "Konfirmasi email SatuRoom Sport",
    layout(`Halo, ${escapeHtml(name)}`, "Satu langkah lagi. Konfirmasi email Anda supaya bisa masuk ke SatuRoom Sport. Link berlaku 48 jam.", { label: "Konfirmasi email", url }),
    `Konfirmasi email Anda: ${url}`,
  );
}

export function sendResetPassword(to: string, token: string) {
  const url = `${env().APP_URL}/atur-password?token=${encodeURIComponent(token)}`;
  return send(
    to,
    "Atur ulang password SatuRoom Sport",
    layout("Atur ulang password", "Kami menerima permintaan untuk mengganti password Anda. Link berlaku 1 jam dan hanya bisa dipakai sekali.", { label: "Buat password baru", url }),
    `Buat password baru: ${url}`,
  );
}

/** Kotak ID bisnis, tombol daftar, dan tautan masuk untuk email undangan. */
function inviteHtml(title: string, body: string, to: string, businessCode: string, ctaLabel: string): { html: string; signup: string; login: string } {
  const base = env().APP_URL;
  const signup = `${base}/daftar?undangan=1&email=${encodeURIComponent(to)}`;
  const login = `${base}/masuk?lanjut=undangan`;
  const codeHtml = businessCode
    ? `<p style="margin:0 0 20px;font-size:15px;color:#4d5a52">ID bisnis<br><span style="display:inline-block;margin-top:6px;background:#fff1e3;border-radius:12px;padding:8px 14px;font-size:22px;font-weight:800;letter-spacing:2px;color:#17201b">${escapeHtml(businessCode)}</span></p>`
    : "";
  const html = layout(title, body, { label: ctaLabel, url: escapeHtml(signup) })
    .replace('<a href="', `${codeHtml}<a href="`)
    .replace(
      '<p style="font-size:12px',
      `<p style="font-size:14px;margin:20px 0 0"><a href="${login}" style="color:#17201b;font-weight:700">Sudah punya akun? Masuk</a>. Saat masuk, ID bisnis boleh dikosongkan, lalu isi email dan password Anda.</p><p style="font-size:12px`,
    );
  return { html, signup, login };
}

export function sendStaffInvite(to: string, academyName: string, inviterName: string, roleLabels: string, businessCode = "") {
  const { html, signup, login } = inviteHtml(
    `Anda diundang ke ${escapeHtml(academyName)}`,
    `${escapeHtml(inviterName)} mengundang Anda sebagai ${escapeHtml(roleLabels)} di SatuRoom Sport. Belum punya akun? Buat akun dengan email ini (${escapeHtml(to)}) dan atur password Anda sendiri, lalu terima undangannya. Undangan berlaku 14 hari.`,
    to,
    businessCode,
    "Buat akun dan terima undangan",
  );
  return send(
    to,
    `Undangan bergabung ke ${academyName}`,
    html,
    `${inviterName} mengundang Anda ke ${academyName} sebagai ${roleLabels}.${businessCode ? ` ID bisnis: ${businessCode}.` : ""} Belum punya akun? Buat akun dengan email ${to} dan atur password Anda: ${signup} . Sudah punya akun? Masuk: ${login}`,
  );
}

export function sendPlayerInvite(to: string, academyName: string, playerName: string, businessCode = "") {
  const { html, signup, login } = inviteHtml(
    `Akun pemain untuk ${escapeHtml(playerName)}`,
    `${escapeHtml(academyName)} membuatkan akun pemain untuk ${escapeHtml(playerName)}. Dari akun ini bisa dilihat jadwal latihan, mengirim izin atau sakit, kehadiran, dan status iuran. Belum punya akun? Buat akun dengan email ini (${escapeHtml(to)}) dan atur password Anda, lalu terima undangannya. Bila pemain di bawah 18 tahun, undangan diterima oleh atau dengan izin orang tua/wali. Undangan berlaku 14 hari.`,
    to,
    businessCode,
    "Buat akun dan buka undangan",
  );
  return send(
    to,
    `Akun pemain ${playerName} di ${academyName}`,
    html,
    `${academyName} membuatkan akun pemain untuk ${playerName}.${businessCode ? ` ID bisnis: ${businessCode}.` : ""} Belum punya akun? Buat akun dengan email ${to}: ${signup} . Sudah punya akun? Masuk: ${login}`,
  );
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
