-- 매장 배정: admin_users, tablets, members에 store_id 추가
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE tablets     ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE members     ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
