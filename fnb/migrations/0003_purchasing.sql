-- Supplier dan pembelian bahan. Penerimaan barang menambah stok dan memperbarui harga rata-rata.
CREATE TABLE fnb.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 100),
  phone text CHECK (phone IS NULL OR phone ~ '^\+?[0-9 -]{8,20}$'),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id)
);
CREATE UNIQUE INDEX suppliers_name_active ON fnb.suppliers (business_id, lower(name)) WHERE archived_at IS NULL;

CREATE TABLE fnb.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  supplier_id uuid,
  total integer NOT NULL CHECK (total >= 0),
  notes text CHECK (notes IS NULL OR length(notes) <= 300),
  recorded_by uuid REFERENCES core.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, supplier_id) REFERENCES fnb.suppliers (business_id, id)
);
CREATE INDEX purchases_recent_idx ON fnb.purchases (business_id, created_at DESC);

CREATE TABLE fnb.purchase_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  purchase_id uuid NOT NULL,
  ingredient_id uuid NOT NULL,
  quantity numeric(14,3) NOT NULL CHECK (quantity > 0),
  unit_cost integer NOT NULL CHECK (unit_cost >= 0),
  FOREIGN KEY (business_id, purchase_id) REFERENCES fnb.purchases (business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, ingredient_id) REFERENCES fnb.ingredients (business_id, id)
);

SELECT fnb.enable_tenant_rls('fnb.suppliers');
SELECT fnb.enable_tenant_rls('fnb.purchases');
SELECT fnb.enable_tenant_rls('fnb.purchase_lines');
