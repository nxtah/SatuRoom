-- Schema aplikasi akademi sepak bola. Hanya folder bola/ yang mengubah schema ini.
CREATE SCHEMA IF NOT EXISTS bola;

-- Memasang RLS standar: baris hanya terlihat dan bisa ditulis untuk bisnis aktif.
CREATE FUNCTION bola.enable_tenant_rls(tbl regclass) RETURNS void
  LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tbl);
  EXECUTE format(
    'CREATE POLICY tenant_isolation ON %s USING (business_id = core.current_business_id()) '
    'WITH CHECK (business_id = core.current_business_id())', tbl);
END $$;

-- Peran staf. Satu anggota boleh punya lebih dari satu peran; izin efektif = gabungan semuanya.
-- Peran baru cukup ditambah ke enum ini dan ke daftar izin di kode.
CREATE TYPE bola.staff_role AS ENUM ('owner', 'admin', 'head_coach', 'coach');

CREATE TABLE bola.staff_roles (
  business_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  role bola.staff_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (membership_id, role),
  FOREIGN KEY (business_id, membership_id)
    REFERENCES core.memberships (business_id, id) ON DELETE CASCADE
);
CREATE INDEX staff_roles_business_idx ON bola.staff_roles (business_id);
SELECT bola.enable_tenant_rls('bola.staff_roles');

-- Lokasi/cabang. Versi pertama memakai satu lokasi utama, tetapi data tim dan jadwal
-- sudah menunjuk lokasi sehingga cabang tambahan tidak perlu memindahkan data.
CREATE TABLE bola.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  address text CHECK (address IS NULL OR length(address) <= 200),
  is_primary boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id)
);
CREATE UNIQUE INDEX locations_one_primary ON bola.locations (business_id) WHERE is_primary;
SELECT bola.enable_tenant_rls('bola.locations');

-- Progres onboarding per akademi. Langkah yang dilewati tetap bisa dilanjutkan nanti.
CREATE TABLE bola.onboarding (
  business_id uuid PRIMARY KEY REFERENCES core.businesses(id) ON DELETE CASCADE,
  staff_step text NOT NULL DEFAULT 'pending' CHECK (staff_step IN ('pending', 'done', 'skipped')),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
SELECT bola.enable_tenant_rls('bola.onboarding');
