-- 회원 고유 QR 코드 컬럼 추가
ALTER TABLE members ADD COLUMN IF NOT EXISTS member_qr_code VARCHAR(20) UNIQUE;

-- 기존 회원에게 MBR-NNNNNN 형식 QR 코드 일괄 발급
DO $$
DECLARE
  rec RECORD;
  seq INTEGER := 1;
BEGIN
  FOR rec IN SELECT id FROM members WHERE member_qr_code IS NULL ORDER BY created_at ASC LOOP
    UPDATE members SET member_qr_code = 'MBR-' || LPAD(seq::TEXT, 6, '0') WHERE id = rec.id;
    seq := seq + 1;
  END LOOP;
END;
$$;
