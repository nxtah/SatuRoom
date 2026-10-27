-- Kategori F&B memakai akun dan keanggotaan core yang sama, dengan schema domain terpisah.
ALTER TABLE core.businesses DROP CONSTRAINT businesses_product_check;
ALTER TABLE core.businesses ADD CONSTRAINT businesses_product_check CHECK (product IN ('bola', 'fnb'));
