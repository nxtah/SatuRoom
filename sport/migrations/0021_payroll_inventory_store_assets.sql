-- Gaji dan slip gaji, stok dan pembelian (supplier, PO, penerimaan, opname), toko (pesanan orang tua),
-- dan aset tetap dengan penyusutan garis lurus. Semua uang dan nilai barang dijurnal lewat aplikasi.

-- ---------- Gaji ----------
CREATE TABLE bola.pay_profiles (
  membership_id uuid PRIMARY KEY REFERENCES core.memberships(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  base_salary integer NOT NULL DEFAULT 0 CHECK (base_salary BETWEEN 0 AND 1000000000),
  -- Honor per sesi melatih (sesi tim yang dia latih dan sudah lewat, tidak dibatalkan).
  per_session integer NOT NULL DEFAULT 0 CHECK (per_session BETWEEN 0 AND 100000000),
  allowance integer NOT NULL DEFAULT 0 CHECK (allowance BETWEEN 0 AND 1000000000),
  overtime_per_hour integer NOT NULL DEFAULT 0 CHECK (overtime_per_hour BETWEEN 0 AND 100000000),
  late_deduction integer NOT NULL DEFAULT 0 CHECK (late_deduction BETWEEN 0 AND 100000000),
  -- Potongan cuti tanpa gaji per hari.
  unpaid_leave_deduction integer NOT NULL DEFAULT 0 CHECK (unpaid_leave_deduction BETWEEN 0 AND 100000000),
  updated_at timestamptz NOT NULL DEFAULT now()
);
SELECT bola.enable_tenant_rls('bola.pay_profiles');

CREATE TYPE bola.payroll_status AS ENUM ('draft', 'approved', 'paid');

CREATE TABLE bola.payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  month date NOT NULL CHECK (extract(day FROM month) = 1),
  status bola.payroll_status NOT NULL DEFAULT 'draft',
  total integer NOT NULL DEFAULT 0,
  approved_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  paid_on date,
  paid_from uuid,
  created_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, month),
  UNIQUE (business_id, id)
);
SELECT bola.enable_tenant_rls('bola.payroll_runs');

CREATE TABLE bola.payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  run_id uuid NOT NULL,
  membership_id uuid NOT NULL REFERENCES core.memberships(id) ON DELETE CASCADE,
  staff_name text NOT NULL,
  -- [{label, amount, kind: earning|deduction}]
  lines jsonb NOT NULL CHECK (jsonb_typeof(lines) = 'array'),
  gross integer NOT NULL,
  deductions integer NOT NULL,
  net integer NOT NULL CHECK (net >= 0),
  UNIQUE (run_id, membership_id),
  FOREIGN KEY (business_id, run_id) REFERENCES bola.payroll_runs (business_id, id) ON DELETE CASCADE
);
SELECT bola.enable_tenant_rls('bola.payslips');

-- ---------- Barang dan stok ----------
CREATE TABLE bola.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 80),
  unit text NOT NULL DEFAULT 'pcs' CHECK (length(unit) BETWEEN 1 AND 20),
  qty integer NOT NULL DEFAULT 0 CHECK (qty >= 0),
  -- Harga pokok rata-rata tertimbang per unit (rupiah).
  avg_cost integer NOT NULL DEFAULT 0 CHECK (avg_cost >= 0),
  min_qty integer NOT NULL DEFAULT 0 CHECK (min_qty >= 0),
  for_sale boolean NOT NULL DEFAULT false,
  sale_price integer CHECK (sale_price IS NULL OR sale_price BETWEEN 0 AND 100000000),
  description text CHECK (description IS NULL OR length(description) <= 300),
  image_url text CHECK (image_url IS NULL OR length(image_url) <= 500),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  CHECK (NOT for_sale OR sale_price IS NOT NULL)
);
CREATE UNIQUE INDEX items_name ON bola.items (business_id, lower(btrim(name))) WHERE archived_at IS NULL;
SELECT bola.enable_tenant_rls('bola.items');

CREATE TABLE bola.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 80),
  phone text CHECK (phone IS NULL OR length(phone) <= 30),
  note text CHECK (note IS NULL OR length(note) <= 200),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id)
);
SELECT bola.enable_tenant_rls('bola.suppliers');

CREATE TYPE bola.po_status AS ENUM ('ordered', 'received', 'cancelled');

