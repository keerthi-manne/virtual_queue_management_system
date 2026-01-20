# SMS Registration System - Setup Guide

## Overview
This enables keypad phone users to register for tokens via SMS without internet or smartphones.

## Features
✅ Works with ANY phone (keypad/feature phones)
✅ Uses your actual offices and services from database
✅ Simple menu-driven interface
✅ Creates real tokens in your system
✅ Same notifications (called, no-show, reschedule)
✅ No authentication required for SMS users

---

## Setup Instructions

### 1. Run Database Migration

In your Supabase SQL Editor, run the migration:

```bash
# Navigate to supabase-migrations folder
cd d:\virtual_queue_management_system\supabase-migrations

# Open sms-registration-system.sql and execute it in Supabase SQL Editor
```

Or use Supabase CLI:
```bash
supabase db push
```

This creates:
- `sms_sessions` table (tracks conversation state)
- `sms_users` table (lightweight SMS-only user profiles)
- Auto-cleanup functions for expired sessions

---

### 2. Configure Twilio

#### A. Sign Up for Twilio
1. Go to https://www.twilio.com/try-twilio
2. Sign up for free account
3. Get **$15 free credit** (enough for ~500 SMS)

#### B. Get Twilio Credentials
1. From Twilio Console Dashboard, copy:
   - **Account SID**
   - **Auth Token**

#### C. Get a Phone Number
1. In Twilio Console, go to **Phone Numbers** → **Buy a Number**
2. Choose a number that supports SMS
3. Purchase the number (uses free credit)

#### D. Configure Webhook
1. Go to **Phone Numbers** → **Manage** → **Active Numbers**
2. Click on your purchased number
3. Scroll to **Messaging Configuration**
4. Under "A MESSAGE COMES IN":
   - **Webhook**: `https://your-domain.com/api/sms/webhook`
   - **HTTP Method**: `POST`
5. Click **Save**

**For Development (ngrok):**
```bash
# Install ngrok
choco install ngrok

# Run ngrok
ngrok http 5000

# Use the ngrok URL in Twilio webhook:
# https://xxxx-xx-xx-xxx-xxx.ngrok.io/api/sms/webhook
```

---

### 3. Update Environment Variables

Edit `server/.env`:

