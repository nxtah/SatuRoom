/* eslint-disable @next/next/no-img-element */
/** Gambar dari Cloudinary yang sudah diperkecil lewat `thumb`; tidak perlu optimasi next/image. */
export function Img(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  return <img alt="" {...props} />;
}
