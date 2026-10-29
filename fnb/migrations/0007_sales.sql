-- Penjualan lengkap: pajak, service charge, diskon, nomor struk, idempotensi, kas masuk/keluar, refund.
CREATE TABLE fnb.settings (
  business_id uuid PRIMARY KEY REFERENCES core.businesses(id) ON DELETE CASCADE,
  tax_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (tax_percent BETWEEN 0 AND 100),
  service_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (service_percent BETWEEN 0 AND 100),
  receipt_prefix text NOT NULL DEFAULT 'INV' CHECK (receipt_prefix ~ '^[A-Z0-9]{1,8}$'),
  receipt_header text CHECK (length(receipt_header) <= 200),
  receipt_footer text CHECK (length(receipt_footer) <= 200),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE fnb.counters (
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  key text NOT NULL,
  value bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (business_id, key)
);

ALTER TABLE fnb.orders
  ADD COLUMN receipt_no text,
  ADD COLUMN tax_percent numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN service_percent numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN discount_reason text CHECK (length(discount_reason) <= 200),
  ADD COLUMN idempotency_key text CHECK (length(idempotency_key) <= 80);
UPDATE fnb.orders SET receipt_no = 'INV-L' || order_number WHERE receipt_no IS NULL;
ALTER TABLE fnb.orders ALTER COLUMN receipt_no SET NOT NULL;
CREATE UNIQUE INDEX orders_receipt_no ON fnb.orders (business_id, receipt_no);
CREATE UNIQUE INDEX orders_idempotency ON fnb.orders (business_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE fnb.payments
  ADD COLUMN tendered integer CHECK (tendered >= 0),
  ADD COLUMN idempotency_key text CHECK (length(idempotency_key) <= 80);
CREATE UNIQUE INDEX payments_idempotency ON fnb.payments (business_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE fnb.cash_shifts
  ADD COLUMN expected_cash integer,
  ADD COLUMN variance integer;

CREATE TABLE fnb.cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  shift_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('in', 'out')),
  amount integer NOT NULL CHECK (amount > 0),
  category text NOT NULL CHECK (length(category) BETWEEN 2 AND 40),
  reason text NOT NULL CHECK (length(reason) BETWEEN 3 AND 200),
  recorded_by uuid REFERENCES core.users(id),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id, shift_id) REFERENCES fnb.cash_shifts (business_id, id)
);
CREATE TABLE fnb.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  order_id uuid NOT NULL,
  payment_id uuid NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  method fnb.payment_method NOT NULL,
  reason text NOT NULL CHECK (length(reason) BETWEEN 3 AND 200),
  refunded_by uuid REFERENCES core.users(id),
  refunded_at timestamptz NOT NULL DEFAULT now(),
  shift_id uuid,
  FOREIGN KEY (business_id, order_id) REFERENCES fnb.orders (business_id, id),
  FOREIGN KEY (business_id, shift_id) REFERENCES fnb.cash_shifts (business_id, id)
);
CREATE INDEX refunds_payment_idx ON fnb.refunds (payment_id);

SELECT fnb.enable_tenant_rls('fnb.settings');
SELECT fnb.enable_tenant_rls('fnb.counters');
SELECT fnb.enable_tenant_rls('fnb.cash_movements');
SELECT fnb.enable_tenant_rls('fnb.refunds');
