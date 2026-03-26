-- 016_staff_roles.sql
-- 직무 역할 재편: superadmin→system_admin, staff→store_manager, young_creator 추가

-- 기존 CHECK 제약 제거
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;

-- 기존 데이터 마이그레이션
UPDATE admin_users SET role = 'system_admin' WHERE role = 'superadmin';
UPDATE admin_users SET role = 'store_manager' WHERE role = 'staff';

-- 기본값 변경
ALTER TABLE admin_users ALTER COLUMN role SET DEFAULT 'store_manager';

-- 새 CHECK 제약 추가
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check
  CHECK (role IN ('system_admin', 'store_manager', 'young_creator'));

-- 전화번호 컬럼 추가
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
