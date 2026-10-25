/** Kesalahan yang aman ditampilkan ke pengguna. Pesan lain disembunyikan dan hanya dicatat di log. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const unauthorized = () => new AppError(401, "unauthorized", "Silakan masuk dulu.");
export const forbidden = () =>
  new AppError(403, "forbidden", "Anda belum punya akses untuk tindakan ini. Minta pemilik akademi memberi izin.");
export const notFound = (what = "Data") => new AppError(404, "not_found", `${what} tidak ditemukan.`);
