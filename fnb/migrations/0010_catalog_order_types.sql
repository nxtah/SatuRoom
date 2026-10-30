-- Katalog lengkap (SKU, HPP, stok, gambar), tipe pesanan, dan grup meja.
ALTER TABLE fnb.menu_categories
  ADD COLUMN image_url text CHECK (image_url IS NULL OR length(image_url) <= 500),
  ADD COLUMN description text CHECK (description IS NULL OR length(description) <= 200),
  ADD COLUMN is_active boolean NOT NULL DEFAULT true;

ALTER TABLE fnb.menu_items
  ADD COLUMN sku text CHECK (sku IS NULL OR sku ~ '^[A-Za-z0-9._-]{1,40}$'),
  ADD COLUMN barcode text CHECK (barcode IS NULL OR length(barcode) BETWEEN 1 AND 40),
  ADD COLUMN cost integer NOT NULL DEFAULT 0 CHECK (cost BETWEEN 0 AND 100000000),
  ADD COLUMN track_stock boolean NOT NULL DEFAULT false,
  ADD COLUMN min_stock integer NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  ADD COLUMN image_url text CHECK (image_url IS NULL OR length(image_url) <= 500),
  ADD COLUMN show_in_pos boolean NOT NULL DEFAULT true,
  ADD COLUMN taxable boolean NOT NULL DEFAULT true,
  ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX menu_items_sku_active ON fnb.menu_items (business_id, lower(sku)) WHERE archived_at IS NULL AND sku IS NOT NULL;
CREATE UNIQUE INDEX menu_items_barcode_active ON fnb.menu_items (business_id, barcode) WHERE archived_at IS NULL AND barcode IS NOT NULL;

ALTER TABLE fnb.modifier_groups
  ADD COLUMN description text CHECK (description IS NULL OR length(description) <= 200);
ALTER TABLE fnb.modifiers
  ADD COLUMN sku text CHECK (sku IS NULL OR sku ~ '^[A-Za-z0-9._-]{1,40}$'),
  ADD COLUMN cost integer NOT NULL DEFAULT 0 CHECK (cost BETWEEN 0 AND 10000000),
  ADD COLUMN image_url text CHECK (image_url IS NULL OR length(image_url) <= 500),
  ADD COLUMN ingredient_id uuid,
  ADD COLUMN ingredient_qty numeric(14,3) CHECK (ingredient_qty IS NULL OR ingredient_qty > 0),
  ADD FOREIGN KEY (business_id, ingredient_id) REFERENCES fnb.ingredients (business_id, id),
  ADD CHECK ((ingredient_id IS NULL) = (ingredient_qty IS NULL));

-- Tipe pesanan buatan pemilik (Makan di tempat, Bungkus, Ojol, ...). kind memetakan ke jenis dasar.
CREATE TABLE fnb.order_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 40),
  kind fnb.order_type NOT NULL,
  service_percent numeric(5,2) CHECK (service_percent IS NULL OR service_percent BETWEEN 0 AND 100),
  tax_percent numeric(5,2) CHECK (tax_percent IS NULL OR tax_percent BETWEEN 0 AND 100),
  require_table boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id)
);
CREATE UNIQUE INDEX order_types_name_active ON fnb.order_types (business_id, lower(name)) WHERE archived_at IS NULL;
ALTER TABLE fnb.orders
  ADD COLUMN order_type_id uuid,
  ADD COLUMN order_type_name text,
  ADD FOREIGN KEY (business_id, order_type_id) REFERENCES fnb.order_types (business_id, id);

CREATE TABLE fnb.table_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  outlet_id uuid NOT NULL,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 40),
  sort_order integer NOT NULL DEFAULT 0,
  archived_at timestamptz,
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, outlet_id) REFERENCES fnb.outlets (business_id, id)
);
CREATE UNIQUE INDEX table_groups_name_active ON fnb.table_groups (business_id, outlet_id, lower(name)) WHERE archived_at IS NULL;
ALTER TABLE fnb.dining_tables
  ADD COLUMN group_id uuid,
  ADD FOREIGN KEY (business_id, group_id) REFERENCES fnb.table_groups (business_id, id);

-- Baris pesanan menyimpan salinan HPP dan status kena pajak saat transaksi (untuk laporan laba dan hitung ulang).
ALTER TABLE fnb.order_lines
  ADD COLUMN unit_cost integer NOT NULL DEFAULT 0,
  ADD COLUMN taxable boolean NOT NULL DEFAULT true;

-- Data menu per cabang: stok barang jadi, harga/HPP khusus cabang, dan ketersediaan di cabang itu.
CREATE TABLE fnb.outlet_items (
  business_id uuid NOT NULL,
  outlet_id uuid NOT NULL,
  menu_item_id uuid NOT NULL,
  price integer CHECK (price IS NULL OR price BETWEEN 0 AND 100000000),
  cost integer CHECK (cost IS NULL OR cost BETWEEN 0 AND 100000000),
  is_available boolean NOT NULL DEFAULT true,
  stock integer NOT NULL DEFAULT 0,
  min_stock integer CHECK (min_stock IS NULL OR min_stock >= 0),
  PRIMARY KEY (outlet_id, menu_item_id),
  FOREIGN KEY (business_id, outlet_id) REFERENCES fnb.outlets (business_id, id),
  FOREIGN KEY (business_id, menu_item_id) REFERENCES fnb.menu_items (business_id, id) ON DELETE CASCADE
);
CREATE TABLE fnb.item_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  outlet_id uuid NOT NULL,
  menu_item_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity <> 0),
  reason text NOT NULL CHECK (length(reason) BETWEEN 2 AND 120),
  reference_type text,
  reference_id uuid,
  recorded_by uuid REFERENCES core.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id, outlet_id) REFERENCES fnb.outlets (business_id, id),
  FOREIGN KEY (business_id, menu_item_id) REFERENCES fnb.menu_items (business_id, id)
);
CREATE INDEX item_stock_movements_ref ON fnb.item_stock_movements (reference_type, reference_id);

SELECT fnb.enable_tenant_rls('fnb.outlet_items');
SELECT fnb.enable_tenant_rls('fnb.item_stock_movements');
SELECT fnb.enable_tenant_rls('fnb.order_types');
SELECT fnb.enable_tenant_rls('fnb.table_groups');
