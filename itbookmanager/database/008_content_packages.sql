-- 콘텐츠 패키지 (2주 단위)
CREATE TABLE content_packages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number     INTEGER NOT NULL UNIQUE,    -- 1, 2, 3, ... (2주 단위 인덱스)
  title           VARCHAR(200) NOT NULL,
  description     TEXT,
  book_count      INTEGER DEFAULT 0,
  is_published    BOOLEAN DEFAULT FALSE,      -- 게시 전 배포 불가
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID
);

CREATE UNIQUE INDEX idx_content_packages_week      ON content_packages(week_number);
CREATE INDEX idx_content_packages_published        ON content_packages(is_published);
