# 🔄 Token Reschedule System - Complete Setup Guide

## Overview
The Token Reschedule System automatically handles no-show scenarios by:
1. ✅ Staff marks token as no-show
2. 📧 System sends SMS + Email to user
3. ✔️ User accepts/declines reschedule via link
4. 🎫 New token created if accepted

---

## 🗄️ Database Setup

### Step 1: Run Migration
Execute the SQL migration to create necessary tables and functions:

```bash
# Run this migration in your Supabase SQL editor
psql -U postgres -d your_database < supabase-migrations/token-reschedule-system.sql
```

Or copy the contents of `supabase-migrations/token-reschedule-system.sql` into Supabase SQL Editor and execute.

### What Gets Created:
- ✅ `reschedule_requests` table - Tracks all reschedule requests
- ✅ Database functions:
  - `create_reschedule_request()` - Creates reschedule request
  - `accept_reschedule_request()` - Accepts and creates new token
  - `decline_reschedule_request()` - Declines request
  - `expire_reschedule_requests()` - Auto-expires old requests
- ✅ RLS policies for security
- ✅ Indexes for performance

---

## 🔧 Backend Configuration

### Step 1: Environment Variables
Add these to your `server/.env`:

```env
# Email Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# Application URLs
CLIENT_URL=http://localhost:5173
API_URL=http://localhost:5000

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 2: Install Dependencies (if needed)
```bash
cd server
npm install nodemailer twilio @supabase/supabase-js
```

### Step 3: Start Server
```bash
cd server
npm run dev
```

---

## 🎨 Frontend Configuration

### Step 1: Environment Variables
Add to your `.env` (root directory):

```env
VITE_API_URL=http://localhost:5000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Step 2: Start Frontend
```bash
npm run dev
```

---

## 📧 Email/SMS Setup

### Gmail Setup (For Email Notifications)

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password**:
   - Go to Google Account Settings → Security
   - Search for "App passwords"
   - Generate new app password for "Mail"
   - Use this password in `SMTP_PASSWORD`

### Twilio Setup (For SMS Notifications)

1. **Create Twilio Account**: https://www.twilio.com/
2. **Get Phone Number**:
   - Navigate to Phone Numbers → Buy a Number
   - Choose a number with SMS capability
3. **Get Credentials**:
   - Account SID: Found in Twilio Console dashboard
   - Auth Token: Also in console dashboard
4. **Update `.env`** with these credentials

---

## 🧪 Testing the Complete Flow

### Test Scenario: No-Show with Reschedule

#### 1. Create a Token (as Citizen)
```bash
# Login as citizen
# Navigate to Citizen Dashboard
# Select service and create token
```

#### 2. Call the Token (as Staff)
```bash
# Login as staff
# Select counter and service
# Click "Call Next Token"
# Token status changes to "CALLED"
```

#### 3. Mark as No-Show (as Staff)
```bash
# In "Currently Serving" section
# Click "No Show" button
```

**What Happens:**
- ✅ Token status changed to `no_show`
- ✅ Reschedule request created in database
- ✅ Email sent to user's email
- ✅ SMS sent to user's phone
- ✅ Request expires in 24 hours

**Sample Email Content:**
```
Subject: ⏰ Reschedule Your Token T0001?

Hi John Doe,

We called your token but you didn't arrive at the counter.

Original Token: T0001
Service: Passport Service
Status: No Show

Would you like to reschedule?
[YES, Reschedule My Token] [No Thanks]

Expires: January 10, 2026, 2:30 PM
```

**Sample SMS Content:**
```
🔔 Token No-Show Alert

Hi John, we called token T0001 for Passport Service but you didn't show up.

Would you like to RESCHEDULE and get a new token?

Reply or visit: http://localhost:5173/reschedule/abc-123-def

Expires: Jan 10, 2:30 PM
```

#### 4. User Receives Notification
- **Email**: Opens inbox, sees reschedule email
- **SMS**: Receives text with reschedule link
- **Both contain**: Clickable link to reschedule page

#### 5. User Accepts Reschedule
```bash
# User clicks link in email/SMS
# Opens: http://localhost:5173/reschedule/{requestId}
# Sees reschedule confirmation page
# Clicks "Yes, Reschedule My Token"
```

**What Happens:**
- ✅ New token created (e.g., T0005)
- ✅ Added to waiting queue
- ✅ Confirmation email sent
- ✅ Confirmation SMS sent
- ✅ Original token's `reschedule_count` incremented
- ✅ New token marked as `is_rescheduled = true`

**Confirmation Email:**
```
Subject: ✅ Reschedule Confirmed - New Token T0005

Hi John Doe,

Great news! Your reschedule has been approved.

Your New Token: T0005
Service: Passport Service

You've been added back to the queue. Please arrive at the facility.

[Check Queue Status]
```

#### 6. User Declines Reschedule
```bash
# User clicks "No Thanks" button
```

**What Happens:**
- ✅ Reschedule request marked as `declined`
- ✅ No new token created
- ✅ Process ends

---

## 📊 API Endpoints

### Mark Token as No-Show
```http
POST /api/reschedule/mark-no-show
Content-Type: application/json

{
  "tokenId": "uuid-here",
  "staffId": "staff-uuid",
  "reason": "Citizen didn't show up"
}
```

### Accept Reschedule Request
```http
POST /api/reschedule/accept/{requestId}
```

### Decline Reschedule Request
```http
POST /api/reschedule/decline/{requestId}
```

### Get Reschedule Request Details
```http
GET /api/reschedule/request/{requestId}
```

