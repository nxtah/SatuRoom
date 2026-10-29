// Alamat aplikasi. Bisa diganti lewat env saat deploy (mis. staging).
export const BOLA_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://sport.saturoom.com";
export const MAHJONG_URL = process.env.NEXT_PUBLIC_MAHJONG_URL ?? "https://mahjong.saturoom.com";
export const RASA_URL = process.env.NEXT_PUBLIC_RASA_URL ?? "https://rasa.saturoom.com";

// Kontak publik belum ditentukan pemilik; bagian kontak hanya tampil bila diisi.
export const CONTACT_EMAIL: string | undefined = process.env.NEXT_PUBLIC_CONTACT_EMAIL || undefined;
