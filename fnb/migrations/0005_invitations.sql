-- Undangan staf: penerima membuktikan diri lewat email terverifikasi, lalu menerima undangan.
CREATE TABLE fnb.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  email citext NOT NULL CHECK (length(email) <= 254),
  roles fnb.staff_role[] NOT NULL DEFAULT '{}',
  custom_role_ids uuid[] NOT NULL DEFAULT '{}',
  invited_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  CHECK (cardinality(roles) + cardinality(custom_role_ids) BETWEEN 1 AND 20)
);
CREATE UNIQUE INDEX invitations_pending ON fnb.invitations (business_id, email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX invitations_email_idx ON fnb.invitations (email) WHERE accepted_at IS NULL AND revoked_at IS NULL;
SELECT fnb.enable_tenant_rls('fnb.invitations');

CREATE FUNCTION fnb.my_invitations()
RETURNS TABLE (id uuid, business_name text, invited_by_name text, roles fnb.staff_role[], custom_roles text[], expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  SELECT i.id, b.name, u2.name, i.roles,
    COALESCE((SELECT array_agg(c.name ORDER BY c.name) FROM fnb.custom_roles c
      WHERE c.id = ANY(i.custom_role_ids) AND c.business_id = i.business_id AND c.archived_at IS NULL), '{}'),
    i.expires_at
  FROM core.users u
  JOIN fnb.invitations i ON i.email = u.email
  JOIN core.businesses b ON b.id = i.business_id
  LEFT JOIN core.users u2 ON u2.id = i.invited_by
  WHERE u.id = core.current_user_id()
    AND u.email_verified_at IS NOT NULL
    AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now()
  ORDER BY i.created_at;
$$;

CREATE FUNCTION fnb.accept_invitation(p_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_user uuid := core.current_user_id();
  v_inv fnb.invitations;
  v_member uuid;
BEGIN
  IF v_user IS NULL THEN RETURN NULL; END IF;
  SELECT i.* INTO v_inv
  FROM fnb.invitations i JOIN core.users u ON u.email = i.email
  WHERE i.id = p_id AND u.id = v_user AND u.email_verified_at IS NOT NULL
    AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now()
  FOR UPDATE OF i;
  IF NOT FOUND THEN RETURN NULL; END IF;

  PERFORM set_config('app.business_id', v_inv.business_id::text, true);

  INSERT INTO core.memberships (business_id, user_id)
  VALUES (v_inv.business_id, v_user)
  ON CONFLICT (business_id, user_id) DO UPDATE SET status = 'active'
  RETURNING id INTO v_member;

  INSERT INTO fnb.staff_roles (business_id, membership_id, role)
  SELECT v_inv.business_id, v_member, r FROM unnest(v_inv.roles) AS r
  ON CONFLICT DO NOTHING;

  INSERT INTO fnb.staff_custom_roles (business_id, membership_id, custom_role_id)
  SELECT v_inv.business_id, v_member, c.id FROM fnb.custom_roles c
  WHERE c.id = ANY(v_inv.custom_role_ids) AND c.business_id = v_inv.business_id AND c.archived_at IS NULL
  ON CONFLICT DO NOTHING;

  UPDATE fnb.invitations SET accepted_at = now(), accepted_by = v_user WHERE id = p_id;

  INSERT INTO core.audit_events (business_id, actor_user_id, action, target_type, target_id)
  VALUES (v_inv.business_id, v_user, 'fnb.staff.invitation_accepted', 'membership', v_member::text);

  RETURN v_inv.business_id;
END;
$$;
