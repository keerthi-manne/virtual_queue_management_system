# Complete Setup Instructions - Virtual Queue Management System

## 🎯 Current Status
✅ Frontend running on http://localhost:8081
✅ Backend running on http://localhost:5000  
✅ ML Service running on http://localhost:8000
✅ All code updated to match database schema
✅ SQL files ready for deployment

## 📋 Setup Steps

### Step 1: Run Counter Setup SQL
1. Go to Supabase Dashboard → **SQL Editor**
2. Open [complete-setup.sql](supabase-migrations/complete-setup.sql)
3. Click **Run** to create all 31 counters for 14 services

Expected result: 31 counters created across all services

### Step 2: Create Test Users

#### 2A. Create Auth Users in Supabase
1. Go to **Authentication** → **Users**
2. Click **Add User** → **Create new user**
3. Create these users (enable "Auto Confirm User"):

| Email | Password | Role |
|-------|----------|------|
| admin@test.com | admin123 | Admin |
| staff@test.com | staff123 | Staff |
| citizen@test.com | citizen123 | Citizen |

#### 2B. Get Auth User IDs
Run in SQL Editor:
```sql
SELECT id, email FROM auth.users 
WHERE email IN ('admin@test.com', 'staff@test.com', 'citizen@test.com');
```

#### 2C. Insert into Users Table
```sql
-- Get counter ID first
SELECT id FROM counters 
WHERE counter_number = 1 
AND service_id = '21666635-9efd-4030-959f-f887cf7a4a73';

-- Admin User (replace <auth_admin_id>)
INSERT INTO users (auth_user_id, email, role, name, phone, office_id)
VALUES ('<auth_admin_id>', 'admin@test.com', 'ADMIN', 'Admin User', '+1234567890', '44d9958e-bba4-48d9-869c-3b46c3e31663');

-- Staff User (replace <auth_staff_id> and <counter_id>)
INSERT INTO users (auth_user_id, email, role, name, phone, office_id, counter_id)
VALUES ('<auth_staff_id>', 'staff@test.com', 'STAFF', 'Staff Member', '+1234567891', '44d9958e-bba4-48d9-869c-3b46c3e31663', '<counter_id>');

-- Citizen User (replace <auth_citizen_id>)
INSERT INTO users (auth_user_id, email, role, name, phone)
VALUES ('<auth_citizen_id>', 'citizen@test.com', 'USER', 'Test Citizen', '+1234567892');
```

### Step 3: Test the System

#### 3A. Refresh Frontend
1. Go to http://localhost:8081 and refresh the page (Ctrl+Shift+R)
2. You should see the "Queue Status Check" page

#### 3B. Test Public Token Check
1. On the homepage, you'll see a search box
2. This is for checking token status (we'll create a token next)

#### 3C. Test Citizen Flow
1. Click **Back to Login**
2. Sign in as: `citizen@test.com` / `citizen123`
3. You should see the **Citizen Dashboard**
4. Click **Join Queue** button
5. Select a service (e.g., "Special Permit")
6. Fill in your details
7. Click **Get Token**
8. You should receive a token (e.g., A001)
9. Note down the token number

#### 3D. Test Public Status Check
1. Log out or open incognito window
2. Go to http://localhost:8081
3. Enter your token number (e.g., A001)
4. Click **Check Status**
5. You should see live token status with:
   - Priority badge
   - Estimated wait time
   - Position in queue
   - Real-time updates

#### 3E. Test Staff Flow
1. Login as: `staff@test.com` / `staff123`
2. You should see the **Staff Dashboard**
3. See the queue for your assigned counter
4. Click **Call Next Token** to call the citizen
5. The citizen should see their status change to "CALLED"
6. Click **Start Serving** when citizen arrives
7. Status changes to "SERVING"
8. Click **Complete Service** when done

#### 3F. Test Admin Flow
1. Login as: `admin@test.com` / `admin123`
2. You should see the **Admin Dashboard** with:
   - All services overview
   - All counters status
   - All tokens across services
   - Analytics and metrics

## 🔧 Database Schema Reference

### Key Tables
- **services**: 14 services (already exist)
- **counters**: 31 counters (2-3 per service)
- **tokens**: Queue tokens with token_label (not token_number!)
- **users**: User accounts with role (USER/STAFF/ADMIN)

### Important Fields
- Token label format: `A001`, `B042`, etc. (ServiceCode + Number)
- User roles: `USER` (citizen), `STAFF`, `ADMIN`
- Token status: `WAITING`, `CALLED`, `SERVING`, `COMPLETED`, `NO_SHOW`, `CANCELLED`
- Priority: `normal`, `high`, `urgent`, `emergency`

## 🐛 Troubleshooting

### Issue: "Token not found"
- Make sure you run the counter setup SQL first
- Make sure you created the token as a citizen user
- Check the token label in the database

### Issue: "Login fails"
- Verify auth users created in Supabase Authentication
- Verify users inserted in users table with correct auth_user_id
- Check browser console for errors

### Issue: "Can't join queue"
- Verify services exist in database
- Verify counters exist for the selected service
- Check backend logs for errors

### Issue: "Staff can't call tokens"
- Verify staff user has counter_id assigned
- Verify tokens exist for that counter's service
- Check that tokens have status = 'WAITING'

## 📁 Key Files

- [complete-setup.sql](supabase-migrations/complete-setup.sql) - Complete counter setup
- [TEST-USERS-SETUP.md](TEST-USERS-SETUP.md) - Detailed user setup guide
- Backend: [server/src/routes/queue.routes.ts](server/src/routes/queue.routes.ts)
- Frontend: [src/pages/PublicTokenStatus.tsx](src/pages/PublicTokenStatus.tsx)

## 🎉 Next Steps

1. Run the counter setup SQL ← **DO THIS FIRST**
2. Create test users ← **DO THIS SECOND**  
3. Test citizen flow (join queue, get token)
4. Test public check status
5. Test staff flow (call, serve, complete)
6. Test admin flow (view all data)

All services are running and ready! Just need to setup the database data.
