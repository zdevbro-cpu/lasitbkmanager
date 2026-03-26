-- 1. admin_users 테이블 컬럼명 변경 (기존 데이터 유지)
ALTER TABLE admin_users RENAME COLUMN firebase_uid TO auth_uid;

-- 2. members 테이블 컬럼명 변경 (기존 데이터 유지)
ALTER TABLE members RENAME COLUMN firebase_uid TO auth_uid;

-- 3. 필요한 경우 인덱스 확인 (RENAME 시 인덱스도 자동 반영되지만 확인 필요)
-- ALTER INDEX idx_members_firebase_uid RENAME TO idx_members_auth_uid;
