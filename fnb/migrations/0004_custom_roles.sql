-- Peran custom: pemilik menyusun izin sendiri. Peran bawaan (enum staff_role) tetap berlaku.
CREATE TABLE fnb.custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 40),
  permissions text[] NOT NULL CHECK (cardinality(permissions) BETWEEN 1 AND 40),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id)
);
CREATE UNIQUE INDEX custom_roles_name ON fnb.custom_roles (business_id, lower(btrim(name))) WHERE archived_at IS NULL;

CREATE TABLE fnb.staff_custom_roles (
  business_id uuid NOT NULL,
  membership_id uuid NOT NULL REFERENCES core.memberships(id) ON DELETE CASCADE,
  custom_role_id uuid NOT NULL,
  PRIMARY KEY (membership_id, custom_role_id),
  FOREIGN KEY (business_id, custom_role_id) REFERENCES fnb.custom_roles (business_id, id) ON DELETE CASCADE
);

SELECT fnb.enable_tenant_rls('fnb.custom_roles');
SELECT fnb.enable_tenant_rls('fnb.staff_custom_roles');
