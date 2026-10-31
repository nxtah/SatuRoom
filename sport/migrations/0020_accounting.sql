-- Keuangan: diskon dan beasiswa, pembayaran sebagian, bagan akun, jurnal berpasangan (double-entry) yang
-- tidak bisa diubah (koreksi lewat jurnal balik), tutup buku per bulan, pengeluaran, dan rekonsiliasi kas/bank.
-- Rupiah disimpan sebagai bilangan bulat. Basis akrual: tagihan = Piutang/Pendapatan, bayar = Kas/Piutang.

-- ---------- Bagan akun ----------
CREATE TYPE bola.account_type AS ENUM ('asset', 'liability', 'equity', 'income', 'expense');

CREATE TABLE bola.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  code text NOT NULL CHECK (code ~ '^[0-9][0-9-]{0,9}$'),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 80),
  type bola.account_type NOT NULL,
  -- Akun kas/bank: muncul sebagai sumber pembayaran dan di rekonsiliasi.
  is_cash boolean NOT NULL DEFAULT false,
  -- Kunci akun yang dipakai otomatis oleh sistem (cash, bank, receivable, fee_income, ...).
  system_key text CHECK (system_key IS NULL OR system_key ~ '^[a-z_]{2,40}$'),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  UNIQUE (business_id, code)
);
CREATE UNIQUE INDEX accounts_system_key ON bola.accounts (business_id, system_key) WHERE system_key IS NOT NULL;
SELECT bola.enable_tenant_rls('bola.accounts');

-- Bagan akun bawaan; bisa ditambah/diubah nama oleh pemilik.
CREATE FUNCTION bola.seed_accounts(p_business uuid) RETURNS void
LANGUAGE sql SET search_path = pg_catalog, pg_temp AS $$
  INSERT INTO bola.accounts (business_id, code, name, type, is_cash, system_key) VALUES
    (p_business, '1-100', 'Kas', 'asset', true, 'cash'),
    (p_business, '1-110', 'Bank', 'asset', true, 'bank'),
    (p_business, '1-200', 'Piutang iuran', 'asset', false, 'receivable'),
    (p_business, '1-300', 'Persediaan barang', 'asset', false, 'inventory'),
    (p_business, '1-500', 'Aset tetap', 'asset', false, 'fixed_assets'),
    (p_business, '1-510', 'Akumulasi penyusutan', 'asset', false, 'accum_depreciation'),
    (p_business, '2-100', 'Utang usaha', 'liability', false, 'payable'),
    (p_business, '2-200', 'Utang gaji', 'liability', false, 'salary_payable'),
    (p_business, '3-100', 'Modal pemilik', 'equity', false, 'capital'),
    (p_business, '3-200', 'Laba ditahan', 'equity', false, 'retained'),
    (p_business, '4-100', 'Pendapatan iuran', 'income', false, 'fee_income'),
    (p_business, '4-200', 'Pendapatan event', 'income', false, 'event_income'),
    (p_business, '4-300', 'Penjualan toko', 'income', false, 'sales'),
    (p_business, '4-900', 'Pendapatan lain-lain', 'income', false, 'other_income'),
    (p_business, '6-100', 'Gaji dan honor', 'expense', false, 'salary'),
    (p_business, '6-200', 'Sewa lapangan', 'expense', false, 'rent'),
    (p_business, '6-300', 'Perlengkapan latihan', 'expense', false, 'equipment'),
    (p_business, '6-400', 'Transportasi', 'expense', false, NULL),
    (p_business, '6-500', 'Listrik, air, internet', 'expense', false, NULL),
    (p_business, '6-600', 'Promosi', 'expense', false, NULL),
    (p_business, '6-700', 'Penyusutan', 'expense', false, 'depreciation'),
    (p_business, '6-800', 'Harga pokok penjualan', 'expense', false, 'cogs'),
    (p_business, '6-850', 'Selisih stok', 'expense', false, 'stock_adjustment'),
    (p_business, '6-900', 'Biaya lain-lain', 'expense', false, 'other_expense')
  ON CONFLICT (business_id, code) DO NOTHING;
$$;
SELECT bola.seed_accounts(id) FROM core.businesses WHERE product = 'bola';

-- ---------- Jurnal ----------
CREATE TABLE bola.journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  memo text NOT NULL CHECK (length(memo) BETWEEN 1 AND 200),
  -- Asal jurnal: invoice, payment, expense, manual, payroll, purchase, sale, depreciation, ...
  source text NOT NULL CHECK (source ~ '^[a-z_]{2,30}$'),
  source_id uuid,
  reversal_of uuid REFERENCES bola.journals(id),
  reversed_by uuid REFERENCES bola.journals(id),
  created_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id)
);
CREATE INDEX journals_business_date ON bola.journals (business_id, entry_date);
CREATE INDEX journals_source ON bola.journals (business_id, source, source_id);
CREATE UNIQUE INDEX journals_one_reversal ON bola.journals (reversal_of) WHERE reversal_of IS NOT NULL;
SELECT bola.enable_tenant_rls('bola.journals');

