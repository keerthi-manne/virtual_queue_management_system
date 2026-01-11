# 📧 Notification Service Setup Guide

Complete guide to configure multi-channel notifications (Email, SMS, WhatsApp) for the Virtual Queue Management System.

---

## 📋 Prerequisites

1. **Node.js** installed (v18+)
2. **Gmail account** (for email notifications)
3. **Twilio account** (optional, for SMS/WhatsApp)
4. **Database migrations** completed

---

## 🔧 Part 1: Email Notifications (Gmail)

### Step 1: Enable 2-Factor Authentication

1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Click **Security** in the left sidebar
3. Under "Signing in to Google", enable **2-Step Verification**
4. Follow the on-screen instructions to set up 2FA

### Step 2: Generate App Password

1. After enabling 2FA, go back to **Security** settings
2. Under "Signing in to Google", click **App passwords**
3. Select app: **Mail**
4. Select device: **Other (Custom name)**
5. Enter name: `QueueFlow Notifications`
6. Click **Generate**
7. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)
8. **Save this password** - you won't see it again!

### Step 3: Configure Environment Variables

Create/edit `.env` file in the `server` directory:

```env
# Email Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password-here
SMTP_FROM_NAME=QueueFlow Notifications
SMTP_FROM_EMAIL=your-email@gmail.com
```

**Example:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=queueflow.alerts@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop
SMTP_FROM_NAME=QueueFlow Notifications
SMTP_FROM_EMAIL=queueflow.alerts@gmail.com
```

---

## 📱 Part 2: SMS & WhatsApp (Twilio) - Optional

### Step 1: Create Twilio Account

1. Go to [Twilio.com](https://www.twilio.com/)
2. Click **Sign up** and create a free account
3. Verify your email and phone number
4. You'll receive **$15 free trial credit**

### Step 2: Get Phone Number

1. In Twilio Console, go to **Phone Numbers** > **Manage** > **Buy a number**
2. Select your country
3. Check **SMS** and **MMS** capabilities
4. Click **Search** and choose a number
5. Click **Buy** (uses trial credit)

### Step 3: Get API Credentials

1. In Twilio Console, go to **Account** > **API keys & tokens**
2. Copy your **Account SID**
3. Copy your **Auth Token** (click to reveal)
4. Copy your **Twilio Phone Number** (from Step 2)

### Step 4: Enable WhatsApp (Optional)

1. Go to **Messaging** > **Try it out** > **Send a WhatsApp message**
2. Follow instructions to activate WhatsApp sandbox
3. Send `join <sandbox-word>` to the Twilio WhatsApp number
4. Copy the **WhatsApp-enabled phone number**

### Step 5: Add to Environment Variables

Add these to your `server/.env` file:

```env
# Twilio Configuration (SMS & WhatsApp)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

**Example:**
```env
TWILIO_ACCOUNT_SID=ACa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5
TWILIO_AUTH_TOKEN=9876543210abcdef9876543210abcdef
TWILIO_PHONE_NUMBER=+15551234567
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

---

## 🗄️ Part 3: Database Setup

### Run Migrations

```bash
# Connect to your Supabase project
# Run this SQL file in the SQL Editor:
supabase-migrations/priority-verification-system.sql
```

This creates:
- `notification_queue` table
- `notification_preferences` table
- `priority_verification_requests` table
- `uploaded_documents` table
- `token_history` table

### Verify Tables

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('notification_queue', 'notification_preferences');
```

---

## 🚀 Part 4: Installation & Testing

### Step 1: Install Dependencies

```bash
cd server
npm install nodemailer twilio
```

### Step 2: Start the Backend Server

```bash
cd server
npm run dev
```

You should see:
```
✓ Notification service initialized successfully
✓ Email notifications enabled
✓ SMS notifications enabled (if Twilio configured)
✓ WhatsApp notifications enabled (if Twilio configured)
```

### Step 3: Test Email Notification

Create a test route in `server/src/index.ts`:

