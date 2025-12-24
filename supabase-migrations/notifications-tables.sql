-- Notifications and Communication Tables

-- Create notifications table for storing all notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_id uuid,
  type varchar(50) NOT NULL CHECK (type IN ('SMS', 'EMAIL', 'WHATSAPP', 'IN_APP')),
  status varchar(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'DELIVERED', 'READ')),
  title varchar(255) NOT NULL,
  message text NOT NULL,
  sent_at timestamp without time zone,
  delivered_at timestamp without time zone,
  read_at timestamp without time zone,
  error_message text,
  metadata jsonb,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT notifications_token_id_fkey FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_token_id ON notifications(token_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  enable_sms boolean DEFAULT true,
  enable_email boolean DEFAULT true,
  enable_whatsapp boolean DEFAULT true,
  enable_in_app boolean DEFAULT true,
  notify_on_called boolean DEFAULT true,
  notify_on_approaching boolean DEFAULT true,
  notify_on_reminder boolean DEFAULT true,
  notify_on_status_change boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT notification_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create function to auto-create notification preferences for new users
CREATE OR REPLACE FUNCTION create_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create preferences
DROP TRIGGER IF EXISTS trigger_create_notification_preferences ON users;
CREATE TRIGGER trigger_create_notification_preferences
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_preferences();

-- Create notification templates table
CREATE TABLE IF NOT EXISTS notification_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL UNIQUE,
  event_type varchar(50) NOT NULL,
  sms_template text,
  email_subject text,
  email_template text,
  whatsapp_template text,
  in_app_title text,
  in_app_message text,
  variables jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT notification_templates_pkey PRIMARY KEY (id)
);

-- Insert default notification templates
INSERT INTO notification_templates (name, event_type, sms_template, email_subject, email_template, whatsapp_template, in_app_title, in_app_message, variables)
VALUES 
(
  'token_called',
  'TOKEN_CALLED',
  '🔔 Your token {{token_label}} has been called! Please proceed to Counter {{counter_number}}. {{office_name}}',
  'Your Token {{token_label}} Has Been Called',
  'Dear {{citizen_name}},\n\nYour token {{token_label}} for {{service_name}} has been called.\n\nPlease proceed to Counter {{counter_number}} immediately.\n\nOffice: {{office_name}}\nTime: {{called_time}}\n\nThank you!',
  '🔔 *Token Called*\n\nHello {{citizen_name}}! Your token *{{token_label}}* for {{service_name}} has been called.\n\nPlease proceed to *Counter {{counter_number}}* immediately.\n\n📍 {{office_name}}',
  'Token {{token_label}} Called',
  'Your token has been called! Please proceed to Counter {{counter_number}}.',
  '{"token_label": "string", "citizen_name": "string", "service_name": "string", "counter_number": "number", "office_name": "string", "called_time": "datetime"}'
),
(
  'token_approaching',
  'TOKEN_APPROACHING',
  '⏰ Your token {{token_label}} is next in line! Only {{positions_ahead}} ahead. Please be ready. {{office_name}}',
  'Your Turn is Approaching - Token {{token_label}}',
  'Dear {{citizen_name}},\n\nYour turn is approaching!\n\nToken: {{token_label}}\nPositions ahead: {{positions_ahead}}\nService: {{service_name}}\n\nPlease stay nearby.\n\nThank you!',
  '⏰ *Your turn is approaching!*\n\nToken: *{{token_label}}*\nOnly {{positions_ahead}} token(s) ahead\n\nPlease be ready at {{office_name}}.',
  'Token {{token_label}} - Almost Your Turn',
  'Only {{positions_ahead}} ahead! Please be ready.',
  '{"token_label": "string", "citizen_name": "string", "service_name": "string", "positions_ahead": "number", "office_name": "string"}'
),
(
  'token_created',
  'TOKEN_CREATED',
  '✅ Token {{token_label}} created! Service: {{service_name}}. Est. wait: {{wait_time}} min. Office: {{office_name}}',
  'Token {{token_label}} Created Successfully',
  'Dear {{citizen_name}},\n\nYour token has been created successfully!\n\nToken: {{token_label}}\nService: {{service_name}}\nEstimated wait time: {{wait_time}} minutes\nPosition in queue: {{position}}\n\nOffice: {{office_name}}\n\nYou will be notified when your turn approaches.\n\nThank you!',
  '✅ *Token Created*\n\nToken: *{{token_label}}*\nService: {{service_name}}\nEst. wait: {{wait_time}} min\nPosition: {{position}}\n\n📍 {{office_name}}',
  'Token {{token_label}} Created',
  'Your token for {{service_name}} has been created. Estimated wait: {{wait_time}} min.',
  '{"token_label": "string", "citizen_name": "string", "service_name": "string", "wait_time": "number", "position": "number", "office_name": "string"}'
);

-- Verify tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('notifications', 'notification_preferences', 'notification_templates');

-- Verify templates
SELECT name, event_type, is_active FROM notification_templates;