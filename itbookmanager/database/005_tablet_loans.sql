-- 태블릿 대여/반납 전체 이력 (핵심 3가지 중 하나)
CREATE TABLE tablet_loans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tablet_id       UUID NOT NULL REFERENCES tablets(id) ON DELETE RESTRICT,
  member_id       UUID REFERENCES members(id) ON DELETE SET NULL,
  action          loan_action NOT NULL,
  action_date     TIMESTAMPTZ DEFAULT NOW(),
  returned_date   TIMESTAMPTZ,
  condition_ok    BOOLEAN,
  condition_notes TEXT,
  processed_by    UUID,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tablet_loans_tablet  ON tablet_loans(tablet_id);
CREATE INDEX idx_tablet_loans_member  ON tablet_loans(member_id);
CREATE INDEX idx_tablet_loans_date    ON tablet_loans(action_date);
