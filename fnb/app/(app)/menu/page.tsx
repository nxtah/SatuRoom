import { redirect } from "next/navigation";

/** Alamat lama; menu kini ada di bagian Produk. */
export default function MenuRedirect() {
  redirect("/produk/menu");
}