CREATE TABLE bola.journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  journal_id uuid NOT NULL,
  account_id uuid NOT NULL,
  debit bigint NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit bigint NOT NULL DEFAULT 0 CHECK (credit >= 0),
  -- Cabang (opsional) untuk laporan per cabang.
  branch_id uuid,
  CHECK ((debit = 0) <> (credit = 0)),
  FOREIGN KEY (business_id, journal_id) REFERENCES bola.journals (business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, account_id) REFERENCES bola.accounts (business_id, id)
);
CREATE INDEX journal_lines_journal ON bola.journal_lines (journal_id);
CREATE INDEX journal_lines_account ON bola.journal_lines (business_id, account_id);
SELECT bola.enable_tenant_rls('bola.journal_lines');

-- Jurnal yang sudah dicatat tidak bisa diubah atau dihapus; satu-satunya perubahan yang boleh adalah
-- menandai `reversed_by` sekali.
CREATE FUNCTION bola.journals_immutable() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Hapus berantai saat akademi dihapus tetap diizinkan.
    IF NOT EXISTS (SELECT 1 FROM core.businesses WHERE id = OLD.business_id) THEN RETURN OLD; END IF;
    RAISE EXCEPTION 'Jurnal tidak bisa dihapus. Buat jurnal balik.' USING ERRCODE = 'P0001';
  END IF;
  IF TG_TABLE_NAME = 'journals'
     AND OLD.reversed_by IS NULL AND NEW.reversed_by IS NOT NULL
     AND (to_jsonb(NEW) - 'reversed_by') = (to_jsonb(OLD) - 'reversed_by') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Jurnal tidak bisa diubah. Buat jurnal balik.' USING ERRCODE = 'P0001';
END $$;
CREATE TRIGGER journals_immutable BEFORE UPDATE OR DELETE ON bola.journals FOR EACH ROW EXECUTE FUNCTION bola.journals_immutable();
CREATE TRIGGER journal_lines_immutable BEFORE UPDATE OR DELETE ON bola.journal_lines FOR EACH ROW EXECUTE FUNCTION bola.journals_immutable();

-- Tutup buku per bulan: jurnal bertanggal di bulan yang ditutup ditolak.
CREATE TABLE bola.period_locks (
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  month date NOT NULL CHECK (extract(day FROM month) = 1),
  closed_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  closed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, month)
);
SELECT bola.enable_tenant_rls('bola.period_locks');

CREATE FUNCTION bola.journal_period_open() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM bola.period_locks l
             WHERE l.business_id = NEW.business_id AND l.month = date_trunc('month', NEW.entry_date)::date) THEN
    RAISE EXCEPTION 'period_locked' USING ERRCODE = 'P0002';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER journals_period_open BEFORE INSERT ON bola.journals FOR EACH ROW EXECUTE FUNCTION bola.journal_period_open();

-- Setiap jurnal harus seimbang (debit = kredit) dan punya minimal dua baris, diperiksa di akhir transaksi.
CREATE FUNCTION bola.journal_balanced() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $$
DECLARE v_d bigint; v_c bigint; v_n int;
BEGIN
  SELECT coalesce(sum(debit), 0), coalesce(sum(credit), 0), count(*) INTO v_d, v_c, v_n
  FROM bola.journal_lines WHERE journal_id = NEW.id;
  IF v_n < 2 OR v_d <> v_c OR v_d = 0 THEN
    RAISE EXCEPTION 'journal_unbalanced' USING ERRCODE = 'P0003';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER journals_balanced AFTER INSERT ON bola.journals
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION bola.journal_balanced();

-- ---------- Iuran: diskon, beasiswa, pembayaran ----------
ALTER TABLE bola.invoices ADD COLUMN discount integer NOT NULL DEFAULT 0 CHECK (discount >= 0);
ALTER TABLE bola.invoices ADD COLUMN discount_note text CHECK (discount_note IS NULL OR length(discount_note) <= 120);
ALTER TABLE bola.invoices ADD CONSTRAINT invoices_discount_le_amount CHECK (discount <= amount);
ALTER TABLE bola.invoices ADD CONSTRAINT invoices_business_id_key UNIQUE (business_id, id);

CREATE TABLE bola.scholarships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  player_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('percent', 'amount')),
  value integer NOT NULL CHECK (value > 0),
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 2 AND 120),
  starts_on date NOT NULL,
  ends_on date CHECK (ends_on IS NULL OR ends_on >= starts_on),
  archived_at timestamptz,
  created_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind <> 'percent' OR value <= 100),
  FOREIGN KEY (business_id, player_id) REFERENCES bola.players (business_id, id) ON DELETE CASCADE
);
CREATE INDEX scholarships_player ON bola.scholarships (business_id, player_id);
SELECT bola.enable_tenant_rls('bola.scholarships');

