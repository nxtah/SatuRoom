-- Token QR singkat untuk absensi pemain. Token asli hanya hidup di browser pemain;
-- database menyimpan hash agar token bocor tidak bisa dipakai setelah masa berlaku habis.
CREATE TABLE bola.attendance_qr_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  player_id uuid NOT NULL,
  token_hash bytea NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  consumed_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id, player_id) REFERENCES bola.players (business_id, id) ON DELETE CASCADE,
  CHECK (expires_at > created_at)
);
CREATE INDEX attendance_qr_tokens_player_active_idx ON bola.attendance_qr_tokens (player_id, expires_at DESC)
  WHERE consumed_at IS NULL;
SELECT bola.enable_tenant_rls('bola.attendance_qr_tokens');
