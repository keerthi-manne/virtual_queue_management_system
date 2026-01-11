-- Add counter_id column to staff_requests table
-- This allows storing which counter the staff wants to use when requesting to serve

ALTER TABLE staff_requests 
ADD COLUMN IF NOT EXISTS counter_id UUID REFERENCES counters(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_staff_requests_counter ON staff_requests(counter_id);

COMMENT ON COLUMN staff_requests.counter_id IS 'The counter the staff wants to use for serving this token';
