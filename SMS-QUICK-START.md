# SMS Registration - Quick Start

## 🚀 Setup (5 minutes)

### 1. Database
```sql
-- Run in Supabase SQL Editor
-- File: supabase-migrations/sms-registration-system.sql
```

### 2. Twilio
```bash
# Get free account at: https://www.twilio.com/try-twilio
# Copy: Account SID, Auth Token, Phone Number
```

### 3. Environment Variables
```bash
# Add to server/.env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### 4. Webhook (Development)
```bash
# Install ngrok
choco install ngrok

# Run ngrok
ngrok http 5000

# Set in Twilio Console → Phone Numbers → Messaging:
https://xxxx.ngrok.io/api/sms/webhook
```

### 5. Start Server
```bash
cd server
npm run dev
```

---

## 🧪 Test It

### Option 1: Real SMS
Send to your Twilio number: `START`

### Option 2: Test API
```bash
node test-sms-registration.js
```

### Option 3: PowerShell
```powershell
$body = @{
    phoneNumber = "+1234567890"
    message = "START"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/sms/test" -Method POST -Body $body -ContentType "application/json"
```

---

## 📱 SMS Commands

| Command | Action |
|---------|--------|
| `START` | Begin registration |
| `2` | Check my token |
| `HELP` | Show commands |
| `CANCEL` | Cancel current action |

---

## ✅ What's Working

- ✅ Uses your actual offices from database
- ✅ Uses your actual services from database
- ✅ Creates real tokens
- ✅ All notifications work (called, no-show, reschedule)
- ✅ Staff sees SMS tokens in their panel
- ✅ No priority claims (NORMAL only for SMS)
- ✅ 15-minute session timeout
- ✅ No registration required

---

## 🔍 Verify Setup

### Check Database
```sql
-- Check tables created
SELECT * FROM sms_sessions;
SELECT * FROM sms_users;
```

### Check Server Running
```bash
# Should see port 5000
curl http://localhost:5000/health
```

### Check Twilio
Twilio Console → Logs → Messaging

---

## 💰 Cost (Free Trial)

- $15 free credit
- ~500 SMS messages
- $1.15/month for phone number (after trial)

---

## 🐛 Troubleshooting

| Issue | Fix |
|-------|-----|
| Webhook not working | Check ngrok URL in Twilio |
| "No offices" | Run database migration |
| Server error | Check logs: `npm run dev` |
| SMS not received | Check Twilio Debugger |

---

## 📚 Full Documentation

See: `SMS-REGISTRATION-SETUP.md`

---

**Ready to go! 🎉**
