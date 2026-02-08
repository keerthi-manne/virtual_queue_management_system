# 🚀 Quick Start - New Features

Get the advanced features (AI classification, notifications, document upload) running in 10 minutes!

---

## ⚡ Fast Track Setup

### Step 1: Database Migration (2 minutes)

1. Open [Supabase Dashboard](https://app.supabase.com/)
2. Go to your project → **SQL Editor**
3. Click **New Query**
4. Copy contents of [supabase-migrations/priority-verification-system.sql](supabase-migrations/priority-verification-system.sql)
5. Paste and click **Run**
6. ✅ You should see "Success. No rows returned"

### Step 2: Create Storage Bucket (1 minute)

1. In Supabase, go to **Storage**
2. Click **New bucket**
3. Name: `queue-documents`
4. **Public bucket**: ✅ Check this
5. Click **Create bucket**

### Step 3: Gmail Setup (3 minutes)

1. **Enable 2FA:** https://myaccount.google.com/security
2. **Get App Password:**
   - Google Account → Security → App passwords
   - App: Mail, Device: Other
   - Copy the 16-character password
3. **Configure `.env`:**
   ```bash
   cd server
   nano .env  # or use your editor
   ```
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=abcd-efgh-ijkl-mnop
   ```

### Step 4: Install Dependencies (1 minute)

```bash
cd server
npm install nodemailer twilio
```

### Step 5: Start All Services (1 minute)

**Terminal 1 - Frontend:**
```bash
npm run dev
```

**Terminal 2 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 3 - ML Service:**
```bash
cd ml-service
python app.py
```

### Step 6: Test It! (2 minutes)

1. **Open:** http://localhost:8080
2. **Sign in** as Citizen
3. **Join Queue:**
   - Select office and service
   - Toggle "Emergency"
   - Describe: "My father had a heart attack, need medical records urgently"
   - Click "Get Token"
4. **Check Admin Dashboard:**
   - Sign in as Admin
   - Scroll to "Priority Verification"
   - See AI classified as "genuine" with high confidence
5. **Approve the request**
6. **Check your email** - notification sent! 📧

---

## 🎯 What You Can Do Now

### Citizens Can:
✅ Request priority (Senior/Disabled/Emergency)  
✅ Upload documents (Aadhaar, certificates, reports)  
✅ Get AI-classified priority  
✅ Receive email notifications  

### Admins Can:
✅ Review AI classifications  
✅ View uploaded documents  
✅ Approve/reject with notes  
✅ See confidence scores  

### System Does:
✅ AI classifies emergencies automatically  
✅ Verifies senior citizen age  
✅ Sends email notifications  
✅ Tracks all changes in audit log  

---

## 📱 SMS/WhatsApp (Optional)

Want SMS/WhatsApp too? Add Twilio:

1. **Sign up:** https://www.twilio.com/try-twilio
2. **Get phone number** (free trial)
3. **Add to `.env`:**
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```
4. **Restart backend server**

---

## 🐛 Troubleshooting

**Email not sending?**
- Check Gmail app password
- Verify 2FA is enabled
- Check server logs: `cd server && npm run dev`

**ML service errors?**
- Check if running: http://localhost:8000/health
- Restart: `cd ml-service && python app.py`

**Documents not uploading?**
- Check Supabase storage bucket exists
- Verify bucket is public
- Check browser console for errors

**AI not classifying?**
- Ensure ML service is running on port 8000
- Check network tab in browser dev tools
- Verify endpoint: `POST http://localhost:8000/classify/emergency`

---

## 📖 Full Documentation

Need more details? Check these guides:

- **[IMPLEMENTATION-SUMMARY.md](IMPLEMENTATION-SUMMARY.md)** - What was built
- **[ADVANCED-FEATURES-GUIDE.md](ADVANCED-FEATURES-GUIDE.md)** - Feature details
- **[NOTIFICATION-SETUP-GUIDE.md](NOTIFICATION-SETUP-GUIDE.md)** - Email/SMS config

---

## ✅ Checklist

- [ ] Database migration completed
- [ ] Storage bucket created
- [ ] Gmail app password configured
- [ ] Dependencies installed
- [ ] All 3 services running
- [ ] Test emergency classification works
- [ ] Test document upload works
- [ ] Test admin approval works
- [ ] Test email notifications work

---

**Ready to go! 🎉**

Any issues? Check the troubleshooting section or review the full documentation.
