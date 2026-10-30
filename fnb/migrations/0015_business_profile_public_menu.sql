-- Profil bisnis (logo, alamat, kota tampilan) dan menu digital publik yang dibuka lewat QR.
ALTER TABLE fnb.settings
  ADD COLUMN business_logo_url text CHECK (business_logo_url IS NULL OR length(business_logo_url) <= 500),
  ADD COLUMN business_address text CHECK (business_address IS NULL OR length(business_address) <= 300),
  ADD COLUMN business_city text CHECK (business_city IS NULL OR length(business_city) <= 80),
  ADD COLUMN public_menu_enabled boolean NOT NULL DEFAULT true;

-- Satu-satunya pintu data tanpa login: hanya menu yang boleh dilihat pelanggan, per ID bisnis.
-- SECURITY DEFINER karena pengunjung tidak punya konteks tenant; yang dikembalikan sengaja dibatasi.
CREATE FUNCTION fnb.public_menu(p_code text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_biz core.businesses%ROWTYPE;
  v_set fnb.settings%ROWTYPE;
  v_outlet uuid;
  v_cats jsonb;
BEGIN
  SELECT * INTO v_biz FROM core.businesses WHERE product = 'fnb' AND code = upper(replace(trim(p_code), '-', ''));
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO v_set FROM fnb.settings WHERE business_id = v_biz.id;
  IF FOUND AND NOT v_set.public_menu_enabled THEN RETURN NULL; END IF;
  SELECT id INTO v_outlet FROM fnb.outlets WHERE business_id = v_biz.id AND is_primary AND archived_at IS NULL LIMIT 1;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', c.name, 'description', c.description, 'imageUrl', c.image_url,
      'items', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
            'id', i.id, 'name', i.name, 'description', i.description, 'imageUrl', i.image_url,
            'price', coalesce(o.price, i.price), 'available', i.is_available AND coalesce(o.is_available, true)
          ) ORDER BY i.sort_order, i.name), '[]'::jsonb)
        FROM fnb.menu_items i
        LEFT JOIN fnb.outlet_items o ON o.menu_item_id = i.id AND o.outlet_id = v_outlet
        WHERE i.category_id = c.id AND i.business_id = v_biz.id AND i.archived_at IS NULL AND i.show_in_pos)
    ) ORDER BY c.sort_order, c.name), '[]'::jsonb)
  INTO v_cats
  FROM fnb.menu_categories c WHERE c.business_id = v_biz.id AND c.archived_at IS NULL AND c.is_active;

  RETURN jsonb_build_object(
    'business', jsonb_build_object('name', v_biz.name, 'city', coalesce(v_set.business_city, v_biz.city), 'address', v_set.business_address, 'logoUrl', v_set.business_logo_url),
    'categories', (SELECT coalesce(jsonb_agg(c), '[]'::jsonb) FROM jsonb_array_elements(v_cats) c WHERE jsonb_array_length(c->'items') > 0),
    'at', now()
  );
END $$;
