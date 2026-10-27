-- Pengumuman akademi (ke semua pemain atau satu tim) dan pendaftaran pemain lewat link publik.

CREATE TABLE bola.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  -- NULL = untuk seluruh akademi; terisi = hanya pemain di tim itu.
  team_id uuid,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 1000),
  created_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, team_id) REFERENCES bola.teams (business_id, id)
);
CREATE INDEX announcements_recent_idx ON bola.announcements (business_id, created_at DESC) WHERE archived_at IS NULL;
SELECT bola.enable_tenant_rls('bola.announcements');

-- Satu link pendaftaran per akademi. Token acak; mengganti token mematikan link lama.
CREATE TABLE bola.registration_links (
  business_id uuid PRIMARY KEY REFERENCES core.businesses(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE CHECK (length(token) BETWEEN 20 AND 64),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz
);
SELECT bola.enable_tenant_rls('bola.registration_links');

CREATE TYPE bola.registration_status AS ENUM ('pending', 'approved', 'rejected');

-- Data pendaftar sengaja minimal (data anak) dan wajib disertai persetujuan orang tua/wali.
CREATE TABLE bola.registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (length(full_name) BETWEEN 2 AND 100),
  birth_date date NOT NULL,
  guardian_name text NOT NULL CHECK (length(guardian_name) BETWEEN 2 AND 100),
  guardian_phone text NOT NULL CHECK (guardian_phone ~ '^\+?[0-9 -]{8,20}$'),
  note text CHECK (note IS NULL OR length(note) <= 300),
  status bola.registration_status NOT NULL DEFAULT 'pending',
  consent_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  reject_reason text CHECK (reject_reason IS NULL OR length(reject_reason) <= 200),
  player_id uuid,
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, player_id) REFERENCES bola.players (business_id, id)
);
-- Pendaftar yang sama (nama dan tanggal lahir) tidak muncul dua kali selama masih menunggu.
CREATE UNIQUE INDEX registrations_pending_unique ON bola.registrations (business_id, lower(full_name), birth_date)
  WHERE status = 'pending';
CREATE INDEX registrations_status_idx ON bola.registrations (business_id, status, created_at DESC);
SELECT bola.enable_tenant_rls('bola.registrations');

-- Halaman publik tidak punya sesi, jadi hanya dua pintu sempit ini yang boleh dipanggil tanpa login.
-- Token yang salah atau link yang dimatikan sama-sama menghasilkan "tidak ada".
CREATE FUNCTION bola.registration_academy(p_token text)
RETURNS TABLE (academy_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  SELECT b.name
  FROM bola.registration_links l JOIN core.businesses b ON b.id = l.business_id
  WHERE l.token = p_token AND l.enabled;
$$;

-- Hasil: 'created', 'duplicate', 'closed' (link mati/salah), atau 'full' (antrean menunggu penuh).
CREATE FUNCTION bola.submit_registration(
  p_token text, p_full_name text, p_birth_date date,
  p_guardian_name text, p_guardian_phone text, p_note text
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_business uuid;
  v_id uuid;
BEGIN
  SELECT business_id INTO v_business FROM bola.registration_links WHERE token = p_token AND enabled;
  IF NOT FOUND THEN RETURN 'closed'; END IF;

  PERFORM set_config('app.business_id', v_business::text, true);

  IF (SELECT count(*) FROM bola.registrations WHERE status = 'pending') >= 200 THEN RETURN 'full'; END IF;

  INSERT INTO bola.registrations
    (business_id, full_name, birth_date, guardian_name, guardian_phone, note, consent_at)
  VALUES
    (v_business, trim(p_full_name), p_birth_date, trim(p_guardian_name), trim(p_guardian_phone),
     nullif(trim(coalesce(p_note, '')), ''), now())
  ON CONFLICT (business_id, lower(full_name), birth_date) WHERE status = 'pending' DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN RETURN 'duplicate'; END IF;

  INSERT INTO core.audit_events (business_id, actor_user_id, action, target_type, target_id)
  VALUES (v_business, NULL, 'registration.submitted', 'registration', v_id::text);
  RETURN 'created';
END;
$$;

REVOKE ALL ON FUNCTION bola.registration_academy(text), bola.submit_registration(text, text, date, text, text, text)
  FROM PUBLIC;
