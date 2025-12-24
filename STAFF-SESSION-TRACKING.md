# Staff Session Management System

## Overview
Implement comprehensive staff session tracking using the new database tables we created.

## Features to Implement

### 1. Clock In/Out System
**Staff Dashboard Enhancement:**
- [ ] Add "Clock In" button when staff starts shift
- [ ] Show "Clock Out" button when active
- [ ] Display current session time
- [ ] Prevent operations when not clocked in

### 2. Session Performance Tracking
**Automatic Metrics:**
- [ ] Tokens served during session
- [ ] Total handling time
- [ ] Average time per citizen
- [ ] Session duration

### 3. Counter Assignment Integration
**Smart Assignments:**
- [ ] Auto-assign to primary counter on clock-in
- [ ] Allow switching between authorized counters
- [ ] Track which counter used for each session

### 4. Admin Oversight
**Session Monitoring:**
- [ ] View active staff sessions
- [ ] Historical session reports
- [ ] Performance comparisons
- [ ] Attendance tracking

## Implementation Steps

### Step 1: Update Staff Dashboard UI
```tsx
// Add to StaffDashboard.tsx
const [currentSession, setCurrentSession] = useState(null);
const [isClockedIn, setIsClockedIn] = useState(false);

const handleClockIn = async () => {
  // Create new session record
  // Assign to primary counter
  // Update UI state
};

const handleClockOut = async () => {
  // End session
  // Calculate final metrics
  // Update database
};
```

### Step 2: Database Integration
```typescript
// Clock in function
const clockIn = async (staffId: string, counterId: string) => {
  const { data, error } = await supabase
    .from('staff_sessions')
    .insert({
      staff_id: staffId,
      counter_id: counterId,
      office_id: officeId,
      login_time: new Date().toISOString()
    })
    .select()
    .single();

  return { data, error };
};

// Clock out function
const clockOut = async (sessionId: string, metrics: any) => {
  const { error } = await supabase
    .from('staff_sessions')
    .update({
      logout_time: new Date().toISOString(),
      tokens_served: metrics.tokensServed,
      total_handle_time: metrics.totalHandleTime
    })
    .eq('id', sessionId);

  return { error };
};
```

### Step 3: Real-time Updates
- [ ] Update session metrics as tokens are completed
- [ ] Live session timer
- [ ] Automatic clock-out on logout

### Step 4: Admin Dashboard Integration
**New Admin Features:**
- [ ] Active sessions overview
- [ ] Staff attendance reports
- [ ] Performance analytics by session
- [ ] Session duration tracking

## Benefits

1. **Accurate Performance Tracking:** Know exactly when staff are working
2. **Fair Workload Distribution:** Track individual contributions
3. **Attendance Management:** Monitor staff hours and breaks
4. **Quality Assurance:** Correlate session metrics with satisfaction
5. **Resource Planning:** Better staffing decisions based on data

## Database Queries Needed

```sql
-- Active sessions
SELECT ss.*, u.name as staff_name, c.name as counter_name
FROM staff_sessions ss
JOIN users u ON ss.staff_id = u.id
JOIN counters c ON ss.counter_id = c.id
WHERE ss.logout_time IS NULL;

-- Session performance
SELECT
  staff_id,
  COUNT(*) as sessions_count,
  AVG(tokens_served) as avg_tokens_per_session,
  AVG(total_handle_time) as avg_session_duration,
  SUM(tokens_served) as total_tokens_served
FROM staff_sessions
WHERE logout_time IS NOT NULL
GROUP BY staff_id;
```

This builds directly on the database structure we just created and provides immediate value for staff management and performance tracking.</content>
<parameter name="filePath">c:\Users\Keert\my-warm-nook\STAFF-SESSION-TRACKING.md