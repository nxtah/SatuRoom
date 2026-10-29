-- Jadwal latihan rutin, sesi (latihan/pertandingan per tanggal), dan absensi.

-- Jadwal rutin mingguan. Sesi per tanggal dibuat dari sini (lihat bola.generate_sessions).
CREATE TABLE bola.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  team_id uuid NOT NULL,
  location_id uuid NOT NULL,
  -- ISO: 1 = Senin ... 7 = Minggu.
  weekday smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  start_time time NOT NULL,
  duration_min smallint NOT NULL CHECK (duration_min BETWEEN 15 AND 300),
  starts_on date NOT NULL,
  -- Hari terakhir jadwal berlaku (inklusif); NULL = terus berulang.
  ends_on date,
  created_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  CHECK (ends_on IS NULL OR ends_on >= starts_on - 1),
  FOREIGN KEY (business_id, team_id) REFERENCES bola.teams (business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, location_id) REFERENCES bola.locations (business_id, id)
);
CREATE INDEX schedules_team_idx ON bola.schedules (team_id);
SELECT bola.enable_tenant_rls('bola.schedules');

CREATE TYPE bola.session_kind AS ENUM ('training', 'match');
CREATE TYPE bola.session_status AS ENUM ('scheduled', 'cancelled');

CREATE TABLE bola.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  team_id uuid NOT NULL,
  location_id uuid NOT NULL,
  schedule_id uuid,
  kind bola.session_kind NOT NULL DEFAULT 'training',
  title text CHECK (title IS NULL OR length(title) <= 80),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status bola.session_status NOT NULL DEFAULT 'scheduled',
  cancel_reason text CHECK (cancel_reason IS NULL OR length(cancel_reason) <= 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  -- Satu sesi per jadwal per waktu mulai: pembuatan ulang dari jadwal aman diulang.
  UNIQUE (schedule_id, starts_at),
  CHECK (ends_at > starts_at),
  FOREIGN KEY (business_id, team_id) REFERENCES bola.teams (business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, location_id) REFERENCES bola.locations (business_id, id),
  FOREIGN KEY (business_id, schedule_id) REFERENCES bola.schedules (business_id, id) ON DELETE SET NULL (schedule_id)
);
CREATE INDEX sessions_time_idx ON bola.sessions (business_id, starts_at);
CREATE INDEX sessions_team_time_idx ON bola.sessions (team_id, starts_at);
SELECT bola.enable_tenant_rls('bola.sessions');

-- Hadir / Izin / Sakit / Alpa (tanpa keterangan), seperti absensi sekolah.
CREATE TYPE bola.attendance_status AS ENUM ('present', 'excused', 'sick', 'absent');

CREATE TABLE bola.attendance (
  business_id uuid NOT NULL,
  session_id uuid NOT NULL,
  player_id uuid NOT NULL,
  status bola.attendance_status NOT NULL,
  recorded_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, player_id),
  FOREIGN KEY (business_id, session_id) REFERENCES bola.sessions (business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, player_id) REFERENCES bola.players (business_id, id) ON DELETE CASCADE
);
CREATE INDEX attendance_player_idx ON bola.attendance (player_id, recorded_at DESC);
SELECT bola.enable_tenant_rls('bola.attendance');

-- Membuat sesi dari jadwal rutin untuk rentang tanggal [from_date, to_date] di zona waktu akademi.
-- Aman diulang (ON CONFLICT). Berjalan dengan hak pemanggil, jadi RLS tetap berlaku.
CREATE FUNCTION bola.generate_sessions(from_date date, to_date date) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $$
  INSERT INTO bola.sessions (business_id, team_id, location_id, schedule_id, starts_at, ends_at)
  SELECT s.business_id, s.team_id, s.location_id, s.id,
         (d::date + s.start_time) AT TIME ZONE b.timezone,
         (d::date + s.start_time) AT TIME ZONE b.timezone + make_interval(mins => s.duration_min)
  FROM bola.schedules s
  JOIN core.businesses b ON b.id = s.business_id
  JOIN bola.teams t ON t.id = s.team_id AND t.archived_at IS NULL
  CROSS JOIN LATERAL generate_series(
    greatest(s.starts_on, from_date)::timestamp,
    least(coalesce(s.ends_on, to_date), to_date)::timestamp,
    interval '1 day'
  ) AS d
  WHERE extract(isodow FROM d) = s.weekday
  ON CONFLICT (schedule_id, starts_at) DO NOTHING;
$$;
