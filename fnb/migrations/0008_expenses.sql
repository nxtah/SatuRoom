-- Pengeluaran operasional (listrik, gaji, sewa, dll). Bila dibayar dari laci, terhubung ke kas keluar shift.
CREATE TABLE fnb.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  spent_on date NOT NULL,
  category text NOT NULL CHECK (length(category) BETWEEN 2 AND 40),
  amount integer NOT NULL CHECK (amount > 0),
  note text CHECK (note IS NULL OR length(note) <= 200),
  cash_movement_id uuid REFERENCES fnb.cash_movements(id),
  recorded_by uuid REFERENCES core.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  voided_at timestamptz,
  void_reason text,
  UNIQUE (business_id, id)
);
CREATE INDEX expenses_day_idx ON fnb.expenses (business_id, spent_on DESC);
SELECT fnb.enable_tenant_rls('fnb.expenses');
