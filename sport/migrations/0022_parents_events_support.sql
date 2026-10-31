-- Portal orang tua untuk banyak anak, event dan turnamen, layanan orang tua (tiket), dan notifikasi di aplikasi.

-- ---------- Satu akun boleh untuk beberapa anak; satu anak boleh punya beberapa akun (ayah, ibu, pemain) ----------
ALTER TABLE bola.player_accounts DROP CONSTRAINT player_accounts_player_key;
ALTER TABLE bola.player_accounts DROP CONSTRAINT player_accounts_user_key;
-- Hubungan untuk ditampilkan ke staf: ayah, ibu, wali, atau pemain sendiri.
ALTER TABLE bola.player_accounts ADD COLUMN relation text NOT NULL DEFAULT 'guardian'
  CHECK (relation IN ('self', 'father', 'mother', 'guardian'));

ALTER TABLE bola.player_invitations ADD COLUMN relation text NOT NULL DEFAULT 'guardian'
  CHECK (relation IN ('self', 'father', 'mother', 'guardian'));

DROP INDEX bola.player_invitations_pending;
CREATE UNIQUE INDEX player_invitations_pending ON bola.player_invitations (player_id, lower(email))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- Semua anak yang terhubung ke pengguna yang sedang masuk, lintas akademi.
CREATE FUNCTION bola.my_players()
RETURNS TABLE (business_id uuid, player_id uuid, full_name text, academy_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  SELECT a.business_id, a.player_id, p.full_name, b.name
  FROM bola.player_accounts a
  JOIN bola.players p ON p.id = a.player_id
  JOIN core.businesses b ON b.id = a.business_id
  WHERE a.user_id = core.current_user_id() AND p.status = 'active'
  ORDER BY a.created_at, p.full_name;
$$;
REVOKE ALL ON FUNCTION bola.my_players() FROM PUBLIC;

-- Menerima undangan: akun boleh sudah punya anak lain; maksimal 4 akun per pemain.
CREATE OR REPLACE FUNCTION bola.accept_player_invitation(p_id uuid, p_consent_by text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_user uuid := core.current_user_id();
  v_inv bola.player_invitations;
BEGIN
  IF v_user IS NULL OR p_consent_by IS NULL OR length(trim(p_consent_by)) = 0 THEN RETURN NULL; END IF;
  SELECT i.* INTO v_inv
  FROM bola.player_invitations i JOIN core.users u ON u.email = i.email
  WHERE i.id = p_id AND u.id = v_user AND u.email_verified_at IS NOT NULL
    AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now()
  FOR UPDATE OF i;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM bola.player_accounts WHERE user_id = v_user AND player_id = v_inv.player_id)
     OR (SELECT count(*) FROM bola.player_accounts WHERE player_id = v_inv.player_id) >= 4 THEN
    RETURN NULL;
  END IF;

  PERFORM set_config('app.business_id', v_inv.business_id::text, true);

  INSERT INTO bola.player_accounts (business_id, player_id, user_id, consent_at, consent_by, relation)
  VALUES (v_inv.business_id, v_inv.player_id, v_user, now(), left(trim(p_consent_by), 120), v_inv.relation);

  UPDATE bola.player_invitations SET accepted_at = now(), accepted_by = v_user WHERE id = p_id;

  INSERT INTO core.audit_events (business_id, actor_user_id, action, target_type, target_id)
  VALUES (v_inv.business_id, v_user, 'player_account.linked', 'player', v_inv.player_id::text);

  RETURN v_inv.player_id;
END;
$$;

-- ---------- Notifikasi di aplikasi (tanpa push/WhatsApp) ----------
CREATE TABLE bola.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  body text CHECK (body IS NULL OR length(body) <= 300),
  href text CHECK (href IS NULL OR href ~ '^/[A-Za-z0-9/_?=&%.-]*$'),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user ON bola.notifications (business_id, user_id, created_at DESC);
SELECT bola.enable_tenant_rls('bola.notifications');

-- ---------- Event dan turnamen ----------
CREATE TYPE bola.event_kind AS ENUM ('event', 'tournament');
CREATE TYPE bola.event_status AS ENUM ('draft', 'open', 'closed', 'done', 'cancelled');

CREATE TABLE bola.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  kind bola.event_kind NOT NULL DEFAULT 'event',
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 3 AND 100),
  description text CHECK (description IS NULL OR length(description) <= 1500),
  place text CHECK (place IS NULL OR length(place) <= 120),
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  fee integer NOT NULL DEFAULT 0 CHECK (fee BETWEEN 0 AND 100000000),
  capacity integer CHECK (capacity IS NULL OR capacity BETWEEN 1 AND 5000),
  -- Orang tua boleh mendaftarkan anaknya sendiri dari portal.
  parent_signup boolean NOT NULL DEFAULT true,
  status bola.event_status NOT NULL DEFAULT 'draft',
  branch_id uuid,
  created_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  CHECK (ends_on >= starts_on)
);
CREATE INDEX events_business_date ON bola.events (business_id, starts_on DESC);
SELECT bola.enable_tenant_rls('bola.events');

