-- Fix the token notification trigger to include position and office name
CREATE OR REPLACE FUNCTION queue_token_notification()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
  user_phone TEXT;
  service_name TEXT;
  queue_position INT;
BEGIN
  -- Get user details
  SELECT email, name, phone INTO user_email, user_name, user_phone
  FROM users
  WHERE id = NEW.citizen_id;
  
  -- Get service name
  SELECT name INTO service_name
  FROM services
  WHERE id = NEW.service_id;
  
  -- Calculate queue position
  SELECT COALESCE(NEW.position_in_queue, 0) INTO queue_position;
  
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
      'Your queue token ' || NEW.token_label || 
      ' has been created! You are at position ' || queue_position || 
      ' with an estimated wait time of ' || COALESCE(NEW.estimated_wait_minutes::text, 'N/A') || ' minutes.',
      jsonb_build_object(
        'tokenLabel', NEW.token_label,
        'position', queue_position,
        'estimatedWait', NEW.estimated_wait_minutes,
        'serviceName', service_name,
        'officeName', 'Main Municipal Office'
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
