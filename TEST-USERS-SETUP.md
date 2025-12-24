# Test Users Setup Guide

## Step 1: Run Counter Setup SQL

Go to Supabase SQL Editor and run the complete-setup.sql file to create all 31 counters.

## Step 2: Create Auth Users in Supabase Dashboard

1. Go to **Authentication** > **Users** in Supabase Dashboard
2. Click **Add User** > **Create new user**
3. Create these three users:

### Admin User
- Email: `admin@test.com`
- Password: `admin123`
- Confirm password: checked
- Auto Confirm User: checked

### Staff User
- Email: `staff@test.com`
- Password: `staff123`
- Confirm password: checked
- Auto Confirm User: checked

### Citizen User
- Email: `citizen@test.com`
- Password: `citizen123`
- Confirm password: checked
- Auto Confirm User: checked

## Step 3: Get Auth User IDs

After creating the auth users, go to SQL Editor and run:

```sql
SELECT id, email FROM auth.users WHERE email IN ('admin@test.com', 'staff@test.com', 'citizen@test.com');
```

Copy the UUIDs for each user.

## Step 4: Insert into Users Table

Replace the `<auth_user_id_*>` placeholders with actual UUIDs from Step 3, then run:

```sql
-- Admin User
INSERT INTO users (auth_user_id, email, role, name, phone, office_id)
VALUES 
  ('<auth_user_id_admin>', 'admin@test.com', 'ADMIN', 'Admin User', '+1234567890', '44d9958e-bba4-48d9-869c-3b46c3e31663');

-- Get counter ID for staff (Counter 1 - Special Permit)
-- Run this first to get the counter ID:
SELECT id FROM counters WHERE counter_number = 1 AND service_id = '21666635-9efd-4030-959f-f887cf7a4a73';

-- Staff User (replace <counter_id> with the result from above)
INSERT INTO users (auth_user_id, email, role, name, phone, office_id, counter_id)
VALUES 
  ('<auth_user_id_staff>', 'staff@test.com', 'STAFF', 'Staff Member', '+1234567891', '44d9958e-bba4-48d9-869c-3b46c3e31663', '<counter_id>');

-- Citizen User
INSERT INTO users (auth_user_id, email, role, name, phone)
VALUES 
  ('<auth_user_id_citizen>', 'citizen@test.com', 'USER', 'Test Citizen', '+1234567892');
```

## Step 5: Verify Users

```sql
SELECT u.email, u.role, u.name, c.counter_number, s.name as service_name
FROM users u
LEFT JOIN counters c ON u.counter_id = c.id
LEFT JOIN services s ON c.service_id = s.id
WHERE u.email IN ('admin@test.com', 'staff@test.com', 'citizen@test.com');
```

## Step 6: Test Login

1. Go to http://localhost:8081
2. Click **Back to Login**
3. Try logging in with each user:
   - **Admin**: admin@test.com / admin123
   - **Staff**: staff@test.com / staff123
   - **Citizen**: citizen@test.com / citizen123

## Expected Behavior

- **Admin** should see admin dashboard with all services, counters, and tokens
- **Staff** should see staff dashboard with ability to call next token for their assigned counter
- **Citizen** should see citizen dashboard with ability to join queue and check token status
