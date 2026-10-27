-- Masuk dengan Google: id akun Google (sub) yang tertaut ke akun ini.
ALTER TABLE core.users ADD COLUMN google_sub text UNIQUE;
