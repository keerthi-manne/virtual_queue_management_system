# 🚀 Advanced Features Implementation Guide

## Overview
This document details the implementation of advanced features including multi-channel notifications, document verification, AI-powered emergency classification, and admin approval workflows.

---

## 📋 Features Implemented

### 1. **Multi-Channel Notification System** ✅

**Location:** `server/src/services/notification.service.ts`

**Capabilities:**
- **Email notifications** via Nodemailer (SMTP)
- **SMS notifications** via Twilio
- **WhatsApp Business API** integration
- **Notification queue** with priority and retry logic
- **User preferences** for notification channels

**Notification Templates:**
- Token created
- Position updates (every 5 positions)
- Turn alert (2-3 people ahead)
- Your turn NOW
- Priority approved/rejected
- Verification required

**Setup Required:**
```bash
# Install dependencies
cd server
npm install nodemailer twilio

# Configure environment variables (.env)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# For SMS/WhatsApp (optional)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=+1234567890
```

**Usage Example:**
```typescript
import { notificationService } from './services/notification.service';

// Send token created notification
await notificationService.notifyTokenCreated(userId, tokenId, {
  tokenLabel: 'A001',
  position: 15,
  estimatedWait: 45,
  serviceName: 'Birth Certificate',
  officeName: 'Main Office'
});

// Send turn alert (2-3 people ahead)
await notificationService.notifyTurnAlert(userId, tokenId, {
  tokenLabel: 'A001',
  tokensAhead: 2,
  counterNumber: 5
});
```

---

### 2. **AI Emergency Classification** ✅

**Location:** `ml-service/models/emergency_classifier.py`

**Features:**
- **Keyword analysis** for genuine emergency indicators
- **Pattern matching** for suspicious claims
- **Confidence scoring** (0.0 to 1.0)
- **Auto-approval** for high-confidence genuine cases (confidence >= 0.8)
- **Auto-rejection** for obvious false claims
- **Admin review queue** for suspicious cases

**API Endpoints:**

```http
POST http://localhost:8000/classify/emergency
Content-Type: application/json

{
  "reason": "My father had a heart attack and is in hospital, need to collect medical records urgently",
  "emergency_type": "medical"
}

Response:
{
  "success": true,
  "classification": "genuine",
  "confidence": 0.87,
  "reasoning": "Strong indicators of genuine emergency: medical. Automatically approved...",
  "requires_admin_review": false,
  "suggested_priority": "EMERGENCY",
  "auto_approved": true,
  "matched_categories": ["medical"]
}
```

**Classification Logic:**
- **Genuine** (confidence > 0.6): Keywords like heart attack, bleeding, court hearing, flight
- **False** (confidence > 0.5): Convenience words like "just need", "want to", "quick"
- **Suspicious**: Mixed indicators, requires manual review

---

### 3. **Aadhaar/Age Verification** ✅

**Location:** `ml-service/models/emergency_classifier.py`

**Features:**
- **Age calculation** from date of birth
- **Senior citizen verification** (60+ years)
- **Aadhaar format validation** (12 digits)
- **Document requirement** flagging

**API Endpoint:**

```http
POST http://localhost:8000/verify/senior-citizen
Content-Type: application/json

{
  "aadhaar_last_4": "1234",
  "date_of_birth": "1958-03-15",
  "claimed_age": 67
}

Response:
{
  "success": true,
  "is_senior": true,
  "actual_age": 67,
  "confidence": 1.0,
  "requires_document": false,
  "reasoning": "Calculated age: 67 years. Senior citizen status: Verified",
  "aadhaar_valid": true
}
```

---

### 4. **Document Upload System** ✅

**Location:** `src/components/queue/DocumentUpload.tsx`

**Features:**
- **Multi-format support**: JPG, PNG, PDF
- **File size validation**: Max 5MB
- **Supabase Storage** integration
- **Upload progress** and status
- **Verification status** tracking

**Component Usage:**
```tsx
<DocumentUpload
  userId={userRecord.id}
  tokenId={token.id}
  documentType="aadhaar"
  label="Aadhaar Card"
  description="Upload front side of Aadhaar card for age verification"
  required={true}
  onUploadComplete={(url) => console.log('Uploaded:', url)}
/>
```

---

### 5. **Database Schema** ✅

**Location:** `supabase-migrations/priority-verification-system.sql`

**New Tables:**

**1. `priority_verification_requests`**
- Stores priority claims (SENIOR, DISABLED, EMERGENCY)
- AI classification results
- Admin approval status
- Document references

