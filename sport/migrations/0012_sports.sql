-- Cabang olahraga per akademi. Akademi lama berisi sepak bola. Posisi pemain kini bebas per cabang,
-- jadi batasan lama (kiper/belakang/tengah/depan) diganti batasan panjang; daftar posisi per cabang dicek aplikasi.
CREATE TABLE bola.academy_settings (
  business_id uuid PRIMARY KEY REFERENCES core.businesses(id) ON DELETE CASCADE,
  sport text NOT NULL DEFAULT 'football' CHECK (sport IN
    ('football', 'futsal', 'basketball', 'volleyball', 'badminton', 'tennis', 'swimming', 'other')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
SELECT bola.enable_tenant_rls('bola.academy_settings');

INSERT INTO bola.academy_settings (business_id)
SELECT id FROM core.businesses WHERE product = 'bola';

ALTER TABLE bola.players DROP CONSTRAINT IF EXISTS players_position_check;
ALTER TABLE bola.players ADD CONSTRAINT players_position_check
  CHECK (position IS NULL OR length(position) BETWEEN 1 AND 40);