CREATE TABLE bola.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  invoice_id uuid NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  paid_on date NOT NULL,
  method bola.payment_method NOT NULL,
  -- Akun kas/bank penerima.
  account_id uuid NOT NULL,
  note text CHECK (note IS NULL OR length(note) <= 120),
  recorded_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  voided_at timestamptz,
  FOREIGN KEY (business_id, invoice_id) REFERENCES bola.invoices (business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, account_id) REFERENCES bola.accounts (business_id, id)
);
CREATE INDEX payments_invoice ON bola.payments (invoice_id) WHERE voided_at IS NULL;
SELECT bola.enable_tenant_rls('bola.payments');

-- ---------- Pengeluaran ----------
CREATE TABLE bola.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  spent_on date NOT NULL,
  account_id uuid NOT NULL,
  paid_from uuid NOT NULL,
  amount integer NOT NULL CHECK (amount BETWEEN 1 AND 1000000000),
  vendor text CHECK (vendor IS NULL OR length(vendor) <= 80),
  note text NOT NULL CHECK (length(btrim(note)) BETWEEN 2 AND 200),
  branch_id uuid,
  journal_id uuid,
  recorded_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  voided_at timestamptz,
  FOREIGN KEY (business_id, account_id) REFERENCES bola.accounts (business_id, id),
  FOREIGN KEY (business_id, paid_from) REFERENCES bola.accounts (business_id, id),
  FOREIGN KEY (business_id, branch_id) REFERENCES bola.branches (business_id, id)
);
CREATE INDEX expenses_business_date ON bola.expenses (business_id, spent_on);
SELECT bola.enable_tenant_rls('bola.expenses');

-- ---------- Rekonsiliasi kas/bank ----------
-- Baris jurnal kas/bank yang sudah cocok dengan rekening koran.
CREATE TABLE bola.cleared_lines (
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  line_id uuid PRIMARY KEY REFERENCES bola.journal_lines(id) ON DELETE CASCADE,
  cleared_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  cleared_at timestamptz NOT NULL DEFAULT now()
);
SELECT bola.enable_tenant_rls('bola.cleared_lines');

CREATE TABLE bola.reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  account_id uuid NOT NULL,
  statement_date date NOT NULL,
  statement_balance bigint NOT NULL,
  cleared_balance bigint NOT NULL,
  created_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id, account_id) REFERENCES bola.accounts (business_id, id)
);
CREATE INDEX reconciliations_account ON bola.reconciliations (business_id, account_id, statement_date DESC);
SELECT bola.enable_tenant_rls('bola.reconciliations');

-- ---------- Data lama: pembayaran dan jurnal untuk tagihan yang sudah ada ----------
INSERT INTO bola.payments (business_id, invoice_id, amount, paid_on, method, account_id, recorded_by, created_at)
SELECT i.business_id, i.id, i.amount, (i.paid_at AT TIME ZONE b.timezone)::date, i.method,
       a.id, i.recorded_by, i.paid_at
FROM bola.invoices i
JOIN core.businesses b ON b.id = i.business_id
JOIN bola.accounts a ON a.business_id = i.business_id AND a.system_key = CASE WHEN i.method = 'transfer' THEN 'bank' ELSE 'cash' END
WHERE i.status = 'paid' AND i.amount > 0;

DO $$
DECLARE r record; v_j uuid;
BEGIN
  FOR r IN
    SELECT i.id, i.business_id, i.period, i.amount, p.full_name
    FROM bola.invoices i JOIN bola.players p ON p.id = i.player_id
    WHERE i.status <> 'waived' AND i.amount > 0
  LOOP
    INSERT INTO bola.journals (business_id, entry_date, memo, source, source_id)
    VALUES (r.business_id, r.period, left('Iuran ' || to_char(r.period, 'MM/YYYY') || ' - ' || r.full_name, 200), 'invoice', r.id)
    RETURNING id INTO v_j;
    INSERT INTO bola.journal_lines (business_id, journal_id, account_id, debit, credit)
    SELECT r.business_id, v_j, a.id, CASE WHEN a.system_key = 'receivable' THEN r.amount ELSE 0 END,
           CASE WHEN a.system_key = 'fee_income' THEN r.amount ELSE 0 END
    FROM bola.accounts a WHERE a.business_id = r.business_id AND a.system_key IN ('receivable', 'fee_income');
  END LOOP;
  FOR r IN
    SELECT p.id, p.business_id, p.paid_on, p.amount, p.account_id, pl.full_name
    FROM bola.payments p JOIN bola.invoices i ON i.id = p.invoice_id JOIN bola.players pl ON pl.id = i.player_id
  LOOP
    INSERT INTO bola.journals (business_id, entry_date, memo, source, source_id)
    VALUES (r.business_id, r.paid_on, left('Pembayaran iuran - ' || r.full_name, 200), 'payment', r.id)
    RETURNING id INTO v_j;
    INSERT INTO bola.journal_lines (business_id, journal_id, account_id, debit, credit)
    VALUES (r.business_id, v_j, r.account_id, r.amount, 0);
    INSERT INTO bola.journal_lines (business_id, journal_id, account_id, debit, credit)
    SELECT r.business_id, v_j, a.id, 0, r.amount FROM bola.accounts a WHERE a.business_id = r.business_id AND a.system_key = 'receivable';
  END LOOP;
END $$;
