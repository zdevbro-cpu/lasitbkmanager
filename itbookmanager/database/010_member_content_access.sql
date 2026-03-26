-- 회원별 접근 가능한 콘텐츠 패키지 매핑 (핵심 - 배포 시 삽입)
CREATE TABLE member_content_access (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  package_id      UUID NOT NULL REFERENCES content_packages(id) ON DELETE CASCADE,
  week_number     INTEGER NOT NULL,
  unlocked_at     TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,              -- NULL = 영구, 일시정지 시 설정

  UNIQUE(member_id, package_id)
);

CREATE INDEX idx_mca_member    ON member_content_access(member_id);
CREATE INDEX idx_mca_package   ON member_content_access(package_id);
CREATE INDEX idx_mca_unlocked  ON member_content_access(unlocked_at);
