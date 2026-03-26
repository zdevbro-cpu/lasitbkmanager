-- 매장 테이블
-- 코드 형식: LB[지역코드1자리][시리얼2자리] (예: LB101, LB201)
CREATE TABLE IF NOT EXISTS stores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(10) UNIQUE NOT NULL,   -- 예: LB101 (지역1자리+시리얼2자리)
  name        VARCHAR(100) UNIQUE NOT NULL,
  address     TEXT,
  phone       VARCHAR(20),
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
