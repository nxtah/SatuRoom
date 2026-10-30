-- Diskon bernama: berlaku ke seluruh pesanan, satu kategori, atau satu menu; bisa dijadwalkan dan otomatis.
CREATE TABLE fnb.discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 60),
  kind text NOT NULL CHECK (kind IN ('percent', 'amount')),
  value integer NOT NULL CHECK (value > 0),
  scope text NOT NULL DEFAULT 'order' CHECK (scope IN ('order', 'category', 'item')),
  category_id uuid,
  menu_item_id uuid,
  min_spend integer NOT NULL DEFAULT 0 CHECK (min_spend >= 0),
  days smallint[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}' CHECK (days <@ ARRAY[0,1,2,3,4,5,6]::smallint[] AND cardinality(days) > 0),
  start_time time,
  end_time time,
  starts_on date,
  ends_on date,
  order_type_ids uuid[] NOT NULL DEFAULT '{}',
  auto_apply boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  CHECK (kind <> 'percent' OR value <= 100),
  CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on),
  CHECK ((start_time IS NULL) = (end_time IS NULL)),
  CHECK ((scope = 'order' AND category_id IS NULL AND menu_item_id IS NULL)
      OR (scope = 'category' AND category_id IS NOT NULL AND menu_item_id IS NULL)
      OR (scope = 'item' AND menu_item_id IS NOT NULL AND category_id IS NULL)),
  FOREIGN KEY (business_id, category_id) REFERENCES fnb.menu_categories (business_id, id),
  FOREIGN KEY (business_id, menu_item_id) REFERENCES fnb.menu_items (business_id, id)
);
CREATE UNIQUE INDEX discounts_name_active ON fnb.discounts (business_id, lower(name)) WHERE archived_at IS NULL;
ALTER TABLE fnb.orders
  ADD COLUMN discount_id uuid,
  ADD FOREIGN KEY (business_id, discount_id) REFERENCES fnb.discounts (business_id, id);
SELECT fnb.enable_tenant_rls('fnb.discounts');
