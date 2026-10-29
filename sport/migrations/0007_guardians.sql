-- Portal orang tua: akun wali dihubungkan ke pemain lewat undangan dari akademi.
-- Wali bukan anggota staf (tanpa membership); aksesnya hanya ke anak yang terhubung.

CREATE TABLE bola.guardians (
  business_id uuid NOT NULL,
  player_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, user_id),
  FOREIGN KEY (business_id, player_id) REFERENCES bola.players (business_id, id) ON DELETE CASCADE
);
CREATE INDEX guardians_user_idx ON bola.guardians (user_id);
SELECT bola.enable_tenant_rls('bola.guardians');

CREATE TABLE bola.guardian_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  player_id uuid NOT NULL,
  email citext NOT NULL CHECK (length(email) <= 254),
  invited_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  FOREIGN KEY (business_id, player_id) REFERENCES bola.players (business_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX guardian_invitations_pending ON bola.guardian_invitations (player_id, email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX guardian_invitations_email_idx ON bola.guardian_invitations (email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
SELECT bola.enable_tenant_rls('bola.guardian_invitations');

-- Pemberitahuan izin/sakit dari wali sebelum latihan. Pelatih melihatnya di lembar absensi;
-- absensi tetap diisi pelatih.
CREATE TABLE bola.absence_notices (
  business_id uuid NOT NULL,
  session_id uuid NOT NULL,
  player_id uuid NOT NULL,
  status bola.attendance_status NOT NULL CHECK (status IN ('excused', 'sick')),
  note text CHECK (length(note) <= 200),
  created_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, player_id),
  FOREIGN KEY (business_id, session_id) REFERENCES bola.sessions (business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, player_id) REFERENCES bola.players (business_id, id) ON DELETE CASCADE
);
SELECT bola.enable_tenant_rls('bola.absence_notices');

-- Anak yang terhubung ke pengguna yang sedang masuk, lintas akademi.
CREATE FUNCTION bola.my_children()
RETURNS TABLE (business_id uuid, player_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  SELECT g.business_id, g.player_id
  FROM bola.guardians g
  JOIN bola.players p ON p.id = g.player_id
  WHERE g.user_id = core.current_user_id() AND p.status = 'active'
  ORDER BY g.created_at;
$$;

CREATE FUNCTION bola.my_guardian_invitations()
RETURNS TABLE (id uuid, academy_name text, player_name text, invited_by_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  SELECT i.id, b.name, p.full_name, u2.name
  FROM core.users u
  JOIN bola.guardian_invitations i ON i.email = u.email
  JOIN bola.players p ON p.id = i.player_id
  JOIN core.businesses b ON b.id = i.business_id
  LEFT JOIN core.users u2 ON u2.id = i.invited_by
  WHERE u.id = core.current_user_id()
    AND u.email_verified_at IS NOT NULL
    AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now()
  ORDER BY i.created_at;
$$;

CREATE FUNCTION bola.accept_guardian_invitation(p_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_user uuid := core.current_user_id();
  v_inv bola.guardian_invitations;
BEGIN
  IF v_user IS NULL THEN RETURN NULL; END IF;
  SELECT i.* INTO v_inv
  FROM bola.guardian_invitations i JOIN core.users u ON u.email = i.email
  WHERE i.id = p_id AND u.id = v_user AND u.email_verified_at IS NOT NULL
    AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now()
  FOR UPDATE OF i;
  IF NOT FOUND THEN RETURN NULL; END IF;

  PERFORM set_config('app.business_id', v_inv.business_id::text, true);

  INSERT INTO bola.guardians (business_id, player_id, user_id)
  VALUES (v_inv.business_id, v_inv.player_id, v_user)
  ON CONFLICT DO NOTHING;

  UPDATE bola.guardian_invitations SET accepted_at = now(), accepted_by = v_user WHERE id = p_id;

  INSERT INTO core.audit_events (business_id, actor_user_id, action, target_type, target_id)
  VALUES (v_inv.business_id, v_user, 'guardian.invitation_accepted', 'player', v_inv.player_id::text);

  RETURN v_inv.player_id;
END;
$$;

REVOKE ALL ON FUNCTION bola.my_children(), bola.my_guardian_invitations(), bola.accept_guardian_invitation(uuid)
  FROM PUBLIC;
