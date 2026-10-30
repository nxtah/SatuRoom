-- Templat struk (logo, kertas, bagian yang ditampilkan) dan daftar printer. Cetak lewat dialog cetak browser; tidak ada koneksi printer fisik langsung.
ALTER TABLE fnb.settings
  ADD COLUMN receipt_logo_url text CHECK (receipt_logo_url IS NULL OR length(receipt_logo_url) <= 500),
  ADD COLUMN receipt_paper smallint NOT NULL DEFAULT 80 CHECK (receipt_paper IN (58, 80)),
  ADD COLUMN receipt_show_cashier boolean NOT NULL DEFAULT true,
  ADD COLUMN receipt_show_table boolean NOT NULL DEFAULT true,
  ADD COLUMN receipt_show_customer boolean NOT NULL DEFAULT true,
  ADD COLUMN receipt_show_tax_detail boolean NOT NULL DEFAULT true,
  ADD COLUMN receipt_show_payment boolean NOT NULL DEFAULT true;

CREATE TABLE fnb.printers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 60),
  purpose text NOT NULL DEFAULT 'receipt' CHECK (purpose IN ('receipt', 'kitchen', 'bar')),
  paper smallint NOT NULL DEFAULT 80 CHECK (paper IN (58, 80)),
  location text CHECK (location IS NULL OR length(location) <= 80),
  copies smallint NOT NULL DEFAULT 1 CHECK (copies BETWEEN 1 AND 5),
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id)
);
CREATE UNIQUE INDEX printers_one_default ON fnb.printers (business_id, purpose) WHERE is_default AND archived_at IS NULL;
SELECT fnb.enable_tenant_rls('fnb.printers');
