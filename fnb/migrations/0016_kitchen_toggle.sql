-- Dapur bisa dimatikan untuk usaha tanpa alur dapur: pesanan baru langsung berstatus disajikan.
ALTER TABLE fnb.settings ADD COLUMN kitchen_enabled boolean NOT NULL DEFAULT true;
