// Alamat aplikasi bola. Bisa diganti lewat env saat deploy (mis. staging).
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://bola.saturoom.com";

// Kontak publik belum ditentukan pemilik; bagian kontak hanya tampil bila diisi.
export const CONTACT_EMAIL: string | undefined = process.env.NEXT_PUBLIC_CONTACT_EMAIL || undefined;
