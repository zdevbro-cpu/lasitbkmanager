-- 태블릿 store_id가 NULL인 경우 본사로 복구
-- 022_add_hq_branch.sql 실행 후 이 스크립트를 실행하세요.
UPDATE tablets
SET store_id = (SELECT id FROM branches WHERE name = '본사' OR code = 'LA0000' ORDER BY code LIMIT 1),
    status = 'stock'
WHERE store_id IS NULL
  AND status IN ('stock', 'assigned');
