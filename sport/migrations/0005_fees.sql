-- Iuran bulanan: tarif per tim dan tagihan per pemain per bulan. Pencatatan saja (tanpa payment gateway).

-- Peran baru: Bendahara (iuran + kontak orang tua, tanpa kelola staf/jadwal).
ALTER TYPE bola.staff_role ADD VALUE IF NOT EXISTS 'treasurer';

-- Tarif iuran bulanan per tim, dalam rupiah. Tim tanpa baris di sini = belum ada tarif.
CREATE TABLE bola.team_fees (
  business_id uuid NOT NULL,
  team_id uuid PRIMARY KEY,
  amount integer NOT NULL CHECK (amount BETWEEN 0 AND 100000000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id, team_id) REFERENCES bola.teams (business_id, id) ON DELETE CASCADE
);
SELECT bola.enable_tenant_rls('bola.team_fees');

CREATE TYPE bola.invoice_status AS ENUM ('unpaid', 'paid', 'waived');
CREATE TYPE bola.payment_method AS ENUM ('cash', 'transfer', 'other');

CREATE TABLE bola.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  player_id uuid NOT NULL,
  -- Hari pertama bulan tagihan.
  period date NOT NULL CHECK (extract(day FROM period) = 1),
  amount integer NOT NULL CHECK (amount BETWEEN 0 AND 100000000),
  status bola.invoice_status NOT NULL DEFAULT 'unpaid',
  paid_at timestamptz,
  method bola.payment_method,
  recorded_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, period),
  CHECK ((status = 'paid') = (paid_at IS NOT NULL AND method IS NOT NULL)),
  FOREIGN KEY (business_id, player_id) REFERENCES bola.players (business_id, id)
);
CREATE INDEX invoices_period_idx ON bola.invoices (business_id, period, status);
SELECT bola.enable_tenant_rls('bola.invoices');
