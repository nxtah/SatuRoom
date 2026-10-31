-- Program latihan (mis. "Reguler", "Elite", "Kiper") dan absensi staf (jadwal kerja, absen masuk/pulang,
-- pengajuan koreksi, cuti, lembur dengan persetujuan).

CREATE TABLE bola.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 80),
  level text CHECK (level IS NULL OR length(level) <= 40),
  description text CHECK (description IS NULL OR length(description) <= 500),
  -- Tarif bulanan anjuran; dipakai sebagai isian awal tarif tim.
  monthly_fee integer CHECK (monthly_fee IS NULL OR monthly_fee BETWEEN 0 AND 100000000),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, id)
);
CREATE UNIQUE INDEX programs_name ON bola.programs (business_id, lower(btrim(name))) WHERE archived_at IS NULL;
SELECT bola.enable_tenant_rls('bola.programs');

ALTER TABLE bola.teams ADD COLUMN program_id uuid;
ALTER TABLE bola.teams ADD CONSTRAINT teams_program_fk
  FOREIGN KEY (business_id, program_id) REFERENCES bola.programs (business_id, id);
CREATE INDEX teams_program_idx ON bola.teams (program_id);

-- Jadwal kerja mingguan staf.
CREATE TABLE bola.staff_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES core.memberships(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  start_time time NOT NULL,
  end_time time NOT NULL CHECK (end_time > start_time),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (membership_id, weekday)
);
CREATE INDEX staff_shifts_business_idx ON bola.staff_shifts (business_id);
SELECT bola.enable_tenant_rls('bola.staff_shifts');

-- Satu baris per staf per hari kerja.
CREATE TABLE bola.staff_clock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES core.memberships(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  clock_in timestamptz NOT NULL,
  clock_out timestamptz CHECK (clock_out IS NULL OR clock_out > clock_in),
  -- 'self' = absen sendiri, 'correction' = hasil koreksi yang disetujui.
  source text NOT NULL DEFAULT 'self' CHECK (source IN ('self', 'correction')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (membership_id, work_date)
);
CREATE INDEX staff_clock_business_date ON bola.staff_clock (business_id, work_date);
SELECT bola.enable_tenant_rls('bola.staff_clock');

CREATE TYPE bola.staff_request_kind AS ENUM ('correction', 'leave', 'overtime');
CREATE TYPE bola.staff_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

CREATE TABLE bola.staff_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES core.memberships(id) ON DELETE CASCADE,
  kind bola.staff_request_kind NOT NULL,
  date_from date NOT NULL,
  date_to date NOT NULL CHECK (date_to >= date_from),
  -- Koreksi: jam masuk/pulang yang benar.
  clock_in time,
  clock_out time,
  -- Lembur: menit.
  minutes integer CHECK (minutes IS NULL OR minutes BETWEEN 15 AND 960),
  -- Cuti: jenisnya.
  leave_type text CHECK (leave_type IS NULL OR leave_type IN ('annual', 'sick', 'personal', 'unpaid')),
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 3 AND 300),
  status bola.staff_request_status NOT NULL DEFAULT 'pending',
  decided_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  decision_note text CHECK (decision_note IS NULL OR length(decision_note) <= 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind <> 'correction' OR (date_from = date_to AND clock_in IS NOT NULL)),
  CHECK (kind <> 'overtime' OR (date_from = date_to AND minutes IS NOT NULL)),
  CHECK (kind <> 'leave' OR leave_type IS NOT NULL)
);
CREATE INDEX staff_requests_business_status ON bola.staff_requests (business_id, status);
SELECT bola.enable_tenant_rls('bola.staff_requests');
