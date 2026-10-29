-- Nama lokasi aktif tidak boleh kembar dalam satu akademi (lapangan, kolam, atau cabang).
CREATE UNIQUE INDEX locations_name_unique ON bola.locations (business_id, lower(name)) WHERE archived_at IS NULL;
