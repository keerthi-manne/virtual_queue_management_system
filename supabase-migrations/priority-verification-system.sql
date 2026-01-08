-- Priority Verification & Document Management System
-- This migration creates tables for document verification and priority approval workflow

-- Table: priority_verification_requests
-- Stores all priority claims that need verification/approval
CREATE TABLE IF NOT EXISTS priority_verification_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
  citizen_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  priority_type VARCHAR(20) NOT NULL CHECK (priority_type IN ('SENIOR', 'DISABLED', 'EMERGENCY')),
  
  -- Request details
  reason TEXT,
  claimed_age INTEGER, -- For senior citizens
  emergency_type VARCHAR(50), -- Medical, Legal, etc.
  
  -- AI Analysis (for emergency)
  ai_emergency_score DECIMAL(3,2), -- 0.00 to 1.00 confidence score
  ai_classification VARCHAR(50), -- genuine, suspicious, false
  ai_reasoning TEXT,
  
  -- Document references
  documents JSONB DEFAULT '[]', -- Array of document URLs
  
  -- Verification status
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'AI_APPROVED', 'AI_REJECTED', 'ADMIN_REVIEW', 'APPROVED', 'REJECTED')),
  verified_by UUID REFERENCES users(id), -- Admin who approved/rejected
  verification_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  
  CONSTRAINT unique_token_verification UNIQUE (token_id, priority_type)
);

-- Table: uploaded_documents
-- Stores all uploaded documents with metadata
CREATE TABLE IF NOT EXISTS uploaded_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  verification_request_id UUID REFERENCES priority_verification_requests(id) ON DELETE CASCADE,
  citizen_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Document details
  document_type VARCHAR(50) NOT NULL, -- aadhaar, disability_cert, medical_report, etc.
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  
  -- OCR/AI extracted data
  extracted_data JSONB, -- Store OCR results
  verification_status VARCHAR(20) DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED')),
  
  -- Aadhaar specific fields
  aadhaar_number VARCHAR(12), -- Last 4 digits only for privacy
  date_of_birth DATE,
  full_name VARCHAR(255),
  
  -- Timestamps
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- For time-limited documents
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: notification_queue
-- Queues notifications to be sent via email/SMS/WhatsApp
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_id UUID REFERENCES tokens(id) ON DELETE CASCADE,
  
  -- Notification details
  type VARCHAR(50) NOT NULL, -- email, sms, whatsapp, push
  template VARCHAR(100) NOT NULL, -- token_created, position_update, turn_alert, etc.
  
  -- Channel-specific data
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(20),
  
  -- Message content
  subject VARCHAR(255),
  message TEXT NOT NULL,
  data JSONB, -- Template variables
  
  -- Delivery status
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'RETRY')),
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Priority
  priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ DEFAULT NOW()
);

-- Table: notification_preferences
-- User preferences for notification channels
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- Channel preferences
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT TRUE,
  whatsapp_enabled BOOLEAN DEFAULT FALSE,
  push_enabled BOOLEAN DEFAULT TRUE,
  
  -- Event preferences
  notify_on_join BOOLEAN DEFAULT TRUE,
  notify_on_position_change BOOLEAN DEFAULT TRUE,
  notify_on_turn_alert BOOLEAN DEFAULT TRUE,
  notify_on_turn_now BOOLEAN DEFAULT TRUE,
  notify_on_completion BOOLEAN DEFAULT TRUE,
  notify_on_no_show BOOLEAN DEFAULT TRUE,
  
  -- Frequency settings
  position_update_frequency INTEGER DEFAULT 5, -- Notify every N positions
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: token_history
-- Audit log for all token state changes
CREATE TABLE IF NOT EXISTS token_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
  
  -- Change details
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  old_priority VARCHAR(20),
  new_priority VARCHAR(20),
  old_position INTEGER,
  new_position INTEGER,
  
  -- Actor
  changed_by UUID REFERENCES users(id),
  changed_by_role VARCHAR(20),
  reason TEXT,
  
  -- Timestamp
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_priority_verification_status ON priority_verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_priority_verification_citizen ON priority_verification_requests(citizen_id);
CREATE INDEX IF NOT EXISTS idx_priority_verification_token ON priority_verification_requests(token_id);