CREATE TABLE bola.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  ordered_on date NOT NULL,
  status bola.po_status NOT NULL DEFAULT 'ordered',
  note text CHECK (note IS NULL OR length(note) <= 200),
  total integer NOT NULL CHECK (total >= 0),
  received_on date,
  -- Kosong = belum dibayar (masih utang usaha).
  paid_on date,
  paid_from uuid,
  created_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, supplier_id) REFERENCES bola.suppliers (business_id, id)
);
SELECT bola.enable_tenant_rls('bola.purchase_orders');

CREATE TABLE bola.purchase_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  po_id uuid NOT NULL,
  item_id uuid NOT NULL,
  qty integer NOT NULL CHECK (qty > 0),
  unit_cost integer NOT NULL CHECK (unit_cost >= 0),
  FOREIGN KEY (business_id, po_id) REFERENCES bola.purchase_orders (business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, item_id) REFERENCES bola.items (business_id, id)
);
SELECT bola.enable_tenant_rls('bola.purchase_lines');

-- Kartu stok: setiap perubahan jumlah barang.
CREATE TABLE bola.stock_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  item_id uuid NOT NULL,
  moved_on date NOT NULL,
  -- purchase, sale, issue (dipakai sendiri), count (opname), return (batal jual)
  kind text NOT NULL CHECK (kind IN ('purchase', 'sale', 'issue', 'count', 'return')),
  qty integer NOT NULL CHECK (qty <> 0),
  unit_cost integer NOT NULL CHECK (unit_cost >= 0),
  ref_id uuid,
  note text CHECK (note IS NULL OR length(note) <= 200),
  created_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id, item_id) REFERENCES bola.items (business_id, id)
);
CREATE INDEX stock_moves_item ON bola.stock_moves (business_id, item_id, created_at DESC);
SELECT bola.enable_tenant_rls('bola.stock_moves');

-- ---------- Toko ----------
CREATE TYPE bola.order_status AS ENUM ('pending', 'paid', 'fulfilled', 'cancelled');

CREATE TABLE bola.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  player_id uuid,
  buyer_name text NOT NULL CHECK (length(btrim(buyer_name)) BETWEEN 2 AND 100),
  status bola.order_status NOT NULL DEFAULT 'pending',
  total integer NOT NULL CHECK (total >= 0),
  note text CHECK (note IS NULL OR length(note) <= 200),
  -- 'parent' = dipesan dari akun pemain/orang tua; 'staff' = dicatat staf.
  channel text NOT NULL DEFAULT 'staff' CHECK (channel IN ('staff', 'parent')),
  placed_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  paid_on date,
  method bola.payment_method,
  account_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, player_id) REFERENCES bola.players (business_id, id) ON DELETE SET NULL (player_id)
);
CREATE INDEX orders_business_status ON bola.orders (business_id, status, created_at DESC);
SELECT bola.enable_tenant_rls('bola.orders');

CREATE TABLE bola.order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  order_id uuid NOT NULL,
  item_id uuid NOT NULL,
  item_name text NOT NULL,
  qty integer NOT NULL CHECK (qty BETWEEN 1 AND 100),
  price integer NOT NULL CHECK (price >= 0),
  -- Harga pokok saat dibayar (untuk HPP).
  unit_cost integer,
  FOREIGN KEY (business_id, order_id) REFERENCES bola.orders (business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, item_id) REFERENCES bola.items (business_id, id)
);
SELECT bola.enable_tenant_rls('bola.order_lines');

-- ---------- Aset tetap ----------
CREATE TABLE bola.fixed_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 80),
  acquired_on date NOT NULL,
  cost integer NOT NULL CHECK (cost BETWEEN 1 AND 2000000000),
  salvage integer NOT NULL DEFAULT 0 CHECK (salvage >= 0),
  useful_months smallint NOT NULL CHECK (useful_months BETWEEN 1 AND 600),
  paid_from uuid,
  branch_id uuid,
  disposed_on date,
  created_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (salvage < cost)
);
SELECT bola.enable_tenant_rls('bola.fixed_assets');

-- Penyusutan dijalankan sekali per bulan per akademi.
CREATE TABLE bola.depreciation_runs (
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  month date NOT NULL CHECK (extract(day FROM month) = 1),
  total integer NOT NULL,
  run_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  run_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, month)
);
SELECT bola.enable_tenant_rls('bola.depreciation_runs');

CREATE TABLE bola.depreciation_lines (
  business_id uuid NOT NULL,
  month date NOT NULL,
  asset_id uuid NOT NULL REFERENCES bola.fixed_assets(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount > 0),
  PRIMARY KEY (asset_id, month)
);
SELECT bola.enable_tenant_rls('bola.depreciation_lines');
