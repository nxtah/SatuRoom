import "server-only";
import { createHash } from "node:crypto";
import { requirePermission, type AcademyContext } from "./context";
import { env } from "./env";
import { AppError } from "./errors";

export const IMAGE_KINDS = ["logo"] as const;
export type ImageKind = (typeof IMAGE_KINDS)[number];
const FORMATS = "jpg,jpeg,png,webp";

const config = () => {
  const e = env();
  if (!e.CLOUDINARY_CLOUD_NAME || !e.CLOUDINARY_API_KEY || !e.CLOUDINARY_API_SECRET) return null;
  return { cloud: e.CLOUDINARY_CLOUD_NAME, key: e.CLOUDINARY_API_KEY, secret: e.CLOUDINARY_API_SECRET };
};

/** Folder per akademi: gambar akademi lain tidak bisa dipasang di sini. */
const folderOf = (ctx: AcademyContext, kind: ImageKind) => `sport/${ctx.businessId}/${kind}`;

/**
 * Tanda tangan upload langsung ke Cloudinary. Secret tidak pernah sampai ke browser; folder dan
 * format ikut ditandatangani, jadi klien tidak bisa menggantinya.
 */
export function signUpload(ctx: AcademyContext, kind: ImageKind) {
  requirePermission(ctx, "academy.update");
  const c = config();
  if (!c) throw new AppError(503, "images_off", "Upload gambar belum diaktifkan. Hubungi admin SatuRoom.");
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = folderOf(ctx, kind);
  const toSign = `allowed_formats=${FORMATS}&folder=${folder}&timestamp=${timestamp}`;
  const signature = createHash("sha1").update(toSign + c.secret).digest("hex");
  return { uploadUrl: `https://api.cloudinary.com/v1_1/${c.cloud}/image/upload`, apiKey: c.key, timestamp, folder, allowedFormats: FORMATS, signature };
}

/** Hanya URL dari akun Cloudinary kita dan folder akademi ini yang diterima. Kosong berarti tanpa gambar. */
export function cleanImageUrl(ctx: AcademyContext, url: string | null | undefined): string | null {
  const value = url?.trim();
  if (!value) return null;
  const c = config();
  const prefix = c ? `https://res.cloudinary.com/${c.cloud}/image/upload/` : null;
  if (!prefix || !value.startsWith(prefix) || !value.includes(`/sport/${ctx.businessId}/`) || value.length > 500) {
    throw new AppError(422, "invalid_image", "Gambar tidak valid. Unggah lewat tombol gambar.");
  }
  return value;
}
