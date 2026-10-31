-- Profil akademi: logo (URL Cloudinary di folder akademi sendiri) dan alamat lengkap.
ALTER TABLE bola.academy_settings
  ADD COLUMN logo_url text CHECK (logo_url IS NULL OR length(logo_url) <= 500),
  ADD COLUMN address text CHECK (address IS NULL OR length(address) <= 200);
