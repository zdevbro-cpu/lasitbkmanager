-- 복합 인덱스 (성능 최적화)
CREATE INDEX idx_members_type_status ON members(member_type, member_status);
CREATE INDEX idx_tablet_loans_tablet_action ON tablet_loans(tablet_id, action);
CREATE INDEX idx_mca_member_week ON member_content_access(member_id, week_number);
CREATE INDEX idx_mcp_member_completed ON member_content_progress(member_id, is_completed);
CREATE INDEX idx_payments_member_date ON payments(member_id, payment_date DESC);
