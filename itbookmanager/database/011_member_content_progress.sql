-- 회원별 콘텐츠 학습 진도
CREATE TABLE member_content_progress (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id         UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  content_item_id   UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  package_id        UUID NOT NULL REFERENCES content_packages(id),

  started_at        TIMESTAMPTZ,
  last_accessed_at  TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  progress_pct      NUMERIC(5,2) DEFAULT 0,   -- 0.00 ~ 100.00
  time_spent_sec    INTEGER DEFAULT 0,
  is_completed      BOOLEAN DEFAULT FALSE,

  UNIQUE(member_id, content_item_id)
);

CREATE INDEX idx_mcp_member    ON member_content_progress(member_id);
CREATE INDEX idx_mcp_package   ON member_content_progress(package_id);
CREATE INDEX idx_mcp_completed ON member_content_progress(is_completed);
