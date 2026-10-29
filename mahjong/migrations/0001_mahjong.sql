CREATE SCHEMA IF NOT EXISTS mahjong;

CREATE FUNCTION mahjong.enable_tenant_rls(tbl regclass) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tbl);
  EXECUTE format('CREATE POLICY tenant_isolation ON %s USING (business_id = core.current_business_id()) WITH CHECK (business_id = core.current_business_id())', tbl);
END $$;

CREATE TYPE mahjong.staff_role AS ENUM ('owner', 'manager', 'host', 'server', 'referee');

CREATE TABLE mahjong.staff_roles (
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES core.memberships(id) ON DELETE CASCADE,
  role mahjong.staff_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (membership_id, role)
);
SELECT mahjong.enable_tenant_rls('mahjong.staff_roles');

-- Aturan tarif dan reservasi untuk satu tempat.
CREATE TABLE mahjong.venue_settings (
  business_id uuid PRIMARY KEY REFERENCES core.businesses(id) ON DELETE CASCADE,
  billing_step_min smallint NOT NULL DEFAULT 30 CHECK (billing_step_min IN (10, 15, 30, 60)),
  min_minutes smallint NOT NULL DEFAULT 60 CHECK (min_minutes BETWEEN 0 AND 240),
  open_time time NOT NULL DEFAULT '10:00',
  close_time time NOT NULL DEFAULT '23:00',
  discount_silver smallint NOT NULL DEFAULT 5 CHECK (discount_silver BETWEEN 0 AND 50),
  discount_gold smallint NOT NULL DEFAULT 10 CHECK (discount_gold BETWEEN 0 AND 50),
  public_booking boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
SELECT mahjong.enable_tenant_rls('mahjong.venue_settings');

CREATE TABLE mahjong.mj_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 40),
  kind text NOT NULL DEFAULT 'auto' CHECK (kind IN ('auto', 'manual', 'vip')),
  seats smallint NOT NULL DEFAULT 4 CHECK (seats BETWEEN 2 AND 8),
  rate_per_hour integer NOT NULL CHECK (rate_per_hour BETWEEN 0 AND 10000000),
  is_maintenance boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id)
);
CREATE UNIQUE INDEX mj_tables_name_unique ON mahjong.mj_tables (business_id, lower(name)) WHERE archived_at IS NULL;
SELECT mahjong.enable_tenant_rls('mahjong.mj_tables');

CREATE TABLE mahjong.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (length(full_name) BETWEEN 2 AND 100),
  phone text CHECK (phone IS NULL OR phone ~ '^[0-9]{8,15}$'),
  tier text NOT NULL DEFAULT 'regular' CHECK (tier IN ('regular', 'silver', 'gold')),
  note text CHECK (length(note) <= 300),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id)
);
CREATE UNIQUE INDEX members_phone_unique ON mahjong.members (business_id, phone) WHERE phone IS NOT NULL AND archived_at IS NULL;
SELECT mahjong.enable_tenant_rls('mahjong.members');

CREATE TABLE mahjong.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  category text NOT NULL DEFAULT 'drink' CHECK (category IN ('drink', 'food', 'snack', 'other')),
  price integer NOT NULL CHECK (price BETWEEN 0 AND 10000000),
  -- NULL = stok tidak dilacak.
  stock integer CHECK (stock IS NULL OR stock >= 0),
  is_available boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id)
);
SELECT mahjong.enable_tenant_rls('mahjong.menu_items');

