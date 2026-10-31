-- Peran buatan pemilik: nama bebas dan izin dipilih sendiri. Peran bawaan (enum staff_role) tetap berlaku
-- dan aksesnya digabung dengan peran custom.
CREATE TABLE bola.custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 40),
  description text CHECK (description IS NULL OR length(description) <= 160),
  permissions text[] NOT NULL CHECK (cardinality(permissions) BETWEEN 1 AND 40),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id)
);
CREATE UNIQUE INDEX custom_roles_name ON bola.custom_roles (business_id, lower(btrim(name))) WHERE archived_at IS NULL;

CREATE TABLE bola.staff_custom_roles (
  business_id uuid NOT NULL,
  membership_id uuid NOT NULL REFERENCES core.memberships(id) ON DELETE CASCADE,
  custom_role_id uuid NOT NULL,
  PRIMARY KEY (membership_id, custom_role_id),
  FOREIGN KEY (business_id, custom_role_id) REFERENCES bola.custom_roles (business_id, id) ON DELETE CASCADE
);
CREATE INDEX staff_custom_roles_business_idx ON bola.staff_custom_roles (business_id);

SELECT bola.enable_tenant_rls('bola.custom_roles');
SELECT bola.enable_tenant_rls('bola.staff_custom_roles');

-- Undangan boleh berisi peran custom saja; minimal satu peran apa pun.
ALTER TABLE bola.invitations ADD COLUMN custom_role_ids uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE bola.invitations DROP CONSTRAINT invitations_roles_check;
ALTER TABLE bola.invitations ADD CONSTRAINT invitations_roles_check
  CHECK (cardinality(roles) <= 5 AND cardinality(custom_role_ids) <= 20 AND cardinality(roles) + cardinality(custom_role_ids) >= 1);

-- Menerima undangan kini juga memasang peran custom yang masih aktif di akademi pengundang.
CREATE OR REPLACE FUNCTION bola.accept_invitation(p_id uuid) RETURNS uuid
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

  PERFORM set_config('app.business_id', v_inv.business_id::text, true);

  INSERT INTO core.memberships (business_id, user_id)
  VALUES (v_inv.business_id, v_user)
  ON CONFLICT (business_id, user_id) DO UPDATE SET status = 'active'
  RETURNING id INTO v_member;

  INSERT INTO bola.staff_roles (business_id, membership_id, role)
  SELECT v_inv.business_id, v_member, r FROM unnest(v_inv.roles) AS r
  ON CONFLICT DO NOTHING;

  INSERT INTO bola.staff_custom_roles (business_id, membership_id, custom_role_id)
  SELECT v_inv.business_id, v_member, c.id
  FROM bola.custom_roles c
  WHERE c.id = ANY (v_inv.custom_role_ids) AND c.business_id = v_inv.business_id AND c.archived_at IS NULL
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
REVOKE ALL ON FUNCTION bola.accept_invitation(uuid) FROM PUBLIC;
