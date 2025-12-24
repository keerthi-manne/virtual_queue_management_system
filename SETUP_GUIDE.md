# 🚀 Quick Setup Guide - Virtual Queue Management System

Follow these steps to get the complete system running in under 10 minutes!

## ⚡ Prerequisites Checklist

- ✅ Node.js 18+ installed
- ✅ Python 3.9+ installed
- ✅ Supabase account (free tier works)
- ✅ Git installed
- ✅ Code editor (VS Code recommended)

## 📦 Step-by-Step Setup

### Step 1: Setup Supabase (5 minutes)

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for database to initialize
   - Note down your project URL and keys

2. **Run Database Migration**
   - Go to SQL Editor in Supabase dashboard
   - Copy content from `supabase-migrations/complete-schema.sql`
   - Paste and run
   - Verify tables created (users, services, counters, tokens, etc.)

3. **Get Your Credentials**
   ```
   Project URL: https://xxxxx.supabase.co
   Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### Step 2: Setup Frontend (2 minutes)

```bash
# In project root
npm install

# Create environment file
echo "VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000" > .env.local

# Replace placeholders with your actual Supabase credentials

# Start dev server
npm run dev
```

✅ Frontend running at `http://localhost:5173`

### Step 3: Setup Backend (2 minutes)

```bash
# Open new terminal
cd server

# Install dependencies
npm install

# Create environment file
echo "PORT=5000
NODE_ENV=development
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CLIENT_URL=http://localhost:5173
ML_SERVICE_URL=http://localhost:8000" > .env

# Replace placeholders with your Supabase credentials

# Start server
npm run dev
```

✅ Backend running at `http://localhost:5000`

### Step 4: Setup ML Service (2 minutes)

```bash
# Open new terminal
cd ml-service

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start ML service
python app.py
```

✅ ML Service running at `http://localhost:8000`

### Step 5: Create Test Users (1 minute)

Run in Supabase SQL Editor:

```sql
-- Admin user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@test.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);

INSERT INTO public.users (id, email, name, role)
SELECT id, 'admin@test.com', 'Admin User', 'admin'
FROM auth.users WHERE email = 'admin@test.com';

-- Staff user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'staff@test.com',
  crypt('staff123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);

INSERT INTO public.users (id, email, name, role)
SELECT id, 'staff@test.com', 'Staff User', 'staff'
FROM auth.users WHERE email = 'staff@test.com';

-- Citizen user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'citizen@test.com',
  crypt('citizen123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);

INSERT INTO public.users (id, email, name, role)
SELECT id, 'citizen@test.com', 'Citizen User', 'citizen'
FROM auth.users WHERE email = 'citizen@test.com';
```

## 🎯 Test the System

### Test Citizen Flow

1. Open `http://localhost:5173`
2. Login: `citizen@test.com` / `citizen123`
3. Navigate to "Join Queue"
4. Select service: "Birth Certificate"
5. Fill name and click "Get Token"
6. See your token number and queue position

### Test Staff Flow

1. Open new incognito window
2. Login: `staff@test.com` / `staff123`
3. Navigate to "Counter Panel"
4. Click "Call Next Token"
5. See the citizen's token appear
6. Click "Complete Service"

### Test Admin Flow

1. Open another incognito window
2. Login: `admin@test.com` / `admin123`
3. Navigate to "Admin Dashboard"
4. View statistics
5. Create new service
6. Create new counter

### Test Real-time Updates

1. Keep both citizen and staff windows open side-by-side
2. When staff calls token → citizen sees notification
3. When token status changes → updates instantly in both windows
4. Queue positions update in real-time

## ✅ Verification Checklist

- [ ] Frontend loads without errors
- [ ] Backend responds at `/health` endpoint
- [ ] ML service responds at `/health` endpoint
- [ ] Can login with test users
- [ ] Can create token as citizen
- [ ] Can call token as staff
- [ ] Real-time updates working
- [ ] Socket.IO connected (check browser console)

## 🔧 Troubleshooting

### Frontend won't start
- Check Node.js version: `node --version` (should be 18+)
- Delete `node_modules` and reinstall: `npm install`
- Check `.env.local` file exists and has correct values

### Backend errors
- Verify Supabase credentials in `.env`
- Check port 5000 is not in use
- Review server console for errors
- Test Supabase connection: `curl http://localhost:5000/health`

### ML Service errors
- Check Python version: `python --version` (should be 3.9+)
- Activate virtual environment
- Reinstall dependencies: `pip install -r requirements.txt`
- Test: `curl http://localhost:8000/health`

### Socket.IO not connecting
- Check CLIENT_URL in backend `.env`
- Check VITE_SOCKET_URL in frontend `.env.local`
- Look for CORS errors in browser console
- Verify backend server is running

### Database errors
- Check Supabase project is active
- Verify migration ran successfully
- Check Row Level Security policies are enabled
- Review Supabase logs

## 🎓 Next Steps

After basic setup works:

1. **Customize Services**
   - Add your own municipal services
   - Set appropriate service times
   - Create counters for each service

2. **Train ML Models**
   - Collect historical data
   - Train ARIMA model for wait times
   - Train Random Forest for no-show prediction
   - See `ml-service/README.md`

3. **Enhance UI**
   - Customize branding
   - Add your organization logo
   - Modify color scheme
   - Add additional features

4. **Deploy to Production**
   - Frontend → Vercel/Netlify
   - Backend → Railway/Render
   - Database → Already on Supabase
   - ML Service → Railway/Render

## 📚 Documentation Links

- [Full Project README](./PROJECT_README.md)
- [Backend Documentation](./server/README.md)
- [ML Service Documentation](./ml-service/README.md)
- [API Documentation](./PROJECT_README.md#api-documentation)

## 💡 Tips

- **Use Incognito Windows** for testing different user roles simultaneously
- **Check Browser Console** for real-time Socket.IO events
- **Monitor Backend Logs** to see queue operations
- **Use Supabase Dashboard** to view database changes in real-time

## 🆘 Still Having Issues?

1. Check all environment variables are set correctly
2. Ensure all services are running (frontend, backend, ML service)
3. Review console logs for specific errors
4. Check Supabase dashboard for database issues
5. Verify network connectivity

## 🎉 Success!

If you can:
- ✅ Login with different roles
- ✅ Create tokens as citizen
- ✅ Call tokens as staff
- ✅ See real-time updates
- ✅ View admin dashboard

**Congratulations! Your Virtual Queue Management System is fully operational!** 🎊

---

**Time to complete: ~10-15 minutes**

Now you have a production-ready queue management system with real-time updates and AI/ML capabilities!
