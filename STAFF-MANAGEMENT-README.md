# Enhanced Staff Management System

## Overview
This enhancement adds comprehensive staff tracking and management capabilities to the Virtual Queue Management System.

## New Database Tables

### 1. Enhanced Users Table
**New Fields:**
- `counter_id`: Primary counter assignment for staff
- `is_active`: Whether staff member is currently on duty
- `last_login`: Timestamp of last login

### 2. Staff Sessions Table
Tracks individual work sessions for performance analytics:
- `staff_id`: Which staff member
- `counter_id`: Which counter they operated
- `login_time/logout_time`: Session duration
- `tokens_served`: Number of citizens served
- `total_handle_time`: Total time spent serving (minutes)

### 3. Counter Assignments Table
Permanent assignments of staff to counters:
- `staff_id`: Staff member
- `counter_id`: Assigned counter
- `is_primary`: Whether this is their main counter
- `can_operate`: Authorization to operate this counter

## How Staff Assignment Works

### For Regular Staff:
1. **Office Assignment**: Staff are assigned to specific offices via `users.office_id`
2. **Counter Assignment**: Staff can be assigned to specific counters via `counter_assignments` table
3. **Primary Counter**: Each staff has one primary counter (`is_primary = true`)
4. **Backup Coverage**: Staff can be authorized for multiple counters (`can_operate = true`)

### For Admins:
- Can view all offices, counters, and staff operations
- Can assign/reassign staff to different counters
- Can monitor all staff performance across the system

## Usage Examples

### Assign Staff to Counter:
```sql
INSERT INTO counter_assignments (staff_id, counter_id, office_id, is_primary, can_operate)
VALUES ('staff-uuid', 'counter-uuid', 'office-uuid', true, true);
```

### Track Staff Session:
```sql
-- When staff logs in to counter
INSERT INTO staff_sessions (staff_id, counter_id, office_id, login_time)
VALUES ('staff-uuid', 'counter-uuid', 'office-uuid', NOW());

-- When staff logs out
UPDATE staff_sessions
SET logout_time = NOW(), tokens_served = 15, total_handle_time = 120
WHERE staff_id = 'staff-uuid' AND logout_time IS NULL;
```

### Query Active Staff:
```sql
SELECT u.name, c.name as counter_name, o.name as office_name
FROM users u
JOIN counter_assignments ca ON u.id = ca.staff_id
JOIN counters c ON ca.counter_id = c.id
JOIN offices o ON ca.office_id = o.id
WHERE u.role = 'STAFF' AND u.is_active = true AND ca.can_operate = true;
```

## Benefits

1. **Better Resource Management**: Admins know exactly which staff can operate which counters
2. **Performance Tracking**: Detailed analytics on staff productivity and efficiency
3. **Shift Management**: Track when staff are on duty and their session performance
4. **Backup Coverage**: Know which staff can cover for others when needed
5. **Audit Trail**: Complete history of staff assignments and operations

## Migration Steps

1. Run the SQL migration: `supabase-migrations/enhanced-staff-management.sql`
2. Update existing staff records with counter assignments
3. Test the enhanced staff dashboard features
4. Train admins on the new assignment management features

## Future Enhancements

- Staff scheduling system
- Automated shift assignments based on demand
- Performance-based counter assignments
- Staff training/certification tracking