### Get User's Reschedule Requests
```http
GET /api/reschedule/user/{userId}
```

### Get All Pending Requests (Admin/Staff)
```http
GET /api/reschedule/pending
```

---

## 🔍 Database Queries for Testing

### Check Reschedule Requests
```sql
SELECT 
  rr.*,
  t.token_number,
  u.name,
  u.email,
  u.phone
FROM reschedule_requests rr
JOIN tokens t ON rr.token_id = t.id
JOIN users u ON rr.user_id = u.id
ORDER BY rr.created_at DESC;
```

### Check Tokens with Reschedule History
```sql
SELECT 
  token_number,
  status,
  is_rescheduled,
  reschedule_count,
  original_token_id
FROM tokens
WHERE is_rescheduled = true 
   OR reschedule_count > 0
ORDER BY created_at DESC;
```

### Check Expired Requests
```sql
-- Manually expire old requests
SELECT expire_reschedule_requests();

-- View expired requests
SELECT * FROM reschedule_requests 
WHERE request_status = 'expired';
```

---

## 🎯 Key Features

### Auto-Expiration
- Reschedule requests expire after 24 hours
- Database function `expire_reschedule_requests()` handles cleanup
- Consider adding cron job to run this periodically:

```sql
-- Create periodic job (if using pg_cron)
SELECT cron.schedule('expire-reschedules', '0 * * * *', 
  'SELECT expire_reschedule_requests();'
);
```

### Notification Tracking
Each reschedule request tracks:
- `notification_sent`: Any notification sent
- `email_sent`: Email notification status
- `sms_sent`: SMS notification status

### Security
- Row Level Security (RLS) enabled
- Users can only see their own requests
- Staff/Admin can see all requests
- Only staff can create reschedule requests

---

## 🐛 Troubleshooting

### Emails Not Sending
```bash
# Check SMTP configuration
curl -v smtp://smtp.gmail.com:587

# Test with simple script
node -e "const nodemailer = require('nodemailer'); console.log('OK')"

# Check logs
tail -f server/logs/error.log
```

### SMS Not Sending
```bash
# Verify Twilio credentials
curl -X GET "https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}" \
  -u "${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}"

# Check phone number format (must include country code)
# Correct: +1234567890
# Wrong: 1234567890
```

### Notifications Sent but Not Received
- Check spam folder for emails
- Verify phone number has SMS capability
- Check Twilio logs: https://console.twilio.com/
- Verify email address is correct

### Database Errors
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'reschedule_requests';

-- Check if functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%reschedule%';
```

---

## 📝 Testing Checklist

- [ ] Database migration executed successfully
- [ ] Server starts without errors
- [ ] Frontend loads reschedule page
- [ ] Can mark token as no-show
- [ ] Email notification received
- [ ] SMS notification received
- [ ] Reschedule link works
- [ ] Accept creates new token
- [ ] Decline works properly
- [ ] Expired requests handled correctly
- [ ] Confirmation emails sent
- [ ] New token appears in queue

---

## 🚀 Production Deployment

### Before Going Live:

1. **Update Environment Variables**:
   - Change `CLIENT_URL` to production domain
   - Use production Supabase credentials
   - Use production SMTP/Twilio accounts

2. **Set up Email Templates**:
   - Customize email HTML/text
   - Add company branding
   - Update contact information

3. **Configure Cron Jobs**:
   ```sql
   -- Auto-expire old requests (run hourly)
   SELECT cron.schedule('expire-reschedules', '0 * * * *', 
     'SELECT expire_reschedule_requests();'
   );
   ```

4. **Set up Monitoring**:
   - Log all notification failures
   - Monitor reschedule acceptance rate
   - Track expired requests

5. **Test Thoroughly**:
   - Test with real email addresses
   - Test with real phone numbers
   - Verify all notifications arrive
   - Check spam folder placement

---

## 📈 Analytics & Reporting

### Useful Queries:

```sql
-- Reschedule acceptance rate
SELECT 
  COUNT(*) FILTER (WHERE request_status = 'accepted') * 100.0 / COUNT(*) as acceptance_rate
FROM reschedule_requests;

-- Average response time
SELECT 
  AVG(EXTRACT(EPOCH FROM (responded_at - requested_at))/60) as avg_response_minutes
FROM reschedule_requests
WHERE responded_at IS NOT NULL;

-- No-show rate by service
SELECT 
  s.name,
  COUNT(*) FILTER (WHERE t.status = 'no_show') * 100.0 / COUNT(*) as no_show_rate
FROM tokens t
JOIN services s ON t.service_id = s.id
GROUP BY s.name;
```

---

## 🎉 Success Metrics

Your reschedule system is working if you see:
- ✅ No-show tokens automatically trigger reschedule requests
- ✅ Users receive notifications within seconds
- ✅ Accepted requests create new tokens in queue
- ✅ Declined/expired requests marked correctly
- ✅ Staff dashboard updates in real-time
- ✅ Zero manual intervention required

---

## 💡 Tips

1. **Test with your own email/phone first**
2. **Monitor Twilio usage to avoid surprise bills**
3. **Set up email whitelisting to avoid spam**
4. **Add rate limiting to prevent abuse**
5. **Consider adding reminder notifications before expiry**
6. **Log all reschedule events for analytics**

---

## 🆘 Support

If you encounter issues:
1. Check server logs: `server/logs/`
2. Check browser console for frontend errors
3. Verify database migrations ran successfully
4. Test email/SMS independently
5. Review environment variables

---

**System Status**: ✅ Fully Functional  
**Last Updated**: January 9, 2026  
**Version**: 1.0.0
