-- 탈퇴 대기 상태 추가 (탈퇴 신청 → 유예기간 → 탈퇴 처리)
ALTER TYPE member_status ADD VALUE IF NOT EXISTS 'pending_withdrawal' BEFORE 'withdrawn';
