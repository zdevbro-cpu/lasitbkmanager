CREATE TABLE payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id             UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  amount_paid           INTEGER NOT NULL,        -- 실결제금액 (KRW)
  amount_full_price     INTEGER NOT NULL,        -- 정상가 (환불 계산 기준)
  payment_method        VARCHAR(50),
  payment_date          DATE NOT NULL,
  billing_period_start  DATE,
  billing_period_end    DATE,
  status                payment_status DEFAULT 'paid',
  invoice_number        VARCHAR(50) UNIQUE,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  created_by            UUID
);

CREATE INDEX idx_payments_member ON payments(member_id);
CREATE INDEX idx_payments_date   ON payments(payment_date);
CREATE INDEX idx_payments_status ON payments(status);
