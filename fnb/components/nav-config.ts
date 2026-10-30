import { QrCode, ArrowLeftRight, Printer, Armchair, Banknote, BarChart3, Clock, FileText, HandCoins, Trash2, BookOpen, Boxes, Building2, ChefHat, ClipboardList, History, Home, Landmark, Layers, ListOrdered, Package, Percent, ReceiptText, Settings, ShoppingBasket, Store, TrendingUp, UserCog, UserRound, Users, UtensilsCrossed, Wallet, type LucideIcon } from "lucide-react";

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
    { href: "/riwayat", label: "Riwayat transaksi", icon: History },
    { href: "/pengeluaran", label: "Pengeluaran", icon: ReceiptText },
    { href: "/payout", label: "Payout", icon: HandCoins },
  ] },
  { label: "Laporan", icon: BarChart3, children: [
    { href: "/laporan", label: "Ringkasan harian", icon: TrendingUp },
    { href: "/laporan/penjualan", label: "Rincian penjualan", icon: FileText },
    { href: "/laporan/produk", label: "Penjualan per produk", icon: UtensilsCrossed },
    { href: "/laporan/penerimaan", label: "Rincian penerimaan", icon: HandCoins },
    { href: "/laporan/kategori", label: "Penjualan per kategori", icon: Layers },
    { href: "/laporan/tipe-pesanan", label: "Tipe pesanan", icon: ListOrdered },
    { href: "/laporan/diskon-pajak", label: "Diskon, pajak, biaya lain", icon: Percent },
    { href: "/laporan/pemakaian-bahan", label: "Penggunaan barang", icon: Boxes },
    { href: "/laporan/shift", label: "Riwayat shift", icon: Clock },
    { href: "/laporan/kas", label: "Pencatatan kas", icon: Banknote },
    { href: "/laporan/dibatalkan", label: "Pesanan dihapus", icon: Trash2 },
  ] },
  { label: "Produk", icon: UtensilsCrossed, children: [
    { href: "/produk/kategori", label: "Kategori", icon: Layers },
    { href: "/produk/menu", label: "Menu", icon: BookOpen },
    { href: "/produk/addon", label: "Add-on dan varian", icon: Boxes },
  ] },
  { href: "/promo", label: "Diskon dan voucher", icon: Percent },
  { href: "/tipe-pesanan", label: "Tipe pesanan", icon: ListOrdered },
  { label: "Inventaris", icon: Package, children: [
    { href: "/stok", label: "Daftar bahan", icon: Package },
    { href: "/transfer-stok", label: "Transfer stok", icon: ArrowLeftRight },
    { href: "/pembelian", label: "Pembelian", icon: ShoppingBasket },
  ] },
  { label: "Akses pengguna", icon: UserCog, children: [
    { href: "/staf", label: "Pegawai", icon: Users },
    { href: "/peran", label: "Peran dan izin", icon: UserCog },
  ] },
  { label: "Manajemen bisnis", icon: Building2, children: [
    { href: "/cabang", label: "Cabang", icon: Store },
    { href: "/cabang/barang", label: "Barang per cabang", icon: Boxes },
    { href: "/pelanggan", label: "Pelanggan", icon: UserRound },
    { href: "/grup-meja", label: "Meja dan grup meja", icon: Armchair },
    { href: "/menu-digital", label: "Menu digital (QR)", icon: QrCode },
    { href: "/pengaturan-struk", label: "Struk", icon: ReceiptText },
    { href: "/printer", label: "Manajemen printer", icon: Printer },
    { href: "/audit", label: "Jejak aktivitas", icon: History },
    { href: "/pengaturan", label: "Pengaturan", icon: Settings },
  ] },
];
