-- 대여 상태가 아닌 태블릿의 대여일 초기화
-- 024_restore_tablet_stores.sql 등으로 status가 변경됐지만 loan_start_date가 남아있는 경우 클리어
UPDATE tablets
SET loan_start_date = NULL
WHERE status != 'loaned'
  AND loan_start_date IS NOT NULL;
