import { BarChart3, BookOpen, Boxes, Building2, ChefHat, ClipboardList, History, Home, Landmark, Layers, Package, Percent, ReceiptText, Settings, ShoppingBasket, Store, TrendingUp, UserCog, UserRound, Users, UtensilsCrossed, Wallet, type LucideIcon } from "lucide-react";

export type NavLeaf = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { label: string; icon: LucideIcon; children: NavLeaf[] };
export type NavEntry = NavLeaf | NavGroup;
export const isGroup = (e: NavEntry): e is NavGroup => "children" in e;

/** Nama menu dibuat sehari-hari. Halaman yang belum dibangun tidak boleh dimasukkan di sini. */
export const NAV: readonly NavEntry[] = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/pos", label: "Kasir", icon: Store },
  { href: "/pesanan", label: "Pesanan", icon: ClipboardList },
  { href: "/dapur", label: "Dapur", icon: ChefHat },
  { label: "Keuangan", icon: Wallet, children: [
    { href: "/kas", label: "Kas dan shift", icon: Landmark },
    { href: "/pengeluaran", label: "Pengeluaran", icon: ReceiptText },
  ] },
  { label: "Laporan", icon: BarChart3, children: [
    { href: "/laporan", label: "Ringkasan laporan", icon: TrendingUp },
  ] },
  { label: "Produk", icon: UtensilsCrossed, children: [
    { href: "/produk/kategori", label: "Kategori", icon: Layers },
    { href: "/produk/menu", label: "Menu", icon: BookOpen },
    { href: "/produk/addon", label: "Add-on dan varian", icon: Boxes },
  ] },
  { href: "/promo", label: "Diskon dan voucher", icon: Percent },
  { label: "Inventaris", icon: Package, children: [
    { href: "/stok", label: "Daftar bahan", icon: Package },
    { href: "/pembelian", label: "Pembelian", icon: ShoppingBasket },
  ] },
  { label: "Bisnis", icon: Building2, children: [
    { href: "/staf", label: "Pegawai", icon: Users },
    { href: "/peran", label: "Peran dan izin", icon: UserCog },
    { href: "/pelanggan", label: "Pelanggan", icon: UserRound },
    { href: "/audit", label: "Jejak aktivitas", icon: History },
    { href: "/pengaturan", label: "Pengaturan", icon: Settings },
  ] },
];
