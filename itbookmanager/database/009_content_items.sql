-- 패키지 내 개별 콘텐츠 항목 (영상/음성/PDF)
CREATE TABLE content_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id      UUID NOT NULL REFERENCES content_packages(id) ON DELETE CASCADE,
  title           VARCHAR(300) NOT NULL,
  author          VARCHAR(200),
  content_type    content_type NOT NULL,
  storage_path    VARCHAR(500),              -- Cloud Storage 경로
  file_size_bytes BIGINT,
  duration_sec    INTEGER,                   -- 영상/음성 길이
  sort_order      INTEGER DEFAULT 0,
  version         INTEGER DEFAULT 1,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_items_package ON content_items(package_id);
CREATE INDEX idx_content_items_type    ON content_items(content_type);