CREATE TABLE mahjong.play_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  table_id uuid NOT NULL,
  member_id uuid,
  guest_name text CHECK (length(guest_name) <= 80),
  players smallint NOT NULL DEFAULT 4 CHECK (players BETWEEN 1 AND 8),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'void')),
  rate_per_hour integer NOT NULL CHECK (rate_per_hour >= 0),
  step_min smallint NOT NULL,
  min_minutes smallint NOT NULL,
  discount_pct smallint NOT NULL DEFAULT 0,
  time_charge integer,
  fnb_total integer,
  discount_amount integer,
  total integer,
  booking_id uuid,
  note text CHECK (length(note) <= 200),
  opened_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  closed_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, table_id) REFERENCES mahjong.mj_tables (business_id, id),
  FOREIGN KEY (business_id, member_id) REFERENCES mahjong.members (business_id, id),
  CHECK ((status = 'open') = (ended_at IS NULL))
);
-- Satu meja hanya punya satu sesi berjalan.
CREATE UNIQUE INDEX play_sessions_one_open ON mahjong.play_sessions (table_id) WHERE status = 'open';
CREATE INDEX play_sessions_time_idx ON mahjong.play_sessions (business_id, started_at);
SELECT mahjong.enable_tenant_rls('mahjong.play_sessions');

CREATE TABLE mahjong.session_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  menu_item_id uuid,
  name text NOT NULL,
  unit_price integer NOT NULL CHECK (unit_price >= 0),
  qty smallint NOT NULL CHECK (qty BETWEEN 1 AND 99),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'served', 'void')),
  created_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, session_id) REFERENCES mahjong.play_sessions (business_id, id),
  FOREIGN KEY (business_id, menu_item_id) REFERENCES mahjong.menu_items (business_id, id)
);
CREATE INDEX session_orders_session_idx ON mahjong.session_orders (session_id);
SELECT mahjong.enable_tenant_rls('mahjong.session_orders');

CREATE TABLE mahjong.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  method text NOT NULL CHECK (method IN ('cash', 'qris', 'transfer', 'balance')),
  amount integer NOT NULL CHECK (amount > 0),
  created_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id, session_id) REFERENCES mahjong.play_sessions (business_id, id)
);
CREATE INDEX payments_session_idx ON mahjong.payments (session_id);
SELECT mahjong.enable_tenant_rls('mahjong.payments');

-- Buku saldo member. Saldo = jumlah seluruh baris; baris tidak pernah diubah atau dihapus.
CREATE TABLE mahjong.member_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  member_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('topup', 'spend', 'adjust', 'refund')),
  amount integer NOT NULL CHECK (amount <> 0),
  method text CHECK (method IN ('cash', 'qris', 'transfer')),
  session_id uuid,
  note text CHECK (length(note) <= 200),
  created_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id, member_id) REFERENCES mahjong.members (business_id, id),
  FOREIGN KEY (business_id, session_id) REFERENCES mahjong.play_sessions (business_id, id)
);
CREATE INDEX member_ledger_member_idx ON mahjong.member_ledger (member_id, created_at);
SELECT mahjong.enable_tenant_rls('mahjong.member_ledger');

CREATE TABLE mahjong.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  table_id uuid,
  member_id uuid,
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 80),
  phone text CHECK (phone IS NULL OR phone ~ '^[0-9]{8,15}$'),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  pax smallint NOT NULL DEFAULT 4 CHECK (pax BETWEEN 1 AND 8),
  -- requested: permintaan dari link publik, belum dapat meja. booked: meja sudah dipegang.
  status text NOT NULL DEFAULT 'booked' CHECK (status IN ('requested', 'booked', 'arrived', 'cancelled', 'no_show')),
  source text NOT NULL DEFAULT 'staff' CHECK (source IN ('staff', 'public')),
  deposit integer NOT NULL DEFAULT 0 CHECK (deposit >= 0),
  note text CHECK (length(note) <= 200),
  session_id uuid,
  created_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  CHECK (ends_at > starts_at),
  CHECK (status = 'requested' OR table_id IS NOT NULL OR status IN ('cancelled', 'no_show')),
  FOREIGN KEY (business_id, table_id) REFERENCES mahjong.mj_tables (business_id, id),
  FOREIGN KEY (business_id, member_id) REFERENCES mahjong.members (business_id, id)
);
CREATE INDEX bookings_time_idx ON mahjong.bookings (business_id, starts_at);
SELECT mahjong.enable_tenant_rls('mahjong.bookings');

