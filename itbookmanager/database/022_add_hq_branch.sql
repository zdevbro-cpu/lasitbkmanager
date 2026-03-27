-- 본사 지점 추가 (unique constraint 없는 환경에서도 안전하게 처리)
INSERT INTO branches (code, name)
SELECT 'LA0000', '본사'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE name = '본사' OR code = 'LA0000');
