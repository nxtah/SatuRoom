/** Sisipkan transformasi Cloudinary (potong persegi, kompres, format otomatis) pada URL gambar kita. */
export function thumb(url: string | null | undefined, size = 160): string | null {
  if (!url) return null;
  return url.replace("/image/upload/", `/image/upload/c_fill,w_${size},h_${size},q_auto,f_auto/`);
}