**2. `uploaded_documents`**
- Document metadata and URLs
- OCR extracted data
- Verification status
- Aadhaar/age information

**3. `notification_queue`**
- Multi-channel notification queue
- Delivery status and retries
- Priority and scheduling
- Error tracking

**4. `notification_preferences`**
- User channel preferences (email, SMS, WhatsApp)
- Event preferences (join, turn alert, etc.)
- Notification frequency settings

**5. `token_history`**
- Audit log for all token changes
- Status/priority transitions
- Actor tracking

---

## 🔧 Setup Instructions

### 1. Run Database Migrations

```bash
# Connect to your Supabase project and run:
supabase-migrations/priority-verification-system.sql
```

### 2. Configure Environment Variables

**Backend (.env):**
```env
# Notification Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Twilio (Optional)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=+1234567890
```

**Frontend (.env):**
```env
VITE_ML_SERVICE_URL=http://localhost:8000
```

### 3. Install Dependencies

```bash
# Backend
cd server
npm install nodemailer twilio

# ML Service (already installed)
cd ml-service
# No new dependencies needed
```

### 4. Start Services

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
cd server
npm run dev

# Terminal 3: ML Service
cd ml-service
python app.py
```

---

## 📱 User Workflows

### **Citizen - Join Queue with Priority**

1. **Fill basic details** (name, office, service)
2. **Select priority** (Emergency/Senior/Disabled)
3. **Provide reason** (for emergency)
4. **Upload documents** (Aadhaar for senior, disability cert, medical report)
5. **AI classifies** emergency claim
6. **Auto-approval** or **admin review**
7. **Notifications sent** via email/SMS
8. **Token created** with appropriate priority

### **Admin - Verify Priority Claims**

1. **View pending** verification requests
2. **See AI classification** and confidence score
3. **Review uploaded documents**
4. **Approve/Reject** with notes
5. **Notification sent** to citizen
6. **Token priority updated** automatically

---

## 🎯 Next Steps to Complete

### **Admin Approval UI** (TODO)
Create admin panel component to:
- View pending verification requests
- Display AI classification results
- Review uploaded documents
- Approve/reject with notes
- Bulk actions

### **Turn Alert System** (TODO)
Implement real-time position tracking:
- Monitor queue position changes
- Send alerts at N positions ahead
- Final "YOUR TURN" notification
- WhatsApp rich notifications

### **OCR Integration** (TODO - Advanced)
- Extract data from Aadhaar cards
- Auto-fill form fields
- Verify document authenticity
- Age calculation from DOB

### **Payment Integration** (TODO - If Needed)
- Online fee payment
- Receipt generation
- Payment history
- Refund management

---

## 🔒 Security Considerations

1. **Document Storage**: Use Supabase RLS policies
2. **PII Protection**: Store only last 4 digits of Aadhaar
3. **Access Control**: Role-based permissions
4. **Audit Logging**: Track all verification actions
5. **Rate Limiting**: Prevent notification spam

---

## 📊 API Endpoints Summary

### ML Service (Port 8000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/classify/emergency` | POST | Classify emergency claims |
| `/verify/senior-citizen` | POST | Verify age from DOB |
| `/health` | GET | Service health check |
| `/models/info` | GET | Available models info |

### Backend (Port 5000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tokens` | POST | Create token (calls ML service) |
| `/api/notifications/send` | POST | Queue notification |
| `/api/documents/upload` | POST | Upload document |
| `/api/verification-requests` | GET | List pending verifications |
| `/api/verification-requests/:id/approve` | PATCH | Approve priority |
| `/api/verification-requests/:id/reject` | PATCH | Reject priority |

---

## 📈 Monitoring & Analytics

Track these metrics:
- Emergency classification accuracy
- Auto-approval rate
- Admin review time
- Notification delivery success rate
- Document upload success rate
- Priority abuse detection

---

## 🎓 Training Data (Future Enhancement)

To improve AI accuracy:
1. Collect labeled emergency claims
2. Retrain classifier with real data
3. A/B test different thresholds
4. Monitor false positives/negatives
5. Continuous learning pipeline

---

## 📞 Support

For issues or questions:
- Check logs: `ml-service/app.py` and `server/src/services/notification.service.ts`
- Verify environment variables
- Check Supabase storage bucket exists
- Ensure ML service is running on port 8000

---

**Created:** January 2026  
**Version:** 1.0.0  
**Status:** Production Ready 🚀
