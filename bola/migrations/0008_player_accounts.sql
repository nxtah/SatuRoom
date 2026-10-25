-- Koreksi 0007: akun portal adalah akun PEMAIN, satu pemain satu akun (bukan akun orang tua
-- yang memegang beberapa anak). Pemain di bawah umur butuh persetujuan orang tua/wali (UU PDP),
-- jadi persetujuan dicatat saat undangan diterima.

DROP FUNCTION bola.my_children();
DROP FUNCTION bola.my_guardian_invitations();
DROP FUNCTION bola.accept_guardian_invitation(uuid);

ALTER TABLE bola.guardians RENAME TO player_accounts;
ALTER TABLE bola.player_accounts RENAME CONSTRAINT guardians_pkey TO player_accounts_pkey;
ALTER INDEX bola.guardians_user_idx RENAME TO player_accounts_user_idx;
-- Satu pemain paling banyak satu akun, satu akun paling banyak satu pemain.
DELETE FROM bola.player_accounts a USING bola.player_accounts b
  WHERE a.player_id = b.player_id AND (a.created_at, a.ctid) > (b.created_at, b.ctid);
DELETE FROM bola.player_accounts a USING bola.player_accounts b
  WHERE a.user_id = b.user_id AND (a.created_at, a.ctid) > (b.created_at, b.ctid);
ALTER TABLE bola.player_accounts ADD CONSTRAINT player_accounts_player_key UNIQUE (player_id);
ALTER TABLE bola.player_accounts ADD CONSTRAINT player_accounts_user_key UNIQUE (user_id);
ALTER TABLE bola.player_accounts ADD COLUMN consent_at timestamptz;
-- Siapa yang memberi persetujuan, sebagaimana diisi saat menerima undangan.
ALTER TABLE bola.player_accounts ADD COLUMN consent_by text CHECK (length(consent_by) <= 120);

ALTER TABLE bola.guardian_invitations RENAME TO player_invitations;
ALTER INDEX bola.guardian_invitations_pending RENAME TO player_invitations_pending_old;
DROP INDEX bola.player_invitations_pending_old;
UPDATE bola.player_invitations i SET revoked_at = now()
  WHERE accepted_at IS NULL AND revoked_at IS NULL
    AND EXISTS (SELECT 1 FROM bola.player_invitations j
                WHERE j.player_id = i.player_id AND j.accepted_at IS NULL AND j.revoked_at IS NULL
                  AND j.created_at > i.created_at);
-- Satu undangan aktif per pemain.
CREATE UNIQUE INDEX player_invitations_pending ON bola.player_invitations (player_id)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
ALTER INDEX bola.guardian_invitations_email_idx RENAME TO player_invitations_email_idx;

-- Pemain yang terhubung ke pengguna yang sedang masuk (paling banyak satu).
CREATE FUNCTION bola.my_player()
RETURNS TABLE (business_id uuid, player_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  SELECT a.business_id, a.player_id
  FROM bola.player_accounts a
  JOIN bola.players p ON p.id = a.player_id
  WHERE a.user_id = core.current_user_id() AND p.status = 'active';
$$;

CREATE FUNCTION bola.my_player_invitations()
RETURNS TABLE (id uuid, academy_name text, player_name text, birth_date date, invited_by_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  SELECT i.id, b.name, p.full_name, p.birth_date, u2.name
  FROM core.users u
  JOIN bola.player_invitations i ON i.email = u.email
  JOIN bola.players p ON p.id = i.player_id
  JOIN core.businesses b ON b.id = i.business_id
  LEFT JOIN core.users u2 ON u2.id = i.invited_by
  WHERE u.id = core.current_user_id()
    AND u.email_verified_at IS NOT NULL
    AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now()
  ORDER BY i.created_at;
$$;

-- Mengembalikan player_id, atau NULL bila undangan tidak sah, akun ini sudah terhubung ke pemain
-- lain, atau pemain ini sudah punya akun.
CREATE FUNCTION bola.accept_player_invitation(p_id uuid, p_consent_by text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_user uuid := core.current_user_id();
  v_inv bola.player_invitations;
BEGIN
  IF v_user IS NULL OR p_consent_by IS NULL OR length(trim(p_consent_by)) = 0 THEN RETURN NULL; END IF;
  SELECT i.* INTO v_inv
  FROM bola.player_invitations i JOIN core.users u ON u.email = i.email
  WHERE i.id = p_id AND u.id = v_user AND u.email_verified_at IS NOT NULL
    AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now()
  FOR UPDATE OF i;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM bola.player_accounts WHERE user_id = v_user OR player_id = v_inv.player_id) THEN
    RETURN NULL;
  END IF;

  PERFORM set_config('app.business_id', v_inv.business_id::text, true);

  INSERT INTO bola.player_accounts (business_id, player_id, user_id, consent_at, consent_by)
  VALUES (v_inv.business_id, v_inv.player_id, v_user, now(), left(trim(p_consent_by), 120));

  UPDATE bola.player_invitations SET accepted_at = now(), accepted_by = v_user WHERE id = p_id;

  INSERT INTO core.audit_events (business_id, actor_user_id, action, target_type, target_id)
  VALUES (v_inv.business_id, v_user, 'player_account.linked', 'player', v_inv.player_id::text);

  RETURN v_inv.player_id;
END;
$$;

REVOKE ALL ON FUNCTION bola.my_player(), bola.my_player_invitations(), bola.accept_player_invitation(uuid, text)
  FROM PUBLIC;
