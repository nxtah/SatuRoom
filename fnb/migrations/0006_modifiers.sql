-- Varian dan add-on: grup pilihan (min/max) berisi opsi dengan harga tambahan, dipasang ke menu.
CREATE TABLE fnb.modifier_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 60),
  min_select smallint NOT NULL DEFAULT 0 CHECK (min_select >= 0),
  max_select smallint NOT NULL DEFAULT 1 CHECK (max_select >= 1),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (max_select >= min_select),
  UNIQUE (business_id, id)
);
CREATE TABLE fnb.modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  group_id uuid NOT NULL,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 60),
  price_delta integer NOT NULL DEFAULT 0 CHECK (price_delta BETWEEN 0 AND 10000000),
  is_available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  archived_at timestamptz,
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, group_id) REFERENCES fnb.modifier_groups (business_id, id) ON DELETE CASCADE
);
CREATE TABLE fnb.menu_item_groups (
  business_id uuid NOT NULL,
  menu_item_id uuid NOT NULL,
  group_id uuid NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (menu_item_id, group_id),
  FOREIGN KEY (business_id, menu_item_id) REFERENCES fnb.menu_items (business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, group_id) REFERENCES fnb.modifier_groups (business_id, id) ON DELETE CASCADE
);
-- Salinan nama dan harga opsi saat transaksi; mengubah menu tidak mengubah struk lama.
CREATE TABLE fnb.order_line_modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  order_line_id uuid NOT NULL,
  modifier_id uuid,
  name text NOT NULL,
  price_delta integer NOT NULL,
  FOREIGN KEY (business_id, order_line_id) REFERENCES fnb.order_lines (business_id, id) ON DELETE CASCADE
);
CREATE TABLE fnb.price_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  menu_item_id uuid NOT NULL,
  old_price integer NOT NULL,
  new_price integer NOT NULL,
  changed_by uuid REFERENCES core.users(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id, menu_item_id) REFERENCES fnb.menu_items (business_id, id) ON DELETE CASCADE
);
SELECT fnb.enable_tenant_rls('fnb.modifier_groups');
SELECT fnb.enable_tenant_rls('fnb.modifiers');
SELECT fnb.enable_tenant_rls('fnb.menu_item_groups');
SELECT fnb.enable_tenant_rls('fnb.order_line_modifiers');
SELECT fnb.enable_tenant_rls('fnb.price_changes');
