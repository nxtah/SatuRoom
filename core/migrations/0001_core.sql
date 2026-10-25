-- Schema bersama semua produk SatuRoom: akun, sesi, bisnis, keanggotaan, audit.
-- Hanya folder core/ yang boleh mengubah schema ini.

CREATE EXTENSION IF NOT EXISTS citext;
CREATE SCHEMA IF NOT EXISTS core;

CREATE TABLE core.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  password_hash text NOT NULL,
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Token sesi disimpan sebagai hash SHA-256; nilai aslinya hanya ada di cookie pengguna.
CREATE TABLE core.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  token_hash bytea NOT NULL UNIQUE,
  product text NOT NULL,
  active_business_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_user_idx ON core.sessions (user_id);
CREATE INDEX sessions_expires_idx ON core.sessions (expires_at);

CREATE TYPE core.token_kind AS ENUM ('verify_email', 'reset_password');

CREATE TABLE core.auth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  kind core.token_kind NOT NULL,
  token_hash bytea NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_tokens_user_idx ON core.auth_tokens (user_id, kind);

-- Satu baris per bisnis. `product` menentukan aplikasi mana yang melayaninya (bola, nanti fnb).
CREATE TABLE core.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product text NOT NULL CHECK (product IN ('bola')),
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 100),
  city text CHECK (city IS NULL OR length(city) <= 80),
  timezone text NOT NULL DEFAULT 'Asia/Jakarta',
  created_by uuid NOT NULL REFERENCES core.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TYPE core.membership_status AS ENUM ('active', 'suspended', 'removed');

-- Keanggotaan mengikat pengguna ke bisnis. Peran dan izin dikelola tiap produk.
CREATE TABLE core.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  status core.membership_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id),
  UNIQUE (business_id, id)
);
CREATE INDEX memberships_user_idx ON core.memberships (user_id);

ALTER TABLE core.sessions
  ADD CONSTRAINT sessions_active_business_fk
  FOREIGN KEY (active_business_id) REFERENCES core.businesses(id) ON DELETE SET NULL;

-- Jejak aktivitas. Tidak menyimpan data pribadi di `meta`.
CREATE TABLE core.audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  business_id uuid REFERENCES core.businesses(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES core.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_business_idx ON core.audit_events (business_id, created_at DESC);

-- Isolasi antar-bisnis di level database. Aplikasi mengisi app.business_id per transaksi;
-- tanpa itu, baris milik bisnis tidak terlihat sama sekali.
CREATE FUNCTION core.current_business_id() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.business_id', true), '')::uuid $$;

ALTER TABLE core.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.audit_events FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_tenant ON core.audit_events
  USING (business_id = core.current_business_id())
  WITH CHECK (business_id IS NULL OR business_id = core.current_business_id());

CREATE FUNCTION core.current_user_id() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;

-- Keanggotaan terlihat bila milik bisnis aktif, atau milik pengguna yang sedang login
-- (untuk daftar "pilih akademi" sebelum ada bisnis aktif).
ALTER TABLE core.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.memberships FORCE ROW LEVEL SECURITY;
CREATE POLICY memberships_visible ON core.memberships
  USING (business_id = core.current_business_id() OR user_id = core.current_user_id())
  WITH CHECK (business_id = core.current_business_id());

-- Bisnis terlihat bila sedang aktif, atau pengguna adalah anggota aktifnya.
-- Saat membuat bisnis, aplikasi mengisi app.business_id dengan id baru lebih dulu.
ALTER TABLE core.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.businesses FORCE ROW LEVEL SECURITY;
CREATE POLICY businesses_visible ON core.businesses
  USING (
    id = core.current_business_id()
    OR EXISTS (
      SELECT 1 FROM core.memberships m
      WHERE m.business_id = businesses.id
        AND m.user_id = core.current_user_id()
        AND m.status = 'active'
    )
  )
  WITH CHECK (id = core.current_business_id());
