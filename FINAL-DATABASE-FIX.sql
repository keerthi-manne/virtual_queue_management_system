-- =============================================
-- COMPLETE PROJECT CONSISTENCY FIX
-- Run this ENTIRE file in Supabase SQL Editor
-- =============================================

-- 1. Fix all status values to lowercase
UPDATE public.tokens
SET status = LOWER(status)
WHERE status IN ('WAITING', 'CALLED', 'SERVING', 'COMPLETED', 'NO_SHOW', 'CANCELLED');

-- 2. Fix all priority values to UPPERCASE
UPDATE public.tokens
SET priority = UPPER(priority)
WHERE priority IN ('normal', 'senior', 'disabled', 'emergency');

-- 3. Drop and recreate CHECK constraints with correct values
ALTER TABLE public.tokens DROP CONSTRAINT IF EXISTS tokens_status_check;
ALTER TABLE public.tokens DROP CONSTRAINT IF EXISTS tokens_priority_check;

ALTER TABLE public.tokens 
ADD CONSTRAINT tokens_status_check 
CHECK (status IN ('waiting', 'called', 'serving', 'completed', 'no_show', 'cancelled'));

ALTER TABLE public.tokens 
ADD CONSTRAINT tokens_priority_check 
CHECK (priority IN ('NORMAL', 'SENIOR', 'DISABLED', 'EMERGENCY'));

-- 4. Fix reschedule_requests table to match database conventions
-- Rename user_id to citizen_id (if column exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reschedule_requests' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.reschedule_requests RENAME COLUMN user_id TO citizen_id;
    END IF;
END $$;

-- Rename token_id to original_token_id (if column exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reschedule_requests' AND column_name = 'token_id'
    ) THEN
        ALTER TABLE public.reschedule_requests RENAME COLUMN token_id TO original_token_id;
    END IF;
END $$;

-- Drop the original_token_number column as it's redundant (we have original_token_id)
ALTER TABLE public.reschedule_requests 
DROP COLUMN IF EXISTS original_token_number;

-- Drop the old indexes
DROP INDEX IF EXISTS idx_reschedule_requests_user;
DROP INDEX IF EXISTS idx_reschedule_requests_token;

-- Create new indexes with correct names
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_citizen ON public.reschedule_requests(citizen_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_original_token ON public.reschedule_requests(original_token_id);

-- 5. Fix reschedule functions to use correct column names
CREATE OR REPLACE FUNCTION create_reschedule_request(
    p_token_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_request_id UUID;
    v_citizen_id UUID;
    v_token_label TEXT;
BEGIN
    SELECT citizen_id, token_label INTO v_citizen_id, v_token_label
    FROM public.tokens
    WHERE id = p_token_id;
    
    IF v_citizen_id IS NULL THEN
        RAISE EXCEPTION 'Token not found';
    END IF;
    
    INSERT INTO public.reschedule_requests (
        original_token_id,
        citizen_id,
        no_show_reason,
        request_status
    ) VALUES (
        p_token_id,
        v_citizen_id,
        p_reason,
        'pending'
    ) RETURNING id INTO v_request_id;
    
    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION accept_reschedule_request(
    p_request_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_new_token_id UUID;
    v_old_token_id UUID;
    v_citizen_id UUID;
    v_service_id UUID;
    v_priority TEXT;
    v_token_label TEXT;
    v_max_queue_position INTEGER;
BEGIN
    SELECT original_token_id, citizen_id 
    INTO v_old_token_id, v_citizen_id
    FROM public.reschedule_requests
    WHERE id = p_request_id AND request_status = 'pending';
    
    IF v_old_token_id IS NULL THEN
        RAISE EXCEPTION 'Reschedule request not found or already processed';
    END IF;
    
    SELECT service_id, priority
    INTO v_service_id, v_priority
    FROM public.tokens
    WHERE id = v_old_token_id;
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(token_label FROM '[0-9]+') AS INTEGER)), 0) + 1
    INTO v_max_queue_position
    FROM public.tokens
    WHERE service_id = v_service_id
      AND DATE(joined_at) = CURRENT_DATE;
    
    v_token_label := 'G' || LPAD(v_max_queue_position::TEXT, 3, '0');
    
    SELECT COALESCE(MAX(queue_position), 0) + 1
    INTO v_max_queue_position
    FROM public.tokens
    WHERE service_id = v_service_id
      AND status = 'waiting';
    
    INSERT INTO public.tokens (
        token_label,
        citizen_id,
        service_id,
        status,
        priority,
        queue_position,
        original_token_id,
        is_rescheduled,
        citizen_name
    ) 
    SELECT 
        v_token_label,
        v_citizen_id,
        v_service_id,
        'waiting',
        v_priority,
        v_max_queue_position,
        v_old_token_id,
        true,
        citizen_name
    FROM public.tokens 
    WHERE id = v_old_token_id
    RETURNING id INTO v_new_token_id;
    
    UPDATE public.tokens
    SET reschedule_count = reschedule_count + 1
    WHERE id = v_old_token_id;
    
    UPDATE public.reschedule_requests
    SET request_status = 'accepted',
        new_token_id = v_new_token_id,
        responded_at = NOW(),
        updated_at = NOW()
    WHERE id = p_request_id;
    
    RETURN v_new_token_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Verify the changes
SELECT 'Status values:' as check_type, status, COUNT(*) as count
FROM public.tokens
GROUP BY status
UNION ALL
SELECT 'Priority values:' as check_type, priority, COUNT(*) as count
FROM public.tokens
GROUP BY priority
ORDER BY check_type, count DESC;
