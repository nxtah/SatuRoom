CREATE SCHEMA IF NOT EXISTS fnb;

CREATE FUNCTION fnb.enable_tenant_rls(tbl regclass) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tbl);
  EXECUTE format('CREATE POLICY tenant_isolation ON %s USING (business_id = core.current_business_id()) WITH CHECK (business_id = core.current_business_id())', tbl);
END $$;

CREATE TYPE fnb.staff_role AS ENUM ('owner', 'manager', 'cashier', 'server', 'kitchen', 'inventory', 'accounting');

CREATE TABLE fnb.outlets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 100),
  address text CHECK (length(address) <= 300),
  is_primary boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id)
);

CREATE TABLE fnb.staff_roles (
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES core.memberships(id) ON DELETE CASCADE,
  role fnb.staff_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (membership_id, role)
);

CREATE TABLE fnb.staff_outlets (
  business_id uuid NOT NULL,
  membership_id uuid NOT NULL REFERENCES core.memberships(id) ON DELETE CASCADE,
  outlet_id uuid NOT NULL,
  PRIMARY KEY (membership_id, outlet_id),
  FOREIGN KEY (business_id, outlet_id) REFERENCES fnb.outlets (business_id, id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX outlets_one_primary ON fnb.outlets (business_id) WHERE is_primary AND archived_at IS NULL;
SELECT fnb.enable_tenant_rls('fnb.outlets');
SELECT fnb.enable_tenant_rls('fnb.staff_roles');
SELECT fnb.enable_tenant_rls('fnb.staff_outlets');

CREATE TABLE fnb.kitchen_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL, outlet_id uuid NOT NULL,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 60), color text NOT NULL DEFAULT '#317159',
  archived_at timestamptz, UNIQUE (business_id, id),
  FOREIGN KEY (business_id, outlet_id) REFERENCES fnb.outlets (business_id, id)
);
CREATE TABLE fnb.menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL, name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0, archived_at timestamptz, UNIQUE (business_id, id)
);
CREATE TABLE fnb.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL, category_id uuid NOT NULL,
  station_id uuid, name text NOT NULL CHECK (length(name) BETWEEN 1 AND 100), description text,
  price integer NOT NULL CHECK (price >= 0), is_available boolean NOT NULL DEFAULT true,
  archived_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (business_id, id),
  FOREIGN KEY (business_id, category_id) REFERENCES fnb.menu_categories (business_id, id),
  FOREIGN KEY (business_id, station_id) REFERENCES fnb.kitchen_stations (business_id, id)
);

CREATE TYPE fnb.order_type AS ENUM ('dine_in', 'takeaway', 'pickup');
CREATE TYPE fnb.order_status AS ENUM ('open', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled');
CREATE TYPE fnb.payment_method AS ENUM ('cash', 'transfer', 'qris', 'card', 'other');
CREATE TABLE fnb.dining_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL, outlet_id uuid NOT NULL,
  name text NOT NULL, capacity smallint CHECK (capacity > 0), archived_at timestamptz, UNIQUE (business_id, id),
  FOREIGN KEY (business_id, outlet_id) REFERENCES fnb.outlets (business_id, id)
);
CREATE TABLE fnb.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL, outlet_id uuid NOT NULL,
  table_id uuid, order_number bigint GENERATED ALWAYS AS IDENTITY, type fnb.order_type NOT NULL,
  status fnb.order_status NOT NULL DEFAULT 'open', customer_name text, subtotal integer NOT NULL DEFAULT 0,
  discount integer NOT NULL DEFAULT 0, tax integer NOT NULL DEFAULT 0, service_charge integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0, notes text, opened_by uuid REFERENCES core.users(id),
  opened_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz, cancelled_at timestamptz,
  cancel_reason text, UNIQUE (business_id, id),
  FOREIGN KEY (business_id, outlet_id) REFERENCES fnb.outlets (business_id, id),
  FOREIGN KEY (business_id, table_id) REFERENCES fnb.dining_tables (business_id, id)
);
CREATE TABLE fnb.order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL, order_id uuid NOT NULL,
  menu_item_id uuid NOT NULL, station_id uuid, item_name text NOT NULL, unit_price integer NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0), notes text, status fnb.order_status NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (business_id, id),
  FOREIGN KEY (business_id, order_id) REFERENCES fnb.orders (business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, menu_item_id) REFERENCES fnb.menu_items (business_id, id),
  FOREIGN KEY (business_id, station_id) REFERENCES fnb.kitchen_stations (business_id, id)
);
CREATE TABLE fnb.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL, order_id uuid NOT NULL,
  amount integer NOT NULL CHECK (amount > 0), method fnb.payment_method NOT NULL,
  recorded_by uuid REFERENCES core.users(id), recorded_at timestamptz NOT NULL DEFAULT now(),
  voided_at timestamptz, void_reason text,
  FOREIGN KEY (business_id, order_id) REFERENCES fnb.orders (business_id, id)
);

CREATE TABLE fnb.ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL, outlet_id uuid NOT NULL,
  name text NOT NULL, unit text NOT NULL, stock numeric(14,3) NOT NULL DEFAULT 0,
  minimum_stock numeric(14,3) NOT NULL DEFAULT 0, average_cost integer NOT NULL DEFAULT 0,
  archived_at timestamptz, UNIQUE (business_id, id),
  FOREIGN KEY (business_id, outlet_id) REFERENCES fnb.outlets (business_id, id)
);
CREATE TABLE fnb.recipes (
  business_id uuid NOT NULL, menu_item_id uuid NOT NULL, ingredient_id uuid NOT NULL,
  quantity numeric(14,3) NOT NULL CHECK (quantity > 0), PRIMARY KEY (menu_item_id, ingredient_id),
  FOREIGN KEY (business_id, menu_item_id) REFERENCES fnb.menu_items (business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, ingredient_id) REFERENCES fnb.ingredients (business_id, id)
);
CREATE TABLE fnb.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL, ingredient_id uuid NOT NULL,
  quantity numeric(14,3) NOT NULL CHECK (quantity <> 0), reason text NOT NULL,
  reference_type text, reference_id uuid, recorded_by uuid REFERENCES core.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id, ingredient_id) REFERENCES fnb.ingredients (business_id, id)
);

SELECT fnb.enable_tenant_rls('fnb.kitchen_stations');
SELECT fnb.enable_tenant_rls('fnb.menu_categories');
SELECT fnb.enable_tenant_rls('fnb.menu_items');
SELECT fnb.enable_tenant_rls('fnb.dining_tables');
SELECT fnb.enable_tenant_rls('fnb.orders');
SELECT fnb.enable_tenant_rls('fnb.order_lines');
SELECT fnb.enable_tenant_rls('fnb.payments');
SELECT fnb.enable_tenant_rls('fnb.ingredients');
SELECT fnb.enable_tenant_rls('fnb.recipes');
SELECT fnb.enable_tenant_rls('fnb.stock_movements');
