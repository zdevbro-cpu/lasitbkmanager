-- Fix store_id FK: stores(id) → branches(id)
-- Migration 020이 잘못된 테이블(stores)을 참조하여 store_id가 항상 null이었던 문제 수정

ALTER TABLE members DROP CONSTRAINT IF EXISTS members_store_id_fkey;
ALTER TABLE tablets DROP CONSTRAINT IF EXISTS tablets_store_id_fkey;

ALTER TABLE members ADD CONSTRAINT members_store_id_fkey
  FOREIGN KEY (store_id) REFERENCES branches(id) ON DELETE SET NULL;

ALTER TABLE tablets ADD CONSTRAINT tablets_store_id_fkey
  FOREIGN KEY (store_id) REFERENCES branches(id) ON DELETE SET NULL;
