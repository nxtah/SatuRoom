-- Undangan staf. Bukti penerima adalah email terverifikasi yang sama dengan email undangan,
-- jadi link di email cukup mengarah ke halaman /undangan (tanpa token rahasia).

CREATE TABLE bola.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  email citext NOT NULL CHECK (length(email) <= 254),
  roles bola.staff_role[] NOT NULL CHECK (cardinality(roles) BETWEEN 1 AND 4),
  team_ids uuid[] NOT NULL DEFAULT '{}',
  invited_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  revoked_at timestamptz
);
-- Satu undangan aktif per email per akademi.
CREATE UNIQUE INDEX invitations_pending ON bola.invitations (business_id, email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX invitations_email_idx ON bola.invitations (email) WHERE accepted_at IS NULL AND revoked_at IS NULL;
SELECT bola.enable_tenant_rls('bola.invitations');

-- Undangan yang menunggu untuk pengguna saat ini (core.current_user_id), lintas akademi.
-- SECURITY DEFINER karena undangan milik akademi lain; hanya mengembalikan undangan untuk email
-- terverifikasi pengguna itu sendiri.
CREATE FUNCTION bola.my_invitations()
RETURNS TABLE (id uuid, academy_name text, invited_by_name text, roles bola.staff_role[], expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  SELECT i.id, b.name, u2.name, i.roles, i.expires_at
  FROM core.users u
  JOIN bola.invitations i ON i.email = u.email
  JOIN core.businesses b ON b.id = i.business_id
  LEFT JOIN core.users u2 ON u2.id = i.invited_by
  WHERE u.id = core.current_user_id()
    AND u.email_verified_at IS NOT NULL
    AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now()
  ORDER BY i.created_at;
$$;

-- Menerima undangan: membuat/mengaktifkan keanggotaan, menambah peran, dan menugaskan ke tim.
-- Mengembalikan business_id, atau NULL bila undangan tidak berlaku untuk pengguna ini.
CREATE FUNCTION bola.accept_invitation(p_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_user uuid := core.current_user_id();
  v_inv bola.invitations;
  v_member uuid;
BEGIN
  IF v_user IS NULL THEN RETURN NULL; END IF;
  SELECT i.* INTO v_inv
  FROM bola.invitations i JOIN core.users u ON u.email = i.email
  WHERE i.id = p_id AND u.id = v_user AND u.email_verified_at IS NOT NULL
    AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now()
  FOR UPDATE OF i;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Semua tulisan berikut tetap melewati RLS untuk akademi pengundang.
  PERFORM set_config('app.business_id', v_inv.business_id::text, true);

  INSERT INTO core.memberships (business_id, user_id)
  VALUES (v_inv.business_id, v_user)
  ON CONFLICT (business_id, user_id) DO UPDATE SET status = 'active'
  RETURNING id INTO v_member;

  INSERT INTO bola.staff_roles (business_id, membership_id, role)
  SELECT v_inv.business_id, v_member, r FROM unnest(v_inv.roles) AS r
  ON CONFLICT DO NOTHING;

  INSERT INTO bola.team_coaches (business_id, team_id, membership_id)
  SELECT v_inv.business_id, t.id, v_member
  FROM bola.teams t
  WHERE t.id = ANY (v_inv.team_ids) AND t.business_id = v_inv.business_id AND t.archived_at IS NULL
  ON CONFLICT DO NOTHING;

  UPDATE bola.invitations SET accepted_at = now(), accepted_by = v_user WHERE id = p_id;

  INSERT INTO core.audit_events (business_id, actor_user_id, action, target_type, target_id)
  VALUES (v_inv.business_id, v_user, 'staff.invitation_accepted', 'membership', v_member::text);

  RETURN v_inv.business_id;
END;
$$;

REVOKE ALL ON FUNCTION bola.my_invitations(), bola.accept_invitation(uuid) FROM PUBLIC;
