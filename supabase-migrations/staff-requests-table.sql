-- Staff Requests Table
-- Allows staff to request serving specific queue members

CREATE TABLE IF NOT EXISTS staff_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
  counter_id UUID REFERENCES counters(id) ON DELETE SET NULL,
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT
);

-- Indexes for performance
CREATE INDEX idx_staff_requests_staff ON staff_requests(staff_id);
CREATE INDEX idx_staff_requests_token ON staff_requests(token_id);
CREATE INDEX idx_staff_requests_status ON staff_requests(status);
CREATE INDEX idx_staff_requests_created ON staff_requests(created_at DESC);

-- RLS Policies
ALTER TABLE staff_requests ENABLE ROW LEVEL SECURITY;

-- Staff can view their own requests
CREATE POLICY "Staff can view own requests"
  ON staff_requests FOR SELECT
  USING (
    staff_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid() AND role = 'STAFF'
    )
  );

-- Staff can create requests
CREATE POLICY "Staff can create requests"
  ON staff_requests FOR INSERT
  WITH CHECK (
    staff_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid() AND role = 'STAFF'
    )
  );

-- Admin can view all requests
CREATE POLICY "Admin can view all requests"
  ON staff_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Admin can update requests
CREATE POLICY "Admin can update requests"
  ON staff_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

COMMENT ON TABLE staff_requests IS 'Staff requests to serve specific queue members';
COMMENT ON COLUMN staff_requests.reason IS 'Optional reason for the request';
COMMENT ON COLUMN staff_requests.status IS 'PENDING, APPROVED, or REJECTED';
