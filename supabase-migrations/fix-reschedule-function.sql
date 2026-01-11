-- Fix create_reschedule_request function to use actual column names
CREATE OR REPLACE FUNCTION create_reschedule_request(
    p_token_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_request_id UUID;
    v_user_id UUID;
    v_token_label TEXT;
BEGIN
    -- Get token details using actual column names: citizen_id and token_label
    SELECT citizen_id, token_label INTO v_user_id, v_token_label
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
        v_token_label,
        p_reason,
        'pending'
    ) RETURNING id INTO v_request_id;
    
    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql;

-- Also fix accept_reschedule_request to use actual column names
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
    v_token_label TEXT;
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
    
    -- Generate new token label (using actual column name)
    SELECT COALESCE(MAX(CAST(SUBSTRING(token_label FROM '[0-9]+') AS INTEGER)), 0) + 1
    INTO v_max_queue_position
    FROM public.tokens
    WHERE service_id = v_service_id
      AND DATE(joined_at) = CURRENT_DATE;
    
    v_token_label := 'G' || LPAD(v_max_queue_position::TEXT, 3, '0');
    
    -- Get current queue position
    SELECT COALESCE(MAX(position_in_queue), 0) + 1
    INTO v_max_queue_position
    FROM public.tokens
    WHERE service_id = v_service_id
      AND status = 'waiting';
    
    -- Create new token (using actual column names)
    INSERT INTO public.tokens (
        token_label,
        citizen_id,
        service_id,
        status,
        priority,
        position_in_queue,
        original_token_id,
        is_rescheduled,
        citizen_name
    ) 
    SELECT 
        v_token_label,
        v_user_id,
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
    
    RETURN v_new_token_id;
END;
$$ LANGUAGE plpgsql;
