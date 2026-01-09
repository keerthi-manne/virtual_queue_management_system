-- Token Reschedule System for No-Show Handling
-- This migration creates tables and functions for automatic reschedule requests

-- ============================================
-- RESCHEDULE_REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.reschedule_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_id UUID NOT NULL REFERENCES public.tokens(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    original_token_number TEXT NOT NULL,
    request_status TEXT NOT NULL DEFAULT 'pending' CHECK (request_status IN ('pending', 'accepted', 'declined', 'expired')),
    
    -- Request details
    no_show_reason TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    
    -- New token after reschedule
    new_token_id UUID REFERENCES public.tokens(id) ON DELETE SET NULL,
    
    -- Notification tracking
    notification_sent BOOLEAN DEFAULT false,
    sms_sent BOOLEAN DEFAULT false,
    email_sent BOOLEAN DEFAULT false,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reschedule_requests_token ON public.reschedule_requests(token_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_user ON public.reschedule_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_status ON public.reschedule_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_expires ON public.reschedule_requests(expires_at);

-- ============================================
-- Add reschedule tracking to tokens table
-- ============================================
ALTER TABLE public.tokens 
ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_token_id UUID REFERENCES public.tokens(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_rescheduled BOOLEAN DEFAULT false;

-- ============================================
-- FUNCTION: Auto-expire reschedule requests
-- ============================================
CREATE OR REPLACE FUNCTION expire_reschedule_requests()
RETURNS void AS $$
BEGIN
    UPDATE public.reschedule_requests
    SET request_status = 'expired',
        updated_at = NOW()
    WHERE request_status = 'pending'
      AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Create reschedule request
-- ============================================
CREATE OR REPLACE FUNCTION create_reschedule_request(
    p_token_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_request_id UUID;
    v_user_id UUID;
    v_token_number TEXT;
BEGIN
    -- Get token details (don't check status - backend already validated it)
    SELECT user_id, token_number INTO v_user_id, v_token_number
    FROM public.tokens
    WHERE id = p_token_id;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Token not found';
    END IF;
    
    -- Create reschedule request
    INSERT INTO public.reschedule_requests (
        token_id,
        user_id,
        original_token_number,
        no_show_reason,
        request_status
    ) VALUES (
        p_token_id,
        v_user_id,
        v_token_number,
        p_reason,
        'pending'
    ) RETURNING id INTO v_request_id;
    
    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Accept reschedule and create new token
-- ============================================
CREATE OR REPLACE FUNCTION accept_reschedule_request(
    p_request_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_new_token_id UUID;
    v_old_token_id UUID;
    v_user_id UUID;
    v_service_id UUID;
    v_priority TEXT;
    v_token_number TEXT;
    v_max_queue_position INTEGER;
BEGIN
    -- Get request details
    SELECT token_id, user_id 
    INTO v_old_token_id, v_user_id
    FROM public.reschedule_requests
    WHERE id = p_request_id AND request_status = 'pending';
    
    IF v_old_token_id IS NULL THEN
        RAISE EXCEPTION 'Reschedule request not found or already processed';
    END IF;
    
    -- Get original token details
    SELECT service_id, priority
    INTO v_service_id, v_priority
    FROM public.tokens
    WHERE id = v_old_token_id;
    
    -- Generate new token number
    SELECT COALESCE(MAX(CAST(SUBSTRING(token_number FROM '[0-9]+') AS INTEGER)), 0) + 1
    INTO v_max_queue_position
    FROM public.tokens
    WHERE service_id = v_service_id
      AND DATE(created_at) = CURRENT_DATE;
    
    v_token_number := 'T' || LPAD(v_max_queue_position::TEXT, 4, '0');
    
    -- Get current queue position
    SELECT COALESCE(MAX(queue_position), 0) + 1
    INTO v_max_queue_position
    FROM public.tokens
    WHERE service_id = v_service_id
      AND status = 'waiting';
    
    -- Create new token
    INSERT INTO public.tokens (
        token_number,
        user_id,
        service_id,
        status,
        priority,
        queue_position,
        original_token_id,
        is_rescheduled,
        notes
    ) VALUES (
        v_token_number,
        v_user_id,
        v_service_id,
        'waiting',
        v_priority,
        v_max_queue_position,
        v_old_token_id,
        true,
        'Rescheduled from no-show'
    ) RETURNING id INTO v_new_token_id;
    
    -- Update reschedule count on original token
    UPDATE public.tokens
    SET reschedule_count = reschedule_count + 1
    WHERE id = v_old_token_id;
    
    -- Update reschedule request
    UPDATE public.reschedule_requests
    SET request_status = 'accepted',
        new_token_id = v_new_token_id,
        responded_at = NOW(),
        updated_at = NOW()
    WHERE id = p_request_id;
    
    -- Log event
    INSERT INTO public.queue_events (
        token_id,
        event_type,
        old_status,
        new_status,
        metadata
    ) VALUES (
        v_new_token_id,
        'rescheduled',
        'no_show',
        'waiting',
        jsonb_build_object(
            'original_token_id', v_old_token_id,
            'reschedule_request_id', p_request_id
        )
    );
    
    RETURN v_new_token_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Decline reschedule request
-- ============================================
CREATE OR REPLACE FUNCTION decline_reschedule_request(
    p_request_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.reschedule_requests
    SET request_status = 'declined',
        responded_at = NOW(),
        updated_at = NOW()
    WHERE id = p_request_id AND request_status = 'pending';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Row Level Security Policies
-- ============================================

-- Enable RLS
ALTER TABLE public.reschedule_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own reschedule requests" ON public.reschedule_requests;
DROP POLICY IF EXISTS "Users can update own reschedule requests" ON public.reschedule_requests;
DROP POLICY IF EXISTS "Staff can view all reschedule requests" ON public.reschedule_requests;
DROP POLICY IF EXISTS "Staff can create reschedule requests" ON public.reschedule_requests;

-- Users can see their own reschedule requests
CREATE POLICY "Users can view own reschedule requests"
    ON public.reschedule_requests FOR SELECT
    USING (auth.uid() = user_id);

-- Users can respond to their own reschedule requests
CREATE POLICY "Users can update own reschedule requests"
    ON public.reschedule_requests FOR UPDATE
    USING (auth.uid() = user_id AND request_status = 'pending');

-- Staff and admins can view all reschedule requests
CREATE POLICY "Staff can view all reschedule requests"
    ON public.reschedule_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('staff', 'admin')
        )
    );

-- Staff can create reschedule requests (for no-shows)
CREATE POLICY "Staff can create reschedule requests"
    ON public.reschedule_requests FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('staff', 'admin')
        )
    );

-- ============================================
-- Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tokens_no_show 
    ON public.tokens(status) WHERE status = 'NO_SHOW';

CREATE INDEX IF NOT EXISTS idx_tokens_rescheduled 
    ON public.tokens(is_rescheduled) WHERE is_rescheduled = true;

-- ============================================
-- Grant permissions
-- ============================================
GRANT ALL ON public.reschedule_requests TO authenticated;
GRANT EXECUTE ON FUNCTION expire_reschedule_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION create_reschedule_request(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_reschedule_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decline_reschedule_request(UUID) TO authenticated;
