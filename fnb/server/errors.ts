/** Kesalahan yang aman ditampilkan ke pengguna. Pesan lain disembunyikan dan hanya dicatat di log. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const forbidden = () => new AppError(403, "forbidden", "Anda belum punya izin untuk tindakan ini. Minta pemilik memberi izin.");
export const notFound = (what = "Data") => new AppError(404, "not_found", `${what} tidak ditemukan.`);
