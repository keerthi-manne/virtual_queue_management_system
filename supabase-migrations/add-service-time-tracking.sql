-- Add service time tracking columns to tokens table
-- service_started_at: When staff clicked "Start Service" button
-- actual_service_time: Calculated time in minutes (completed_at - service_started_at)

ALTER TABLE tokens 
ADD COLUMN IF NOT EXISTS service_started_at TIMESTAMPTZ;

ALTER TABLE tokens 
ADD COLUMN IF NOT EXISTS actual_service_time INTEGER;

-- Add comments
COMMENT ON COLUMN tokens.service_started_at IS 'When the staff member started serving this customer (clicked Start Service button)';
COMMENT ON COLUMN tokens.actual_service_time IS 'Actual service time in minutes, calculated as completed_at - service_started_at';

-- This data will be used for ML predictions and analytics