CREATE TABLE mahjong.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 100),
  event_date date NOT NULL,
  entry_fee integer NOT NULL DEFAULT 0 CHECK (entry_fee BETWEEN 0 AND 100000000),
  rounds smallint NOT NULL DEFAULT 4 CHECK (rounds BETWEEN 1 AND 12),
  -- Poin klasemen untuk peringkat 1 sampai 4 di tiap meja.
  rank_points smallint[] NOT NULL DEFAULT '{4,2,1,0}' CHECK (cardinality(rank_points) = 4),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'done')),
  note text CHECK (length(note) <= 300),
  created_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id)
);
SELECT mahjong.enable_tenant_rls('mahjong.tournaments');

CREATE TABLE mahjong.tournament_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  tournament_id uuid NOT NULL,
  member_id uuid,
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 80),
  paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, tournament_id) REFERENCES mahjong.tournaments (business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, member_id) REFERENCES mahjong.members (business_id, id)
);
CREATE UNIQUE INDEX tournament_players_name ON mahjong.tournament_players (tournament_id, lower(name));
SELECT mahjong.enable_tenant_rls('mahjong.tournament_players');

CREATE TABLE mahjong.tournament_seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  tournament_id uuid NOT NULL,
  round_no smallint NOT NULL CHECK (round_no >= 1),
  table_no smallint NOT NULL CHECK (table_no >= 1),
  seat_no smallint NOT NULL CHECK (seat_no BETWEEN 1 AND 4),
  player_id uuid NOT NULL,
  score integer,
  UNIQUE (tournament_id, round_no, player_id),
  UNIQUE (tournament_id, round_no, table_no, seat_no),
  FOREIGN KEY (business_id, tournament_id) REFERENCES mahjong.tournaments (business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, player_id) REFERENCES mahjong.tournament_players (business_id, id) ON DELETE CASCADE
);
SELECT mahjong.enable_tenant_rls('mahjong.tournament_seats');

