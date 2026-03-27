-- tablet_loans에 대여 담당자 이름 텍스트 컬럼 추가
-- processed_by(UUID)가 integer PK 테이블과 매핑 안 되는 문제를 우회
ALTER TABLE tablet_loans ADD COLUMN IF NOT EXISTS loan_officer_name TEXT;
