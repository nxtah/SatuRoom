CREATE TABLE fnb.cash_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
  outlet_id uuid NOT NULL,
  opened_by uuid REFERENCES core.users(id),
  opened_at timestamptz NOT NULL DEFAULT now(),
  opening_cash integer NOT NULL DEFAULT 0 CHECK (opening_cash >= 0),
  closed_by uuid REFERENCES core.users(id),
  closed_at timestamptz,
  closing_cash integer CHECK (closing_cash >= 0),
  notes text CHECK (length(notes) <= 300),
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, outlet_id) REFERENCES fnb.outlets (business_id, id)
);

CREATE UNIQUE INDEX cash_shifts_one_open ON fnb.cash_shifts (business_id) WHERE closed_at IS NULL;

ALTER TABLE fnb.payments
  ADD COLUMN shift_id uuid,
  ADD CONSTRAINT payments_shift_fk FOREIGN KEY (business_id, shift_id) REFERENCES fnb.cash_shifts (business_id, id);

SELECT fnb.enable_tenant_rls('fnb.cash_shifts');
