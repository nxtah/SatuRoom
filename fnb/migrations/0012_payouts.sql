-- Payout: pencatatan penarikan saldo non-tunai (QRIS, transfer, kartu) ke rekening pemilik.
-- Tidak ada gateway: sistem menghitung saldo dan mencatat penarikan, transfer uangnya dilakukan pemilik sendiri.
CREATE TABLE fnb.payout_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  bank_name text NOT NULL CHECK (length(bank_name) BETWEEN 2 AND 40),
  account_name text NOT NULL CHECK (length(account_name) BETWEEN 2 AND 60),
  account_no text NOT NULL CHECK (account_no ~ '^[0-9]{5,20}$'),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id)
);
CREATE UNIQUE INDEX payout_accounts_unique ON fnb.payout_accounts (business_id, bank_name, account_no) WHERE archived_at IS NULL;

CREATE TABLE fnb.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  account_id uuid NOT NULL,
  bank_name text NOT NULL,
  account_name text NOT NULL,
  account_no text NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  fee integer NOT NULL DEFAULT 0 CHECK (fee >= 0),
  status text NOT NULL DEFAULT 'diajukan' CHECK (status IN ('diajukan', 'dicairkan', 'dibatalkan')),
  note text CHECK (note IS NULL OR length(note) <= 200),
  reference text CHECK (reference IS NULL OR length(reference) <= 60),
  cancel_reason text CHECK (cancel_reason IS NULL OR length(cancel_reason) <= 200),
  requested_by uuid REFERENCES core.users(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  paid_by uuid REFERENCES core.users(id),
  paid_at timestamptz,
  cancelled_by uuid REFERENCES core.users(id),
  cancelled_at timestamptz,
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, account_id) REFERENCES fnb.payout_accounts (business_id, id),
  CHECK ((status = 'dicairkan') = (paid_at IS NOT NULL)),
  CHECK ((status = 'dibatalkan') = (cancelled_at IS NOT NULL))
);
CREATE INDEX payouts_business_idx ON fnb.payouts (business_id, requested_at DESC);
SELECT fnb.enable_tenant_rls('fnb.payout_accounts');
SELECT fnb.enable_tenant_rls('fnb.payouts');
