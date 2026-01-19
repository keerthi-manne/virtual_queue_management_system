# Gmail SMTP Setup Guide

## 🔴 Current Issue
```
SMTP verify failed: Invalid login: 535-5.7.8 Username and Password not accepted
```

**Cause:** The password in `server/.env` is not a valid Gmail App Password.

---

## ✅ Solution: Create Gmail App Password

### Step 1: Enable 2-Step Verification
1. Go to https://myaccount.google.com/security
2. Click **2-Step Verification**
3. Follow the prompts to enable it (required for App Passwords)

### Step 2: Generate App Password
1. Go to https://myaccount.google.com/apppasswords
   - Or: Google Account → Security → 2-Step Verification → App passwords
2. Click **Select app** → Choose "Mail"
3. Click **Select device** → Choose "Windows Computer"
4. Click **Generate**
5. **Copy the 16-character password** (shown without spaces)
   - Example: `abcdwxyzefgh1234`

### Step 3: Update Server Environment
Edit `server/.env`:

```env
# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_gmail_address@gmail.com
SMTP_PASSWORD=your_16_char_app_password
SMTP_FROM_NAME=QueueFlow Notifications
SMTP_FROM_EMAIL=your_gmail_address@gmail.com
```

**Important:**
- `SMTP_USER` and `SMTP_FROM_EMAIL` **must be the same Gmail address**
- `SMTP_PASSWORD` is the **App Password**, NOT your regular Gmail password
- Remove any spaces from the App Password

### Step 4: Restart Server
```bash
# Stop the server (Ctrl+C in terminal)
# Then restart
cd server
npm run dev
```

### Step 5: Test Email
Once server restarts and shows "✓ SMTP connected", test with:

```bash
# Using curl (Windows PowerShell)
curl -X POST http://localhost:5000/api/email-test/send `
  -H "Content-Type: application/json" `
  -d '{\"to\":\"your_test_email@gmail.com\"}'

# Or using Postman/Insomnia
POST http://localhost:5000/api/email-test/send
Body: { "to": "your_test_email@gmail.com" }
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Test email sent successfully",
  "details": {
    "messageId": "...",
    "recipient": "your_test_email@gmail.com"
  }
}
```

---

## 🔍 Troubleshooting

### Still Getting "Invalid login"?
- ✓ Verify 2-Step Verification is enabled
- ✓ Generate a **new** App Password
- ✓ Copy App Password exactly (no spaces)
- ✓ Use the correct Gmail account in both `SMTP_USER` and `SMTP_FROM_EMAIL`
- ✓ Restart the server after changing `.env`

### "Less secure app access" Message?
- **Ignore it** - App Passwords are the secure method
- Regular passwords no longer work with Gmail SMTP (since May 2022)

### Check Current Config
```bash
curl http://localhost:5000/api/email-test/config
```

This shows your current SMTP settings (password is masked).

---

## 📧 Alternative: Use Dedicated Email Service

If Gmail is causing issues, consider these alternatives:

### Option 1: Resend (Easiest)
```bash
npm install resend
```

Update `.env`:
```env
RESEND_API_KEY=re_your_api_key
SMTP_FROM_EMAIL=onboarding@resend.dev
```

Free tier: 100 emails/day
Signup: https://resend.com

### Option 2: SendGrid
```env
SENDGRID_API_KEY=SG.your_api_key
```

Free tier: 100 emails/day
Signup: https://sendgrid.com

### Option 3: Mailgun
```env
MAILGUN_API_KEY=your_api_key
MAILGUN_DOMAIN=your_domain
```

Free tier: 1,000 emails/month
Signup: https://mailgun.com

---

## ✅ What to Expect When It Works

### Server Startup Logs
```
✓ .env file loaded successfully
✓ SMTP connected (smtp.gmail.com:465, secure=true)
✓ Notification service initialized
✓ Email notifications enabled
✓ Processing pending notifications every 30 seconds
```

### Automatic Notifications
Once SMTP works, these are sent automatically:
- 🎫 **Token Created** - When user creates a queue token
- ⏰ **Turn Alert** - When user is 3 positions away
- 🔴 **Your Turn** - When it's their turn at the counter
- 📋 **Verification Required** - For priority claims
- ✅ **Priority Approved/Rejected** - Status updates

### Test Endpoint
- `POST /api/email-test/send` - Send test email
- `GET /api/email-test/config` - View SMTP config

---

## 📝 Notes

- Gmail has a **500 emails/day** limit for personal accounts
- For production, consider G Suite (2,000/day) or dedicated email service
- App Passwords can be revoked at any time from Google Account settings
- Each App Password is unique per device/app

---

## 🆘 Still Need Help?

1. Check the terminal logs when server starts
2. Look for "✓ SMTP connected" or "✗ SMTP verify failed"
3. Run `GET /api/email-test/config` to verify settings
4. Try the test endpoint with your email address
5. Check Gmail's spam folder for test emails

---

**Last Updated:** January 19, 2026
