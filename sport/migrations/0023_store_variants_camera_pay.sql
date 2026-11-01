-- Topik latihan per sesi, toko lengkap (kategori, varian dengan stok sendiri, isian kustom seperti nomor punggung),
-- absen kerja dengan foto dan lokasi, izin memantau absensi per staf, dan gaji berdasarkan absensi.

-- ---------- Topik dan rencana latihan ----------
ALTER TABLE bola.sessions ADD COLUMN topic text CHECK (topic IS NULL OR length(topic) <= 120);
ALTER TABLE bola.sessions ADD COLUMN plan text CHECK (plan IS NULL OR length(plan) <= 3000);
ALTER TABLE bola.sessions ADD COLUMN plan_by uuid REFERENCES core.users(id) ON DELETE SET NULL;
ALTER TABLE bola.schedules ADD COLUMN topic text CHECK (topic IS NULL OR length(topic) <= 120);

-- ---------- Toko ----------
ALTER TABLE bola.items ADD COLUMN category text CHECK (category IS NULL OR length(category) <= 40);
-- [{label, required, kind: text|number, max}] mis. Nomor punggung, Nama punggung.
ALTER TABLE bola.items ADD COLUMN custom_fields jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(custom_fields) = 'array');

CREATE TABLE bola.item_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  item_id uuid NOT NULL,
  label text NOT NULL CHECK (length(btrim(label)) BETWEEN 1 AND 40),
  qty integer NOT NULL DEFAULT 0 CHECK (qty >= 0),
  -- Tambahan harga untuk varian ini (mis. ukuran XXL +10.000).
  extra_price integer NOT NULL DEFAULT 0 CHECK (extra_price BETWEEN 0 AND 10000000),
  position smallint NOT NULL DEFAULT 0,
  archived_at timestamptz,
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, item_id) REFERENCES bola.items (business_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX item_variants_label ON bola.item_variants (item_id, lower(btrim(label))) WHERE archived_at IS NULL;
SELECT bola.enable_tenant_rls('bola.item_variants');

ALTER TABLE bola.stock_moves ADD COLUMN variant_id uuid REFERENCES bola.item_variants(id);
ALTER TABLE bola.purchase_lines ADD COLUMN variant_id uuid REFERENCES bola.item_variants(id);
ALTER TABLE bola.order_lines ADD COLUMN variant_id uuid REFERENCES bola.item_variants(id);
ALTER TABLE bola.order_lines ADD COLUMN variant_label text CHECK (variant_label IS NULL OR length(variant_label) <= 40);
-- {"Nomor punggung": "10", "Nama punggung": "RAKA"}
ALTER TABLE bola.order_lines ADD COLUMN custom jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(custom) = 'object');

-- ---------- Absen kerja dengan foto dan lokasi ----------
ALTER TABLE bola.staff_clock ADD COLUMN in_photo text CHECK (in_photo IS NULL OR length(in_photo) <= 500);
ALTER TABLE bola.staff_clock ADD COLUMN in_lat double precision CHECK (in_lat IS NULL OR in_lat BETWEEN -90 AND 90);
ALTER TABLE bola.staff_clock ADD COLUMN in_lng double precision CHECK (in_lng IS NULL OR in_lng BETWEEN -180 AND 180);
ALTER TABLE bola.staff_clock ADD COLUMN in_accuracy integer;
ALTER TABLE bola.staff_clock ADD COLUMN out_photo text CHECK (out_photo IS NULL OR length(out_photo) <= 500);
ALTER TABLE bola.staff_clock ADD COLUMN out_lat double precision CHECK (out_lat IS NULL OR out_lat BETWEEN -90 AND 90);
ALTER TABLE bola.staff_clock ADD COLUMN out_lng double precision CHECK (out_lng IS NULL OR out_lng BETWEEN -180 AND 180);
ALTER TABLE bola.staff_clock ADD COLUMN out_accuracy integer;
ALTER TABLE bola.academy_settings ADD COLUMN clock_photo_required boolean NOT NULL DEFAULT true;

-- Staf yang diberi izin memantau absensi kerja oleh admin/pemilik (mis. kepala pelatih).
CREATE TABLE bola.attendance_monitors (
  membership_id uuid PRIMARY KEY REFERENCES core.memberships(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
SELECT bola.enable_tenant_rls('bola.attendance_monitors');

-- ---------- Gaji berdasarkan absensi ----------
ALTER TABLE bola.pay_profiles ADD COLUMN pay_mode text NOT NULL DEFAULT 'monthly' CHECK (pay_mode IN ('monthly', 'attendance'));
ALTER TABLE bola.pay_profiles ADD COLUMN per_day integer NOT NULL DEFAULT 0 CHECK (per_day BETWEEN 0 AND 100000000);
ALTER TABLE bola.pay_profiles ADD COLUMN per_hour integer NOT NULL DEFAULT 0 CHECK (per_hour BETWEEN 0 AND 100000000);
