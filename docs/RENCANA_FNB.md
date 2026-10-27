# Rencana SatuRoom Rasa (F&B)

## Arah produk
SatuRoom Rasa adalah sistem operasi restoran/kafe: pesanan mengalir dari POS ke dapur, pembayaran, stok, pelanggan, lalu laporan tanpa input ulang.

## Role
- Pemilik: semua cabang, laporan, staf, pengaturan.
- Manajer: operasional, menu, meja, stok, laporan cabang.
- Kasir: POS, pelanggan, pembayaran, refund terbatas.
- Pelayan: meja dan pesanan dine-in.
- Dapur: KDS dan status masak/siap.
- Inventory: bahan, pembelian, vendor, penyesuaian stok.
- Akuntansi: kas, pembayaran, refund, laporan keuangan.

## Fitur inti dan hubungan data
1. Outlet/cabang, meja, staff, shift, pajak, metode bayar.
2. Katalog: kategori, menu, varian, modifier, harga cabang, station dapur, item habis.
3. POS: dine-in, takeaway, pickup, delivery; keranjang, catatan, diskon, pajak, split bill.
4. KDS: tiket per station, baru → diproses → siap → selesai, timer keterlambatan.
5. Pembayaran: tunai/transfer/QRIS manual/kartu manual, kas shift, refund/void beralasan.
6. Stok: bahan, recipe, supplier, pembelian, penerimaan, penyesuaian, stok minimum.
7. Pelanggan: profil minimum dan riwayat pesanan; loyalty ditunda sampai POS stabil.
8. Laporan: penjualan live/tutup hari, produk terlaris, pembatalan, kas, stok, food cost.

Alur wajib: POS → order line → tiket dapur → status siap → pembayaran → kas/laporan; recipe mengurangi stok dan item habis langsung hilang dari POS.

## Database
Schema `fnb` terpisah: outlets, tables, menu_categories, menu_items, item_variants, modifiers, prices, kitchen_stations, orders, order_lines, kitchen_tickets, payments, cash_shifts, customers, ingredients, recipes, stock_movements, suppliers, purchases, purchase_lines.

Semua tabel memiliki `business_id`, FORCE RLS, audit untuk uang/stok/pesanan, dan migrasi baru di `fnb/migrations/`.

## Layout
- HP 390: bottom nav floating: POS, Pesanan, Dapur, Stok, Menu.
- Tablet 820: rail ikon, POS dua panel.
- Desktop 1440: sidebar, POS tiga panel menu/keranjang/pembayaran.
- KDS: teks besar, tombol besar, status tidak hanya dari warna.

## Urutan kerja
1. Foundation: schema fnb, role/izin, outlet, shell responsif.
2. Menu, kategori, harga, station dapur.
3. POS + KDS vertical slice.
4. Pembayaran, shift kasir, refund/void, laporan tutup hari.
5. Stok, recipe, pembelian, item habis otomatis.
6. Pelanggan, loyalty, delivery, analitik lanjutan.

## Riset
Pola dari Square Restaurants: POS cepat, KDS, meja, split bill, item habis otomatis, laporan live, multi-lokasi, shift staf. Peta fitur lengkap harus divalidasi dengan operator F&B lokal.
