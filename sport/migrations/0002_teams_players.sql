-- Tim (kelompok umur atau skuad), pelatih per tim, pemain, dan keanggotaan pemain di tim.

CREATE TABLE bola.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  location_id uuid NOT NULL,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  -- Rentang umur opsional (mis. KU 10-13). Hanya petunjuk; pemain di luar rentang tetap boleh.
  age_min smallint CHECK (age_min IS NULL OR age_min BETWEEN 3 AND 25),
  age_max smallint CHECK (age_max IS NULL OR age_max BETWEEN 3 AND 25),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  CHECK (age_min IS NULL OR age_max IS NULL OR age_min <= age_max),
  FOREIGN KEY (business_id, location_id) REFERENCES bola.locations (business_id, id)
);
-- Nama tim unik di antara tim yang masih aktif.
CREATE UNIQUE INDEX teams_name_active ON bola.teams (business_id, lower(name)) WHERE archived_at IS NULL;
SELECT bola.enable_tenant_rls('bola.teams');

-- Penugasan pelatih: pelatih hanya melihat data tim yang ditugaskan kepadanya.
CREATE TABLE bola.team_coaches (
  business_id uuid NOT NULL,
  team_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, membership_id),
  FOREIGN KEY (business_id, team_id) REFERENCES bola.teams (business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, membership_id) REFERENCES core.memberships (business_id, id) ON DELETE CASCADE
);
CREATE INDEX team_coaches_member_idx ON bola.team_coaches (membership_id);
SELECT bola.enable_tenant_rls('bola.team_coaches');

CREATE TYPE bola.player_status AS ENUM ('active', 'inactive');

-- Data pemain sengaja minimal (data anak). Tidak ada foto, alamat, NIK, atau catatan kesehatan.
CREATE TABLE bola.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (length(full_name) BETWEEN 1 AND 100),
  birth_date date NOT NULL,
  position text CHECK (position IS NULL OR position IN ('kiper', 'belakang', 'tengah', 'depan')),
  shirt_number smallint CHECK (shirt_number IS NULL OR shirt_number BETWEEN 1 AND 99),
  -- Kontak wali hanya dibaca oleh peran dengan izin guardians.read (ditegakkan di server).
  guardian_name text CHECK (guardian_name IS NULL OR length(guardian_name) <= 100),
  guardian_phone text CHECK (guardian_phone IS NULL OR guardian_phone ~ '^\+?[0-9 -]{8,20}$'),
  status bola.player_status NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id)
);
CREATE INDEX players_name_idx ON bola.players (business_id, lower(full_name));
SELECT bola.enable_tenant_rls('bola.players');

-- Pemain boleh di lebih dari satu tim (mis. kelompok umur + skuad turnamen).
CREATE TABLE bola.team_players (
  business_id uuid NOT NULL,
  team_id uuid NOT NULL,
  player_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, player_id),
  FOREIGN KEY (business_id, team_id) REFERENCES bola.teams (business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, player_id) REFERENCES bola.players (business_id, id) ON DELETE CASCADE
);
CREATE INDEX team_players_player_idx ON bola.team_players (player_id);
SELECT bola.enable_tenant_rls('bola.team_players');

-- Pemain data anak: runtime tidak boleh menghapus permanen (nonaktifkan saja).
-- Grant DELETE dicabut setelah runner migrasi memberi grant tabel; lihat core/scripts/migrate.ts.
