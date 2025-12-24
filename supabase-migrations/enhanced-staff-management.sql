-- Migration: Enhanced Staff Management System
-- Add new columns and tables for better staff tracking

-- Add new columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS counter_id UUID REFERENCES counters(id),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Create staff_sessions table for tracking work sessions
CREATE TABLE IF NOT EXISTS staff_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  counter_id UUID NOT NULL REFERENCES counters(id) ON DELETE CASCADE,
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  login_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  logout_time TIMESTAMP WITH TIME ZONE,
  tokens_served INTEGER DEFAULT 0,
  total_handle_time INTEGER DEFAULT 0, -- in minutes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create counter_assignments table for permanent staff-counter assignments
CREATE TABLE IF NOT EXISTS counter_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  counter_id UUID NOT NULL REFERENCES counters(id) ON DELETE CASCADE,
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  can_operate BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(staff_id, counter_id) -- Staff can only be assigned to each counter once
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_sessions_staff_id ON staff_sessions(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_counter_id ON staff_sessions(counter_id);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_office_id ON staff_sessions(office_id);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_login_time ON staff_sessions(login_time);

CREATE INDEX IF NOT EXISTS idx_counter_assignments_staff_id ON counter_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_counter_assignments_counter_id ON counter_assignments(counter_id);
CREATE INDEX IF NOT EXISTS idx_counter_assignments_office_id ON counter_assignments(office_id);

-- Add RLS policies (if using Supabase RLS)
ALTER TABLE staff_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE counter_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for staff_sessions
CREATE POLICY "Staff can view their own sessions" ON staff_sessions
  FOR SELECT USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = staff_id));

CREATE POLICY "Admins can view all sessions" ON staff_sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'ADMIN')
  );

-- Policies for counter_assignments
CREATE POLICY "Staff can view their assignments" ON counter_assignments
  FOR SELECT USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = staff_id));

CREATE POLICY "Admins can manage all assignments" ON counter_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'ADMIN')
  );

-- Update existing users to have is_active = true
UPDATE users SET is_active = true WHERE is_active IS NULL;