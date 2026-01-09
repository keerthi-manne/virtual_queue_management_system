-- Fix all existing tokens with uppercase status values to lowercase
-- This ensures compatibility with the database CHECK constraint

UPDATE public.tokens
SET status = LOWER(status)
WHERE status IN ('WAITING', 'CALLED', 'SERVING', 'COMPLETED', 'NO_SHOW', 'CANCELLED');

-- Verify the update
SELECT status, COUNT(*) as count
FROM public.tokens
GROUP BY status
ORDER BY status;
