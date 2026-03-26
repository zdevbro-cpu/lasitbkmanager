CREATE TABLE refunds (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id             UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  payment_id            UUID REFERENCES payments(id) ON DELETE RESTRICT,

  -- 환불 계산 내역
  payment_amount        INTEGER NOT NULL,        -- 정상가 기준 금액
  usage_months          NUMERIC(4,2),
  usage_fee             INTEGER NOT NULL,
  penalty_rate          NUMERIC(5,2) DEFAULT 0,
  penalty_amount        INTEGER DEFAULT 0,
  tablet_deduction      INTEGER DEFAULT 0,       -- 태블릿 미반납 차감액
  refund_amount         INTEGER NOT NULL,        -- 최종 환불금액

  status                refund_status DEFAULT 'requested',
  reason                TEXT NOT NULL,
  tablet_returned       BOOLEAN DEFAULT FALSE,
  refund_date           DATE,
  processed_by          UUID,
  notes                 TEXT,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refunds_member ON refunds(member_id);
CREATE INDEX idx_refunds_status ON refunds(status);
