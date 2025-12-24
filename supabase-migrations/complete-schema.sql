-- Virtual Queue Management System - Complete Database Schema
-- This migration creates all necessary tables, indexes, and policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('citizen', 'staff', 'admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_email ON public.users(email);

-- ============================================
-- SERVICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    average_service_time INTEGER NOT NULL DEFAULT 10, -- in minutes
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_services_active ON public.services(is_active);

-- ============================================
-- COUNTERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.counters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    counter_number TEXT NOT NULL,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    current_token_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(counter_number, service_id)
);

CREATE INDEX idx_counters_service ON public.counters(service_id);
CREATE INDEX idx_counters_staff ON public.counters(staff_id);
CREATE INDEX idx_counters_active ON public.counters(is_active);

-- ============================================
-- TOKENS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_number TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    counter_id UUID REFERENCES public.counters(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('waiting', 'called', 'serving', 'completed', 'no_show', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'senior', 'disabled', 'emergency')),
    queue_position INTEGER NOT NULL DEFAULT 0,
    estimated_wait_time INTEGER, -- in minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    called_at TIMESTAMP WITH TIME ZONE,
    serving_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

CREATE INDEX idx_tokens_user ON public.tokens(user_id);
CREATE INDEX idx_tokens_service ON public.tokens(service_id);
CREATE INDEX idx_tokens_counter ON public.tokens(counter_id);
CREATE INDEX idx_tokens_status ON public.tokens(status);
CREATE INDEX idx_tokens_created ON public.tokens(created_at DESC);
CREATE INDEX idx_tokens_queue_position ON public.tokens(service_id, status, queue_position);

-- ============================================
-- QUEUE_EVENTS TABLE (for analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS public.queue_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_id UUID NOT NULL REFERENCES public.tokens(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    old_status TEXT,
    new_status TEXT,
    staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    counter_id UUID REFERENCES public.counters(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX idx_queue_events_token ON public.queue_events(token_id);
CREATE INDEX idx_queue_events_type ON public.queue_events(event_type);
CREATE INDEX idx_queue_events_timestamp ON public.queue_events(timestamp DESC);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'success', 'error')),
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

-- ============================================
-- STAFF_SESSIONS TABLE (for tracking staff work)
-- ============================================
CREATE TABLE IF NOT EXISTS public.staff_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    counter_id UUID NOT NULL REFERENCES public.counters(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    tokens_served INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_staff_sessions_staff ON public.staff_sessions(staff_id);
CREATE INDEX idx_staff_sessions_counter ON public.staff_sessions(counter_id);
CREATE INDEX idx_staff_sessions_active ON public.staff_sessions(is_active);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for services table
CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for counters table
CREATE TRIGGER update_counters_updated_at
BEFORE UPDATE ON public.counters
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_sessions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Services policies (public read)
CREATE POLICY "Anyone can view active services" ON public.services
    FOR SELECT USING (is_active = true OR EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('admin', 'staff')
    ));

CREATE POLICY "Admins can manage services" ON public.services
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Counters policies
CREATE POLICY "Staff and admins can view counters" ON public.counters
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Admins can manage counters" ON public.counters
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Tokens policies
CREATE POLICY "Users can view their own tokens" ON public.tokens
    FOR SELECT USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('admin', 'staff')
    ));

CREATE POLICY "Citizens can create tokens" ON public.tokens
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can cancel their own tokens" ON public.tokens
    FOR UPDATE USING (user_id = auth.uid() AND status IN ('waiting', 'called'))
    WITH CHECK (status = 'cancelled');

CREATE POLICY "Staff can update tokens" ON public.tokens
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

-- Queue events policies (read-only for analytics)
CREATE POLICY "Staff and admins can view queue events" ON public.queue_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Staff sessions policies
CREATE POLICY "Staff can view their own sessions" ON public.staff_sessions
    FOR SELECT USING (staff_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    ));

-- ============================================
-- SEED DATA (for testing)
-- ============================================

-- Insert sample services
INSERT INTO public.services (name, description, average_service_time, is_active) VALUES
    ('Birth Certificate', 'Issue birth certificates', 15, true),
    ('Property Tax', 'Property tax payment and inquiries', 10, true),
    ('Business License', 'New business license application', 20, true),
    ('Driving License', 'Driving license renewal and new applications', 12, true),
    ('Water Connection', 'New water connection requests', 18, true)
ON CONFLICT (name) DO NOTHING;

-- Note: Users, counters, and tokens should be created through the application

COMMENT ON TABLE public.users IS 'User profiles extending Supabase auth';
COMMENT ON TABLE public.services IS 'Municipal services available for queuing';
COMMENT ON TABLE public.counters IS 'Service counters staffed by municipal employees';
COMMENT ON TABLE public.tokens IS 'Queue tokens issued to citizens';
COMMENT ON TABLE public.queue_events IS 'Event log for queue analytics and auditing';
COMMENT ON TABLE public.notifications IS 'User notifications for token status updates';
COMMENT ON TABLE public.staff_sessions IS 'Staff work session tracking';
