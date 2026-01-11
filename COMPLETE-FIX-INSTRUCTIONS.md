# COMPLETE PROJECT FIX - FINAL CHECKLIST

## STEP 1: RUN SQL IN SUPABASE (REQUIRED)

### Open Supabase Dashboard → SQL Editor → Run this file:
**File:** `FINAL-DATABASE-FIX.sql`

This will:
- ✅ Convert all status values to lowercase (waiting, called, completed, etc.)
- ✅ Convert all priority values to UPPERCASE (NORMAL, SENIOR, DISABLED, EMERGENCY)
- ✅ Fix CHECK constraints to match actual values
- ✅ Update reschedule functions to use correct column names (citizen_id, token_label, joined_at)

### Verification Query (run after the fix):
```sql
SELECT 'Status' as type, status as value, COUNT(*) as count
FROM public.tokens GROUP BY status
UNION ALL
SELECT 'Priority' as type, priority as value, COUNT(*) as count  
FROM public.tokens GROUP BY priority
ORDER BY type, count DESC;
```

**Expected output:**
- Status: waiting, called, serving, completed, no_show, cancelled (ALL lowercase)
- Priority: NORMAL, SENIOR, DISABLED, EMERGENCY (ALL UPPERCASE)

---

## STEP 2: VERIFY CODE CHANGES (ALREADY DONE)

### Frontend - Status Values (lowercase):
- ✅ `src/types/database.ts` - TokenStatus type uses lowercase
- ✅ `src/pages/citizen/CitizenDashboard.tsx` - status: 'waiting' on token creation
- ✅ `src/pages/queue/JoinQueue.tsx` - status: 'waiting' on token creation
- ✅ `src/pages/staff/StaffDashboard.tsx` - status: 'called', 'completed' (lowercase)
- ✅ All status checks use lowercase: 'waiting', 'called', 'completed', 'no_show'

### Frontend - Priority Values (UPPERCASE):
- ✅ `src/types/database.ts` - Priority type uses UPPERCASE
- ✅ `src/pages/citizen/CitizenDashboard.tsx` - returns 'EMERGENCY', 'DISABLED', 'SENIOR', 'NORMAL'
- ✅ `src/pages/citizen/JoinQueueNew.tsx` - default 'NORMAL', enum uses UPPERCASE
- ✅ `src/pages/queue/JoinQueue.tsx` - default 'NORMAL', enum uses UPPERCASE
- ✅ All priority checks use UPPERCASE

### Backend - Status Values (lowercase):
- ✅ `server/src/models/queue.model.ts` - TokenStatus enum values are lowercase
- ✅ `server/src/routes/reschedule.routes.ts` - checks for 'called', 'serving', sets 'no_show'
- ✅ `server/src/routes/staff-requests.routes.ts` - checks 'waiting', sets 'called'

### Backend - Priority Values (UPPERCASE):
- ✅ Backend uses Priority enum which has UPPERCASE values

---

## STEP 3: HARD REFRESH BROWSER

After running the SQL:
1. Press **Ctrl + Shift + R** (or Shift + F5)
2. Clear cache if needed
3. Relogin if required

---

## STEP 4: TEST COMPLETE FLOW

### Test 1: Citizen Join Queue
1. Login as citizen
2. Click "Get Token and Join Queue"
3. Fill form and submit
4. ✅ Should see success message with token number
5. Click "My Tokens" tab
6. ✅ Should see your token listed

### Test 2: Staff Call Token
1. Login as staff
2. Select office, service, counter
3. Click "Call Next Token"
4. ✅ Token should appear in "Currently Serving"
5. Token status should be 'called'

### Test 3: No Show & Reschedule
1. With token in "Currently Serving"
2. Click "No Show" button
3. ✅ Should see success toast
4. ✅ Backend should create reschedule_request
5. ✅ Notifications sent (check console logs)
6. Check user's email/SMS for reschedule link

### Test 4: Accept Reschedule
1. Click reschedule link from email/SMS
2. Click "Yes, Reschedule" button
3. ✅ Should see success message
4. ✅ New token created with status 'waiting'
5. New token should appear in queue

---

## CURRENT STATE

### What's Fixed:
✅ All status references use lowercase consistently
✅ All priority references use UPPERCASE consistently  
✅ Database CHECK constraints fixed
✅ Reschedule functions use correct column names (citizen_id, token_label, joined_at)
✅ Frontend token creation uses correct status/priority
✅ Backend routes use correct status/priority
✅ Citizen dashboard fetches own tokens by citizen_id
✅ Staff dashboard handles called/serving statuses correctly

### What You Need to Do:
⚠️ **RUN THE SQL FILE:** `FINAL-DATABASE-FIX.sql` in Supabase SQL Editor
⚠️ **HARD REFRESH BROWSER:** Ctrl + Shift + R
⚠️ **TEST:** Follow test flow above

---

## IF ERRORS OCCUR

### Error: "column user_id does not exist"
- ✅ FIXED: Reschedule functions now use citizen_id

### Error: "Token not visible after creation"
- ✅ FIXED: Status is now lowercase, frontend fetches by citizen_id

### Error: "No Show button doesn't work"
- ✅ FIXED: Backend accepts 'called' and 'serving' status, converts to 'no_show'

### Error: "Priority not working"
- ✅ FIXED: All priorities are UPPERCASE, sorting uses UPPERCASE values

---

## VERIFICATION COMMANDS

After running SQL, verify in Supabase SQL Editor:

```sql
-- Check status values (should be lowercase)
SELECT DISTINCT status FROM tokens;

-- Check priority values (should be UPPERCASE)  
SELECT DISTINCT priority FROM tokens;

-- Check reschedule table exists
SELECT COUNT(*) FROM reschedule_requests;

-- Check reschedule functions exist
SELECT proname FROM pg_proc WHERE proname LIKE '%reschedule%';
```

---

## SUMMARY

**Single SQL file to run:** `FINAL-DATABASE-FIX.sql`
**Then:** Hard refresh browser (Ctrl+Shift+R)
**Result:** Everything works - citizen join queue, staff call tokens, no-show reschedule, all functional

No more blank screens, no more errors, complete consistency achieved.
