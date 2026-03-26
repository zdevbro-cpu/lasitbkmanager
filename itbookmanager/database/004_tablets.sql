CREATE TABLE tablets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code           VARCHAR(20) UNIQUE NOT NULL,  -- TAB-0001, TAB-0002, ...
  model_name        VARCHAR(100),
  serial_number     VARCHAR(100),
  purchase_date     DATE,
  purchase_price    INTEGER,                      -- KRW (환불 시 미반납 차감 기준)
  status            tablet_status NOT NULL DEFAULT 'stock',
  current_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  loan_start_date   DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_tablets_qr     ON tablets(qr_code);
CREATE INDEX idx_tablets_status        ON tablets(status);
CREATE INDEX idx_tablets_member        ON tablets(current_member_id);
