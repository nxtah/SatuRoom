-- Jatah cabang (default 1 gratis, dinaikkan admin SatuRoom secara manual), permintaan cabang tambahan, dan transfer stok barang jadi antar cabang.
CREATE TABLE fnb.business_limits (
  business_id uuid PRIMARY KEY REFERENCES core.businesses(id) ON DELETE CASCADE,
  outlet_limit integer NOT NULL DEFAULT 1 CHECK (outlet_limit BETWEEN 1 AND 500),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE fnb.branch_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  requested_name text NOT NULL CHECK (length(requested_name) BETWEEN 2 AND 100),
  note text CHECK (note IS NULL OR length(note) <= 300),
  status text NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu', 'disetujui', 'ditolak', 'dibatalkan')),
  requested_by uuid REFERENCES core.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX branch_requests_one_open ON fnb.branch_requests (business_id) WHERE status = 'menunggu';

CREATE TABLE fnb.stock_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  number text NOT NULL,
  from_outlet_id uuid NOT NULL,
  to_outlet_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'dikirim', 'diterima', 'dibatalkan')),
  note text CHECK (note IS NULL OR length(note) <= 200),
  created_by uuid REFERENCES core.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz, sent_by uuid REFERENCES core.users(id),
  received_at timestamptz, received_by uuid REFERENCES core.users(id),
  cancelled_at timestamptz,
  UNIQUE (business_id, id),
  UNIQUE (business_id, number),
  FOREIGN KEY (business_id, from_outlet_id) REFERENCES fnb.outlets (business_id, id),
  FOREIGN KEY (business_id, to_outlet_id) REFERENCES fnb.outlets (business_id, id),
  CHECK (from_outlet_id <> to_outlet_id)
);
CREATE TABLE fnb.stock_transfer_lines (
  business_id uuid NOT NULL,
  transfer_id uuid NOT NULL,
  menu_item_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  received_quantity integer CHECK (received_quantity IS NULL OR received_quantity BETWEEN 0 AND quantity),
  PRIMARY KEY (transfer_id, menu_item_id),
  FOREIGN KEY (business_id, transfer_id) REFERENCES fnb.stock_transfers (business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, menu_item_id) REFERENCES fnb.menu_items (business_id, id)
);
SELECT fnb.enable_tenant_rls('fnb.business_limits');
SELECT fnb.enable_tenant_rls('fnb.branch_requests');
SELECT fnb.enable_tenant_rls('fnb.stock_transfers');
SELECT fnb.enable_tenant_rls('fnb.stock_transfer_lines');
