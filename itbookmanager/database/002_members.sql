CREATE TABLE members (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_number       VARCHAR(20) UNIQUE NOT NULL,  -- MB-YYYYMM-NNN (자동 생성)
  firebase_uid        VARCHAR(128) UNIQUE,           -- Firebase 계정 생성 후 연결
  name                VARCHAR(100) NOT NULL,
  phone               VARCHAR(20),
  email               VARCHAR(255) UNIQUE NOT NULL,
  member_type         member_type NOT NULL DEFAULT 'subscription',
  member_status       member_status NOT NULL DEFAULT 'pending',

  -- 결제 플랜
  payment_plan_name   VARCHAR(100),
  plan_amount         INTEGER,                       -- 정상가 (KRW)
  plan_discounted_amt INTEGER,                       -- 실결제가 (KRW)
  payment_method      VARCHAR(50),

  joined_at           DATE,                          -- 활성화 일자
  payment_start_date  DATE,
  last_payment_date   DATE,
  next_payment_date   DATE,

  -- 콘텐츠 진도
  content_start_week  INTEGER DEFAULT 1,
  current_week        INTEGER DEFAULT 1,

  -- 태블릿 (빠른 조회용 역정규화)
  current_tablet_id   UUID,

  -- 관리회원 전용
  assigned_instructor VARCHAR(100),
  notes               TEXT,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  created_by          UUID
);

CREATE INDEX idx_members_type    ON members(member_type);
CREATE INDEX idx_members_status  ON members(member_status);
CREATE INDEX idx_members_email   ON members(email);
CREATE INDEX idx_members_number  ON members(member_number);