CREATE TYPE bola.participant_status AS ENUM ('registered', 'paid', 'cancelled');

CREATE TABLE bola.event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  event_id uuid NOT NULL,
  player_id uuid NOT NULL,
  status bola.participant_status NOT NULL DEFAULT 'registered',
  fee integer NOT NULL CHECK (fee >= 0),
  channel text NOT NULL DEFAULT 'staff' CHECK (channel IN ('staff', 'parent')),
  paid_on date,
  method bola.payment_method,
  -- Peringkat/hasil individu (mis. juara 1, waktu terbaik); bebas diisi staf.
  result text CHECK (result IS NULL OR length(result) <= 60),
  rank smallint CHECK (rank IS NULL OR rank BETWEEN 1 AND 999),
  registered_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, player_id),
  FOREIGN KEY (business_id, event_id) REFERENCES bola.events (business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, player_id) REFERENCES bola.players (business_id, id) ON DELETE CASCADE
);
SELECT bola.enable_tenant_rls('bola.event_participants');

-- Turnamen: peserta berupa tim (tim akademi sendiri atau tim tamu) dan jadwal pertandingan.
CREATE TABLE bola.event_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  event_id uuid NOT NULL,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 60),
  team_id uuid,
  group_name text CHECK (group_name IS NULL OR length(group_name) <= 20),
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, event_id) REFERENCES bola.events (business_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX event_teams_name ON bola.event_teams (event_id, lower(btrim(name)));
SELECT bola.enable_tenant_rls('bola.event_teams');

CREATE TABLE bola.event_fixtures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  event_id uuid NOT NULL,
  home_id uuid NOT NULL,
  away_id uuid NOT NULL,
  round text CHECK (round IS NULL OR length(round) <= 30),
  played_on date,
  home_score smallint CHECK (home_score IS NULL OR home_score BETWEEN 0 AND 999),
  away_score smallint CHECK (away_score IS NULL OR away_score BETWEEN 0 AND 999),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (home_id <> away_id),
  CHECK ((home_score IS NULL) = (away_score IS NULL)),
  FOREIGN KEY (business_id, event_id) REFERENCES bola.events (business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, home_id) REFERENCES bola.event_teams (business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, away_id) REFERENCES bola.event_teams (business_id, id) ON DELETE CASCADE
);
SELECT bola.enable_tenant_rls('bola.event_fixtures');

-- ---------- Layanan orang tua ----------
CREATE TYPE bola.ticket_category AS ENUM ('question', 'complaint', 'feedback', 'other');
CREATE TYPE bola.ticket_status AS ENUM ('open', 'answered', 'closed');

CREATE TABLE bola.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  player_id uuid NOT NULL,
  created_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  category bola.ticket_category NOT NULL,
  subject text NOT NULL CHECK (length(btrim(subject)) BETWEEN 3 AND 120),
  status bola.ticket_status NOT NULL DEFAULT 'open',
  rating smallint CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  assigned_to uuid REFERENCES core.memberships(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, player_id) REFERENCES bola.players (business_id, id) ON DELETE CASCADE
);
CREATE INDEX tickets_business_status ON bola.tickets (business_id, status, updated_at DESC);
SELECT bola.enable_tenant_rls('bola.tickets');

CREATE TABLE bola.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  ticket_id uuid NOT NULL,
  author_id uuid REFERENCES core.users(id) ON DELETE SET NULL,
  from_staff boolean NOT NULL,
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id, ticket_id) REFERENCES bola.tickets (business_id, id) ON DELETE CASCADE
);
CREATE INDEX ticket_messages_ticket ON bola.ticket_messages (ticket_id, created_at);
SELECT bola.enable_tenant_rls('bola.ticket_messages');
