CREATE TABLE admin_users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid    VARCHAR(128) UNIQUE NOT NULL,
  name            VARCHAR(100) NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  role            VARCHAR(50) DEFAULT 'staff',    -- 'superadmin', 'staff'
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