```bash
# Add these Twilio configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

---

### 4. Install Dependencies (Already Done)

Twilio is already in your package.json, but just in case:

```bash
cd server
npm install
```

---

### 5. Start the Server

```bash
cd server
npm run dev
```

You should see:
```
🚀 Server running on port 5000
📊 Environment: development
🔌 Socket.IO initialized
```

---

## Testing

### Option 1: Test with Real SMS

1. Send SMS to your Twilio number: `START`
2. Follow the menu prompts
3. Complete registration

### Option 2: Test with API (Development)

```bash
# PowerShell
$body = @{
    phoneNumber = "+1234567890"
    message = "START"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/sms/test" -Method POST -Body $body -ContentType "application/json"
```

---

## SMS User Flow

```
User: START
System: Welcome! Please reply with your name:

User: John Doe
System: Select Office:
        1 - City Hall
        2 - East Branch
        3 - West Branch
        Reply with office number or 0 to cancel

User: 1
System: Select Service:
        1 - Birth Certificate
        2 - Death Certificate
        3 - Driver License
        ...
        Reply with service number or 0 to cancel

User: 3
System: Confirm Details:
        Name: John Doe
        Office: City Hall
        Service: Driver License
        Reply YES to confirm or NO to cancel

User: YES
System: ✓ Token Created!
        Token: DRI-0042
        Position: 8
        Est. Wait: ~40 min
        We'll SMS you when it's your turn!
        Send START for new token
```

---

## SMS Commands

| Command | Description |
|---------|-------------|
| `START` or `1` | Register for new token |
| `2` | Check active token status |
| `HELP` | Show help message |
| `CANCEL` or `0` | Cancel current registration |

---

## Integration with Existing System

### Automatic Features (Already Work):

✅ **Token Creation**: Creates real tokens in your `tokens` table
✅ **Queue Position**: Calculates correct position based on service
✅ **Notifications**: SMS users get same notifications:
   - Token created
   - Your turn (when called)
   - No-show warning
   - Reschedule offers

✅ **Staff Panel**: Staff sees SMS tokens like normal tokens
✅ **Admin Panel**: Admins see all tokens including SMS ones

### Database Schema

**SMS Users Table:**
```sql
sms_users (
  id UUID PRIMARY KEY,
  phone_number TEXT UNIQUE,
  name TEXT,
  created_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
)
```

**SMS Sessions Table:**
```sql
sms_sessions (
  id UUID PRIMARY KEY,
  phone_number TEXT,
  current_step TEXT, -- MAIN_MENU, OFFICE_SELECT, SERVICE_SELECT, CONFIRM
  selected_office_id UUID,
  selected_service_id UUID,
  user_name TEXT,
  session_data JSONB,
  expires_at TIMESTAMPTZ -- Auto-expires in 15 minutes
)
```

---

## Monitoring & Debugging

### Check SMS Logs (Twilio Console)
1. Go to **Monitor** → **Logs** → **Messaging**
2. See all incoming/outgoing messages
3. Debug webhook errors

### Check Server Logs
```bash
# Look for these messages
📱 SMS from +1234567890: START
✅ SMS response sent to +1234567890
```

### Test API Directly
```bash
# Test office selection
curl -X POST http://localhost:5000/api/sms/test \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890", "message": "1"}'
```

---

## Cost Estimates

### Twilio Pricing (US)
- **Incoming SMS**: $0.0075 per message
- **Outgoing SMS**: $0.0079 per message
- **Phone Number**: $1.15/month

### Example Monthly Cost (1000 tokens via SMS)
- Incoming (3-5 messages per registration): $0.0075 × 4 × 1000 = **$30**
- Outgoing (notifications): $0.0079 × 2 × 1000 = **$16**
- Phone number: **$1.15**
- **Total**: ~$47/month for 1000 SMS registrations

---

## Production Deployment

### 1. Update Webhook URL
Replace ngrok URL with production domain in Twilio Console:
```
https://yourdomain.com/api/sms/webhook
```

### 2. Secure Webhook (Optional but Recommended)
Verify requests are from Twilio:

```typescript
// Add to server/src/routes/sms.ts
import twilio from 'twilio';

router.post('/webhook', (req, res, next) => {
  const signature = req.headers['x-twilio-signature'];
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  
  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    signature as string,
    url,
    req.body
  );
  
  if (!isValid) {
    return res.status(403).send('Forbidden');
  }
  
  next();
});
```

### 3. Enable Auto-Cleanup
Add cron job to cleanup expired sessions:

```sql
-- Run every hour
SELECT cron.schedule(
  'cleanup-sms-sessions',
  '0 * * * *',
  'SELECT cleanup_expired_sms_sessions()'
);
```

---

## Troubleshooting

### Issue: Webhook not receiving messages
**Solution:**
1. Check Twilio webhook URL is correct
2. Ensure server is accessible (use ngrok for dev)
3. Check Twilio Debugger in Console

### Issue: "No offices available"
**Solution:**
1. Verify offices exist in database:
```sql
SELECT * FROM offices;
```
2. Check RLS policies allow access

### Issue: "Error creating token"
**Solution:**
1. Check server logs for exact error
2. Verify SMS user has permissions
3. Check token creation logic

### Issue: Session expires too quickly
**Solution:**
1. Sessions expire after 15 minutes of inactivity
2. User needs to complete registration faster
3. Increase timeout in migration if needed:
```sql
-- Change to 30 minutes
expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 minutes'
```

---

## Security Considerations

✅ **Rate Limiting**: Twilio provides built-in protection
✅ **Session Expiry**: 15-minute timeout prevents stale sessions
✅ **No Priority Claims**: SMS users get NORMAL priority only
✅ **Phone Verification**: Twilio verifies sending phone number
✅ **Database RLS**: SMS users can only access their own tokens

---

## Next Steps

1. ✅ Run database migration
2. ✅ Configure Twilio account
3. ✅ Add environment variables
4. ✅ Test with SMS/API
5. ✅ Deploy to production
6. ✅ Monitor usage and costs

---

## Support

For issues or questions:
- Check Twilio Console Debugger
- Review server logs
- Test with `/api/sms/test` endpoint
- Verify database tables created correctly

---

**That's it! Your SMS registration system is ready! 📱**
