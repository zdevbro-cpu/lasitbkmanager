-- 회원 유형 변경 이력 (핵심 3가지 중 하나)
CREATE TABLE member_type_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  previous_type   member_type NOT NULL,
  new_type        member_type NOT NULL,
  changed_at      TIMESTAMPTZ DEFAULT NOW(),
  change_reason   TEXT,
  price_diff_krw  INTEGER,          -- 요금 차액 (예: +100000원/월)
  processed_by    UUID,             -- 처리한 관리자 ID
  notes           TEXT
);

CREATE INDEX idx_member_type_history_member  ON member_type_history(member_id);
CREATE INDEX idx_member_type_history_changed ON member_type_history(changed_at);
