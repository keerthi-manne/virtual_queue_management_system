-- SMS Registration System Migration
-- Enables keypad phone users to register via SMS

-- SMS sessions table to track conversation state
CREATE TABLE IF NOT EXISTS sms_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT NOT NULL,
  current_step TEXT NOT NULL, -- 'MAIN_MENU', 'OFFICE_SELECT', 'SERVICE_SELECT', 'CONFIRM'
  selected_office_id UUID REFERENCES offices(id),
  selected_service_id UUID REFERENCES services(id),
  user_name TEXT,
  session_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '15 minutes'
);

-- Indexes for performance
CREATE INDEX idx_sms_sessions_phone ON sms_sessions(phone_number);
CREATE INDEX idx_sms_sessions_expires ON sms_sessions(expires_at);
CREATE INDEX idx_sms_sessions_updated ON sms_sessions(updated_at);

-- Function to cleanup expired sessions (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_sms_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sms_sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update session timestamp on any update
CREATE OR REPLACE FUNCTION update_sms_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.expires_at = NOW() + INTERVAL '15 minutes';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamps
CREATE TRIGGER trigger_update_sms_session_timestamp
  BEFORE UPDATE ON sms_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_sms_session_timestamp();

-- SMS user registrations (lightweight users registered via SMS)
CREATE TABLE IF NOT EXISTS sms_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sms_users_phone ON sms_users(phone_number);

-- Grant necessary permissions
ALTER TABLE sms_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_users ENABLE ROW LEVEL SECURITY;

-- Allow backend service to manage SMS sessions
CREATE POLICY "Backend can manage SMS sessions"
  ON sms_sessions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Backend can manage SMS users"
  ON sms_users FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE sms_sessions IS 'Tracks SMS conversation state for keypad phone users';
COMMENT ON TABLE sms_users IS 'Lightweight user profiles for SMS-only registrations';