-- Undangan staf (pola sama dengan produk lain: bukti penerima adalah email terverifikasi).
CREATE TABLE mahjong.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  email citext NOT NULL CHECK (length(email) <= 254),
  roles mahjong.staff_role[] NOT NULL CHECK (cardinality(roles) BETWEEN 1 AND 5),
  invited_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  revoked_at timestamptz
);
CREATE UNIQUE INDEX invitations_pending ON mahjong.invitations (business_id, email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX invitations_email_idx ON mahjong.invitations (email) WHERE accepted_at IS NULL AND revoked_at IS NULL;
SELECT mahjong.enable_tenant_rls('mahjong.invitations');

CREATE FUNCTION mahjong.my_invitations()
RETURNS TABLE (id uuid, venue_name text, invited_by_name text, roles mahjong.staff_role[], expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  SELECT i.id, b.name, u2.name, i.roles, i.expires_at
  FROM core.users u
  JOIN mahjong.invitations i ON i.email = u.email
  JOIN core.businesses b ON b.id = i.business_id
  LEFT JOIN core.users u2 ON u2.id = i.invited_by
  WHERE u.id = core.current_user_id()
    AND u.email_verified_at IS NOT NULL
    AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now()
  ORDER BY i.created_at;
$$;

CREATE FUNCTION mahjong.accept_invitation(p_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_user uuid := core.current_user_id();
  v_inv mahjong.invitations;
  v_member uuid;
BEGIN
  IF v_user IS NULL THEN RETURN NULL; END IF;
  SELECT i.* INTO v_inv
  FROM mahjong.invitations i JOIN core.users u ON u.email = i.email
  WHERE i.id = p_id AND u.id = v_user AND u.email_verified_at IS NOT NULL
    AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now()
  FOR UPDATE OF i;
  IF NOT FOUND THEN RETURN NULL; END IF;

  PERFORM set_config('app.business_id', v_inv.business_id::text, true);

  INSERT INTO core.memberships (business_id, user_id)
  VALUES (v_inv.business_id, v_user)
  ON CONFLICT (business_id, user_id) DO UPDATE SET status = 'active'
  RETURNING id INTO v_member;

  INSERT INTO mahjong.staff_roles (business_id, membership_id, role)
  SELECT v_inv.business_id, v_member, r FROM unnest(v_inv.roles) AS r
  ON CONFLICT DO NOTHING;

  UPDATE mahjong.invitations SET accepted_at = now(), accepted_by = v_user WHERE id = p_id;

  INSERT INTO core.audit_events (business_id, actor_user_id, action, target_type, target_id)
  VALUES (v_inv.business_id, v_user, 'staff.invitation_accepted', 'membership', v_member::text);

  RETURN v_inv.business_id;
END;
$$;

-- Halaman booking publik: tamu tanpa akun hanya bisa mengajukan permintaan; staf yang memberi meja.
CREATE FUNCTION mahjong.venue_public(p_code text)
RETURNS TABLE (venue_name text, city text, open_time text, close_time text, timezone text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  SELECT b.name, b.city, to_char(s.open_time, 'HH24:MI'), to_char(s.close_time, 'HH24:MI'), b.timezone
  FROM core.businesses b JOIN mahjong.venue_settings s ON s.business_id = b.id
  WHERE b.product = 'mahjong' AND b.code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g')) AND s.public_booking;
$$;

-- Hasil: 'created', 'closed' (link mati/salah), 'invalid' (waktu di luar batas), 'duplicate', atau 'full'.
CREATE FUNCTION mahjong.submit_booking(
  p_code text, p_name text, p_phone text, p_starts_at timestamptz, p_duration_min integer, p_pax integer, p_note text
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_business uuid;
  v_id uuid;
BEGIN
  SELECT b.id INTO v_business
  FROM core.businesses b JOIN mahjong.venue_settings s ON s.business_id = b.id
  WHERE b.product = 'mahjong' AND b.code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g')) AND s.public_booking;
  IF NOT FOUND THEN RETURN 'closed'; END IF;
  IF p_starts_at < now() OR p_starts_at > now() + interval '60 days'
     OR p_duration_min NOT BETWEEN 60 AND 480 OR p_pax NOT BETWEEN 1 AND 8
     OR length(trim(p_name)) NOT BETWEEN 2 AND 80 OR p_phone !~ '^[0-9]{8,15}$' THEN
    RETURN 'invalid';
  END IF;

  PERFORM set_config('app.business_id', v_business::text, true);
  IF (SELECT count(*) FROM mahjong.bookings WHERE status = 'requested') >= 100 THEN RETURN 'full'; END IF;

  INSERT INTO mahjong.bookings (business_id, name, phone, starts_at, ends_at, pax, status, source, note)
  SELECT v_business, trim(p_name), p_phone, p_starts_at, p_starts_at + make_interval(mins => p_duration_min),
         p_pax, 'requested', 'public', nullif(trim(coalesce(p_note, '')), '')
  WHERE NOT EXISTS (
    SELECT 1 FROM mahjong.bookings
    WHERE phone = p_phone AND starts_at = p_starts_at AND status IN ('requested', 'booked'))
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN RETURN 'duplicate'; END IF;

  INSERT INTO core.audit_events (business_id, actor_user_id, action, target_type, target_id)
  VALUES (v_business, NULL, 'booking.requested', 'booking', v_id::text);
  RETURN 'created';
END;
$$;

REVOKE ALL ON FUNCTION mahjong.my_invitations(), mahjong.accept_invitation(uuid), mahjong.venue_public(text),
  mahjong.submit_booking(text, text, text, timestamptz, integer, integer, text) FROM PUBLIC;
