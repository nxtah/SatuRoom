-- Rapor penilaian pemain dari pelatih. Draf hanya terlihat staf; setelah dikirim, pemain melihatnya di portalnya.
CREATE TYPE bola.evaluation_status AS ENUM ('draft', 'sent');

CREATE TABLE bola.evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  player_id uuid NOT NULL,
  period text NOT NULL CHECK (length(period) BETWEEN 2 AND 60),
  technique smallint NOT NULL CHECK (technique BETWEEN 1 AND 5),
  tactics smallint NOT NULL CHECK (tactics BETWEEN 1 AND 5),
  fitness smallint NOT NULL CHECK (fitness BETWEEN 1 AND 5),
  attitude smallint NOT NULL CHECK (attitude BETWEEN 1 AND 5),
  strengths text NOT NULL CHECK (length(strengths) BETWEEN 2 AND 500),
  focus text NOT NULL CHECK (length(focus) BETWEEN 2 AND 500),
  status bola.evaluation_status NOT NULL DEFAULT 'draft',
  author_id uuid REFERENCES core.users(id) ON DELETE SET NULL,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, player_id) REFERENCES bola.players (business_id, id) ON DELETE CASCADE,
  CHECK ((status = 'sent') = (sent_at IS NOT NULL))
);
CREATE INDEX evaluations_player_idx ON bola.evaluations (business_id, player_id, created_at DESC);
SELECT bola.enable_tenant_rls('bola.evaluations');
