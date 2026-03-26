-- 오프라인 AI 교육 세션 (관리회원 전용)
CREATE TABLE education_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  session_date    DATE NOT NULL,
  instructor_name VARCHAR(100),
  session_title   VARCHAR(200),
  location        VARCHAR(200),
  attended        BOOLEAN DEFAULT FALSE,
  attendance_note TEXT,
  week_number     INTEGER,                   -- 연결된 콘텐츠 주차
  evaluation      TEXT,                      -- 학습 평가
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID
);

CREATE INDEX idx_edu_sessions_member ON education_sessions(member_id);
CREATE INDEX idx_edu_sessions_date   ON education_sessions(session_date);
