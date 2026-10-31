-- Template penilaian berversi per cabang olahraga, hasil penilaian pemain, dan target perkembangan.
-- Versi yang sudah terbit tidak diubah: mengubahnya membuat draf versi baru, jadi hasil lama tetap terbaca benar.

CREATE TYPE bola.template_status AS ENUM ('draft', 'published', 'archived');

CREATE TABLE bola.assessment_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  -- Semua versi satu template berbagi family_id (= id versi pertama).
  family_id uuid NOT NULL,
  version smallint NOT NULL CHECK (version BETWEEN 1 AND 999),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 80),
  description text CHECK (description IS NULL OR length(description) <= 300),
  -- [{key, label, type: rating|number, unit?, better: higher|lower}]
  metrics jsonb NOT NULL CHECK (jsonb_typeof(metrics) = 'array' AND jsonb_array_length(metrics) BETWEEN 1 AND 30),
  status bola.template_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  UNIQUE (family_id, version)
);
CREATE UNIQUE INDEX assessment_templates_one_published ON bola.assessment_templates (family_id) WHERE status = 'published';
CREATE UNIQUE INDEX assessment_templates_one_draft ON bola.assessment_templates (family_id) WHERE status = 'draft';
CREATE INDEX assessment_templates_business ON bola.assessment_templates (business_id);
SELECT bola.enable_tenant_rls('bola.assessment_templates');

CREATE TABLE bola.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  player_id uuid NOT NULL,
  template_id uuid NOT NULL,
  assessed_on date NOT NULL,
  -- {metricKey: number}
  "values" jsonb NOT NULL CHECK (jsonb_typeof("values") = 'object'),
  note text CHECK (note IS NULL OR length(note) <= 1000),
  status bola.evaluation_status NOT NULL DEFAULT 'draft',
  author_id uuid REFERENCES core.users(id) ON DELETE SET NULL,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id, player_id) REFERENCES bola.players (business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, template_id) REFERENCES bola.assessment_templates (business_id, id),
  CHECK ((status = 'sent') = (sent_at IS NOT NULL))
);
CREATE INDEX assessments_player ON bola.assessments (business_id, player_id, assessed_on DESC);
SELECT bola.enable_tenant_rls('bola.assessments');

CREATE TYPE bola.goal_status AS ENUM ('open', 'achieved', 'dropped');

CREATE TABLE bola.development_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  player_id uuid NOT NULL,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 2 AND 120),
  detail text CHECK (detail IS NULL OR length(detail) <= 500),
  due_on date,
  status bola.goal_status NOT NULL DEFAULT 'open',
  -- Ditampilkan di akun pemain/orang tua.
  shared boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  FOREIGN KEY (business_id, player_id) REFERENCES bola.players (business_id, id) ON DELETE CASCADE
);
CREATE INDEX development_goals_player ON bola.development_goals (business_id, player_id);
SELECT bola.enable_tenant_rls('bola.development_goals');