```typescript
import { notificationService } from './services/notification.service';

app.post('/test/email', async (req, res) => {
  try {
    await notificationService.queueNotification({
      userId: 'test-user-id',
      type: 'TOKEN_CREATED',
      channel: 'EMAIL',
      recipient: 'test@example.com',
      subject: 'Test Email',
      body: 'This is a test notification from QueueFlow!',
      priority: 'NORMAL',
      metadata: {}
    });

    res.json({ success: true, message: 'Email queued successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

Test with curl:
```bash
curl -X POST http://localhost:5000/test/email \
  -H "Content-Type: application/json"
```

Check your inbox for the test email!

### Step 4: Test SMS (If Configured)

```bash
curl -X POST http://localhost:5000/test/sms \
  -H "Content-Type: application/json" \
  -d '{"phone": "+15551234567", "message": "Test SMS from QueueFlow"}'
```

---

## 📊 Part 5: Monitoring & Troubleshooting

### Check Notification Queue

```sql
SELECT * FROM notification_queue 
WHERE sent_at IS NULL 
ORDER BY created_at DESC;
```

### Check User Preferences

```sql
SELECT * FROM notification_preferences 
WHERE user_id = 'your-user-id';
```

### View Sent Notifications

```sql
SELECT * FROM notification_queue 
WHERE sent_at IS NOT NULL 
ORDER BY sent_at DESC 
LIMIT 10;
```

### Common Issues

**1. Email not sending:**
- Check SMTP credentials in `.env`
- Verify Gmail app password is correct
- Check server logs for errors
- Ensure 2FA is enabled on Gmail

**2. SMS not sending:**
- Verify Twilio credentials
- Check phone number format (+country code)
- Ensure recipient is verified in trial mode
- Check Twilio console for error logs

**3. WhatsApp not sending:**
- Confirm sandbox setup completed
- Verify recipient sent `join` message
- Check WhatsApp number format (whatsapp:+...)

---

## 🔒 Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use environment-specific configs** (dev, staging, prod)
3. **Rotate credentials** regularly
4. **Enable rate limiting** to prevent spam
5. **Log failed deliveries** for monitoring
6. **Use secure SMTP connection** (TLS)

---

## 📈 Advanced Configuration

### Custom Email Templates

Edit templates in `server/src/services/notification.service.ts`:

```typescript
private getEmailTemplate(type: string, metadata: any): string {
  switch (type) {
    case 'TOKEN_CREATED':
      return `
        <h2>🎫 Your Queue Token</h2>
        <p>Token: <strong>${metadata.tokenLabel}</strong></p>
        <p>Position: ${metadata.position}</p>
        <p>Estimated wait: ${metadata.estimatedWait} minutes</p>
      `;
    // Add more custom templates...
  }
}
```

### Notification Frequency Settings

Update `notification_preferences` table:

```sql
UPDATE notification_preferences 
SET 
  position_update_frequency = 10,  -- Every 10 positions
  turn_alert_tokens_ahead = 3      -- Alert 3 tokens ahead
WHERE user_id = 'user-id';
```

### Background Processing Interval

Adjust in `notification.service.ts`:

```typescript
setInterval(() => {
  this.processQueue();
}, 30000); // 30 seconds (default)
```

---

## 📞 Support Resources

- **Nodemailer Docs:** https://nodemailer.com/about/
- **Twilio Docs:** https://www.twilio.com/docs
- **Gmail SMTP:** https://support.google.com/mail/answer/7126229
- **Supabase Docs:** https://supabase.com/docs

---

## ✅ Checklist

- [ ] Gmail 2FA enabled
- [ ] App password generated
- [ ] `.env` file configured
- [ ] Dependencies installed
- [ ] Database migrations run
- [ ] Backend server started
- [ ] Test email sent successfully
- [ ] Twilio account created (optional)
- [ ] SMS tested (optional)
- [ ] WhatsApp configured (optional)
- [ ] User preferences set
- [ ] Monitoring dashboard checked

---

**Last Updated:** January 2026  
**Version:** 1.0.0  
**Status:** Production Ready 🚀
