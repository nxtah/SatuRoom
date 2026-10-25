-- Peran Bendahara menambah jumlah peran; undangan boleh memuat sampai 5 peran.
ALTER TABLE bola.invitations DROP CONSTRAINT invitations_roles_check;
ALTER TABLE bola.invitations ADD CONSTRAINT invitations_roles_check CHECK (cardinality(roles) BETWEEN 1 AND 5);
