-- Cabang (multi-branch) dan saklar modul per akademi.
-- Cabang membawahi lokasi; tim mengikuti cabang lewat lokasinya, jadi data lama cukup dipetakan ke cabang utama.
CREATE TABLE bola.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 80),
  address text CHECK (address IS NULL OR length(address) <= 200),
  phone text CHECK (phone IS NULL OR length(phone) <= 30),
  is_primary boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id)
);
CREATE UNIQUE INDEX branches_name ON bola.branches (business_id, lower(btrim(name))) WHERE archived_at IS NULL;
CREATE UNIQUE INDEX branches_primary ON bola.branches (business_id) WHERE is_primary;
SELECT bola.enable_tenant_rls('bola.branches');

INSERT INTO bola.branches (business_id, name, is_primary)
SELECT id, 'Cabang utama', true FROM core.businesses WHERE product = 'bola';

ALTER TABLE bola.locations ADD COLUMN branch_id uuid;
UPDATE bola.locations l SET branch_id = b.id FROM bola.branches b WHERE b.business_id = l.business_id AND b.is_primary;
ALTER TABLE bola.locations ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE bola.locations ADD CONSTRAINT locations_branch_fk
  FOREIGN KEY (business_id, branch_id) REFERENCES bola.branches (business_id, id);
CREATE INDEX locations_branch_idx ON bola.locations (branch_id);

-- Staf dengan baris di sini hanya melihat data cabang tersebut. Tanpa baris = semua cabang.
CREATE TABLE bola.staff_branches (
  business_id uuid NOT NULL,
  membership_id uuid NOT NULL REFERENCES core.memberships(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL,
  PRIMARY KEY (membership_id, branch_id),
  FOREIGN KEY (business_id, branch_id) REFERENCES bola.branches (business_id, id) ON DELETE CASCADE
);
CREATE INDEX staff_branches_business_idx ON bola.staff_branches (business_id);
SELECT bola.enable_tenant_rls('bola.staff_branches');

ALTER TABLE bola.invitations ADD COLUMN branch_ids uuid[] NOT NULL DEFAULT '{}';

-- Modul yang dimatikan pemilik. Tidak ada baris = modul menyala (bawaan).
CREATE TABLE bola.academy_modules (
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  module text NOT NULL CHECK (module ~ '^[a-z_]{2,40}$'),
  enabled boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, module)
);
SELECT bola.enable_tenant_rls('bola.academy_modules');

-- Menerima undangan kini juga memasang batas cabang.
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

  INSERT INTO bola.staff_branches (business_id, membership_id, branch_id)
  SELECT v_inv.business_id, v_member, b.id
  FROM bola.branches b
  WHERE b.id = ANY (v_inv.branch_ids) AND b.business_id = v_inv.business_id AND b.archived_at IS NULL
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
