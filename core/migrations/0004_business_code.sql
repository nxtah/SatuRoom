-- ID bisnis: kode pendek yang diketik saat masuk, supaya satu orang dengan beberapa bisnis
-- tahu persis bisnis mana yang dibuka. Tanpa huruf yang mirip (0/O, 1/I/L).
CREATE FUNCTION core.new_business_code() RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text;
BEGIN
  LOOP
    candidate := '';
    FOR i IN 1..8 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM core.businesses WHERE code = candidate);
  END LOOP;
  RETURN candidate;
END $$;

ALTER TABLE core.businesses ADD COLUMN code text;
UPDATE core.businesses SET code = core.new_business_code() WHERE code IS NULL;
ALTER TABLE core.businesses
  ALTER COLUMN code SET NOT NULL,
  ALTER COLUMN code SET DEFAULT core.new_business_code(),
  ADD CONSTRAINT businesses_code_key UNIQUE (code),
  ADD CONSTRAINT businesses_code_format CHECK (code ~ '^[A-Z2-9]{8}$');

-- Peminta belum punya sesi saat masuk, jadi RLS bisnis tidak bisa dipakai: fungsi ini mencari
-- bisnis dari kode lalu memastikan penggunanya anggota aktif (atau akun pemain Bola) di dalamnya.
-- Hasilnya hanya id, atau NULL tanpa membedakan "kode salah" dari "bukan anggota".
CREATE FUNCTION core.login_business(p_code text, p_user uuid, p_product text) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = core, pg_temp AS $$
DECLARE
  found uuid;
BEGIN
  SELECT b.id INTO found FROM core.businesses b
  WHERE b.code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g')) AND b.product = p_product
    AND EXISTS (SELECT 1 FROM core.memberships m WHERE m.business_id = b.id AND m.user_id = p_user AND m.status = 'active');
  IF found IS NULL AND p_product = 'bola' AND to_regclass('bola.player_accounts') IS NOT NULL THEN
    EXECUTE $q$SELECT b.id FROM core.businesses b
      WHERE b.code = upper(regexp_replace($1, '[^A-Za-z0-9]', '', 'g')) AND b.product = 'bola'
        AND EXISTS (SELECT 1 FROM bola.player_accounts a WHERE a.business_id = b.id AND a.user_id = $2)$q$
      INTO found USING p_code, p_user;
  END IF;
  RETURN found;
END $$;

-- Pengguna yang belum punya bisnis di produk ini (baru daftar atau baru diundang) boleh masuk tanpa kode.
CREATE FUNCTION core.user_has_business(p_user uuid, p_product text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = core, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM core.memberships m JOIN core.businesses b ON b.id = m.business_id
                 WHERE m.user_id = p_user AND m.status = 'active' AND b.product = p_product)
$$;

REVOKE ALL ON FUNCTION core.login_business(text, uuid, text), core.user_has_business(uuid, text) FROM PUBLIC;
