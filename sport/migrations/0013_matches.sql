-- Detail pertandingan: lawan, tempat (kandang/tandang), skor, catatan, dan susunan pemain.
-- Berlaku untuk sesi berjenis match. Skor memakai angka total; olahraga set (voli, tenis, bulu tangkis)
-- mengisi jumlah set yang dimenangkan dan menulis rincian per set di catatan.
CREATE TYPE bola.home_away AS ENUM ('home', 'away', 'neutral');
CREATE TYPE bola.lineup_role AS ENUM ('starter', 'bench');

CREATE TABLE bola.match_details (
  session_id uuid PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  opponent text CHECK (opponent IS NULL OR length(opponent) BETWEEN 2 AND 80),
  home_away bola.home_away NOT NULL DEFAULT 'home',
  score_us smallint CHECK (score_us IS NULL OR score_us BETWEEN 0 AND 999),
  score_them smallint CHECK (score_them IS NULL OR score_them BETWEEN 0 AND 999),
  report text CHECK (report IS NULL OR length(report) <= 500),
  updated_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Skor diisi berpasangan: keduanya atau tidak sama sekali.
  CHECK ((score_us IS NULL) = (score_them IS NULL)),
  FOREIGN KEY (business_id, session_id) REFERENCES bola.sessions (business_id, id) ON DELETE CASCADE
);
SELECT bola.enable_tenant_rls('bola.match_details');

CREATE TABLE bola.match_lineup (
  business_id uuid NOT NULL,
  session_id uuid NOT NULL,
  player_id uuid NOT NULL,
  role bola.lineup_role NOT NULL,
  PRIMARY KEY (session_id, player_id),
  FOREIGN KEY (business_id, session_id) REFERENCES bola.sessions (business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, player_id) REFERENCES bola.players (business_id, id) ON DELETE CASCADE
);
CREATE INDEX match_lineup_player_idx ON bola.match_lineup (player_id);
SELECT bola.enable_tenant_rls('bola.match_lineup');
