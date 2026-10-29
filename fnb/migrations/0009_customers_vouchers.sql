-- Pelanggan dan voucher. Pesanan menyimpan salinan nama pelanggan dan kode voucher saat transaksi.
CREATE TABLE fnb.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  phone text CHECK (phone IS NULL OR phone ~ '^\+?[0-9 -]{8,20}$'),
  notes text CHECK (notes IS NULL OR length(notes) <= 200),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id)
);
CREATE UNIQUE INDEX customers_phone_active ON fnb.customers (business_id, phone) WHERE archived_at IS NULL AND phone IS NOT NULL;

CREATE TABLE fnb.vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  code text NOT NULL CHECK (code ~ '^[A-Z0-9_-]{3,20}$'),
  kind text NOT NULL CHECK (kind IN ('percent', 'amount')),
  value integer NOT NULL CHECK (value > 0),
  min_spend integer NOT NULL DEFAULT 0 CHECK (min_spend >= 0),
  max_uses integer CHECK (max_uses IS NULL OR max_uses > 0),
  used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  starts_on date,
  ends_on date,
  active boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  CHECK (kind <> 'percent' OR value <= 100),
  CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on)
);
CREATE UNIQUE INDEX vouchers_code_active ON fnb.vouchers (business_id, code) WHERE archived_at IS NULL;

ALTER TABLE fnb.orders
  ADD COLUMN customer_id uuid,
  ADD COLUMN voucher_id uuid,
  ADD COLUMN voucher_code text,
  ADD FOREIGN KEY (business_id, customer_id) REFERENCES fnb.customers (business_id, id),
  ADD FOREIGN KEY (business_id, voucher_id) REFERENCES fnb.vouchers (business_id, id);
CREATE INDEX orders_customer_idx ON fnb.orders (business_id, customer_id) WHERE customer_id IS NOT NULL;

SELECT fnb.enable_tenant_rls('fnb.customers');
SELECT fnb.enable_tenant_rls('fnb.vouchers');
