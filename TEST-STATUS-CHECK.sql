-- Check what status values currently exist in your database
SELECT status, COUNT(*) as count
FROM public.tokens
GROUP BY status
ORDER BY status;

-- This will show you if tokens are UPPERCASE or lowercase
-- You should see: 'waiting', 'called', 'completed', etc. (all lowercase)
-- If you see: 'WAITING', 'CALLED', etc. (UPPERCASE) - you haven't run the UPDATE yet!