CREATE INDEX IF NOT EXISTS idx_documents_verification_request ON uploaded_documents(verification_request_id);
CREATE INDEX IF NOT EXISTS idx_documents_citizen ON uploaded_documents(citizen_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON uploaded_documents(document_type);

CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_user ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_queue_priority ON notification_queue(priority, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_token_history_token ON token_history(token_id);
CREATE INDEX IF NOT EXISTS idx_token_history_changed_at ON token_history(changed_at);

-- Function to automatically create notification preferences for new users
CREATE OR REPLACE FUNCTION create_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create notification preferences
DROP TRIGGER IF EXISTS trigger_create_notification_preferences ON users;
CREATE TRIGGER trigger_create_notification_preferences
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_preferences();

-- Function to log token changes
CREATE OR REPLACE FUNCTION log_token_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) OR 
     (OLD.priority IS DISTINCT FROM NEW.priority) THEN
    INSERT INTO token_history (
      token_id,
      old_status,
      new_status,
      old_priority,
      new_priority,
      reason
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      OLD.priority,
      NEW.priority,
      'Auto-logged change'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log token changes
DROP TRIGGER IF EXISTS trigger_log_token_changes ON tokens;
CREATE TRIGGER trigger_log_token_changes
  AFTER UPDATE ON tokens
  FOR EACH ROW
  EXECUTE FUNCTION log_token_changes();

-- Function to automatically queue notification when token is created
CREATE OR REPLACE FUNCTION queue_token_notification()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
  user_phone TEXT;
  service_name TEXT;
BEGIN
  -- Get user details
  SELECT email, name, phone INTO user_email, user_name, user_phone
  FROM users
  WHERE id = NEW.citizen_id;
  
  -- Get service name
  SELECT name INTO service_name
  FROM services
  WHERE id = NEW.service_id;
  
  -- Only queue if user has email
  IF user_email IS NOT NULL AND user_email != '' THEN
    -- Queue email notification
    INSERT INTO notification_queue (
      user_id,
      token_id,
      type,
      template,
      recipient_email,
      recipient_phone,
      subject,
      message,
      data,
      status,
      priority
    ) VALUES (
      NEW.citizen_id,
      NEW.id,
      'email',
      'token_created',
      user_email,
      user_phone,
      '🎫 Your Queue Token: ' || NEW.token_label,
      'Hello ' || COALESCE(user_name, 'Citizen') || 
      ', your token ' || NEW.token_label || 
      ' has been created for ' || COALESCE(service_name, 'service') || 
      '. Estimated wait time: ' || COALESCE(NEW.estimated_wait_minutes::text, '0') || ' minutes.',
      jsonb_build_object(
        'tokenLabel', NEW.token_label,
        'serviceName', service_name,
        'estimatedWait', NEW.estimated_wait_minutes,
        'priority', NEW.priority
      ),
      'PENDING',
      CASE NEW.priority
        WHEN 'EMERGENCY' THEN 1
        WHEN 'DISABLED' THEN 2
        WHEN 'SENIOR' THEN 3
        ELSE 5
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to queue notification when token is created
DROP TRIGGER IF EXISTS trigger_queue_token_notification ON tokens;
CREATE TRIGGER trigger_queue_token_notification
  AFTER INSERT ON tokens
  FOR EACH ROW
  EXECUTE FUNCTION queue_token_notification();

-- Grant permissions
GRANT ALL ON priority_verification_requests TO authenticated;
GRANT ALL ON uploaded_documents TO authenticated;
GRANT ALL ON notification_queue TO authenticated;
GRANT ALL ON notification_preferences TO authenticated;
GRANT ALL ON token_history TO authenticated;

COMMENT ON TABLE priority_verification_requests IS 'Stores priority claims requiring verification and admin approval';
COMMENT ON TABLE uploaded_documents IS 'Stores uploaded documents with OCR extracted data';
COMMENT ON TABLE notification_queue IS 'Queue for multi-channel notifications (Email, SMS, WhatsApp)';
COMMENT ON TABLE notification_preferences IS 'User preferences for notification channels and events';
COMMENT ON TABLE token_history IS 'Audit log for all token state changes';
