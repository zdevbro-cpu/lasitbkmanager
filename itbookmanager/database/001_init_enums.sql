-- 회원 유형
CREATE TYPE member_type AS ENUM ('managed', 'subscription');
-- managed = 관리회원, subscription = 구독회원

-- 회원 상태
CREATE TYPE member_status AS ENUM (
  'pending',    -- 가입대기
  'active',     -- 정상
  'suspended',  -- 일시정지
  'ended',      -- 종료
  'withdrawn'   -- 탈퇴
);

-- 태블릿 상태
CREATE TYPE tablet_status AS ENUM (
  'stock',      -- 재고
  'loaned',     -- 대여중
  'returned',   -- 회수됨
  'repair',     -- 수리중
  'lost'        -- 분실
);

-- 태블릿 대여 이벤트
CREATE TYPE loan_action AS ENUM (
  'loaned',
  'returned',
  'lost_reported',
  'recovered'
);

-- 결제 상태
CREATE TYPE payment_status AS ENUM (
  'paid',
  'unpaid',
  'cancelled'
);

-- 환불 상태
CREATE TYPE refund_status AS ENUM (
  'requested',
  'processing',
  'completed',
  'rejected'
);

-- 콘텐츠 유형
CREATE TYPE content_type AS ENUM (
  'video',
  'audio',
  'pdf',
  'book_metadata'
);
