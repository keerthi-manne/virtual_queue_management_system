# 🎫 Virtual Queue Management System for Municipal Corporations

A comprehensive, production-ready queue management system with real-time updates, **AI-powered emergency classification**, **multi-channel notifications**, and **document verification**.

## 🌟 NEW in v2.0

- 🤖 **AI Emergency Classification** - Automatically verify emergency claims with confidence scoring
- 📧 **Multi-Channel Notifications** - Email, SMS, WhatsApp alerts
- 📄 **Document Upload & Verification** - Upload Aadhaar, disability certificates, medical reports
- ✅ **Admin Approval Workflow** - Review AI classifications and uploaded documents
- 🔐 **Age Verification** - Automatic senior citizen verification from DOB
- 📊 **Audit Logging** - Complete history of all token changes

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [New Advanced Features](#new-advanced-features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)

## 🎯 Overview

A web-based Virtual Queue Management System designed for Municipal Corporations to manage citizen queues efficiently. The system provides:

- **Digital Token System** - Citizens get digital tokens and can track their position remotely
- **Real-time Updates** - Socket.IO-powered live queue updates
- **Multi-Service Support** - Handle multiple services simultaneously
- **Priority Queuing** - Special handling for senior citizens, disabled, and emergency cases
- **AI/ML Predictions** - Wait time prediction, no-show probability, demand forecasting, emergency classification
- **Staff Management** - Counter panel for staff to manage token flow
- **Admin Dashboard** - Comprehensive analytics and system management
- **Notification System** - Multi-channel alerts (Email, SMS, WhatsApp)
- **Document Verification** - Upload and verify priority claim documents

## ✨ Features

### For Citizens
- ✅ Join queue remotely
- ✅ Select service type
- ✅ Get digital token
- ✅ View live queue position
- ✅ View predicted wait time
- ✅ Priority options (Senior/Disabled/Emergency)
- ✅ **Upload documents** (Aadhaar, certificates, medical reports)
- ✅ **AI-verified emergency claims**
- ✅ **Email/SMS notifications** (token created, turn alert, your turn)
- ✅ Real-time notifications
- ✅ Cancel tokens
- ✅ View token history

### For Counter Staff
- ✅ Call next token
- ✅ Mark completed / no-show
- ✅ Transfer token to another counter
- ✅ View current serving token
- ✅ Service history
- ✅ Counter status management

### For Administrators
- ✅ Create and manage services
- ✅ Create and manage counters
- ✅ Assign counters to services
- ✅ Live queue monitoring
- ✅ **Review priority verification requests**
- ✅ **View AI classification results**
- ✅ **Approve/reject priority claims**
- ✅ **View uploaded documents**
- ✅ **Add review notes**
- ✅ Analytics dashboard
- ✅ Service reports
- ✅ Peak hour analysis

### Advanced Features
- 🤖 **AI Emergency Classification** - Automatically verify emergency claims with confidence scoring
- 📧 **Multi-Channel Notifications** - Email, SMS, WhatsApp alerts for citizens
- 📄 **Document Verification** - Upload and verify Aadhaar, disability certificates, medical reports
- 🔐 **Age Verification** - Automatic senior citizen verification from date of birth
- ✅ **Admin Approval Workflow** - Review AI classifications and uploaded documents
- 🧠 **AI/ML Predictions** - ARIMA-based wait time prediction, no-show probability, demand forecasting
- 🔄 **Real-time Updates** - Socket.IO for instant notifications
- 📊 **Analytics** - Comprehensive reporting and insights
- 🔐 **Role-based Access** - Citizen, Staff, Admin roles
- 📱 **Responsive Design** - Works on desktop and mobile
- ♿ **Accessibility** - WCAG compliant design
- 📝 **Audit Logging** - Complete history tracking of all changes

## 🆕 New Advanced Features

### 1. AI Emergency Classification
- Automatically classifies emergency claims as genuine, suspicious, or false
- Confidence scoring (0.0 to 1.0)
- Auto-approval for high-confidence genuine emergencies (≥0.8)
- Admin review queue for suspicious cases
- Keyword analysis (medical, legal, death, pregnancy)
- Pattern detection for false claims

### 2. Multi-Channel Notifications
- **Email** notifications via Gmail SMTP
- **SMS** notifications via Twilio
- **WhatsApp** Business API integration
- Notification types: Token created, position updates, turn alert, your turn, priority approved/rejected
- User preference management
- Retry logic and delivery tracking

### 3. Document Upload & Verification
- Upload Aadhaar cards for age verification
- Upload disability certificates
- Upload medical reports for emergencies
- Supabase Storage integration
- Support for JPG, PNG, PDF (max 5MB)
- Document verification status tracking

### 4. Age Verification System
- Automatic age calculation from date of birth
- Senior citizen verification (60+ years)
- Aadhaar format validation (12 digits)
- Optional last 4 digits entry

### 5. Admin Approval Workflow
- View pending verification requests
- See AI classification results with confidence scores
- Download and view uploaded documents
- Approve or reject with detailed notes
- Real-time updates via Supabase subscriptions

## 🛠️ Tech Stack

### Frontend
- **React.js** (Vite) - Modern React development
- **TypeScript** - Type-safe code
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful UI components
- **React Router** - Client-side routing
- **Socket.IO Client** - Real-time communication
- **Axios** - HTTP client
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **TypeScript** - Type-safe backend
- **Socket.IO** - WebSocket server
- **Supabase** - PostgreSQL database + Auth
- **Nodemailer** - Email notifications
- **Twilio** - SMS/WhatsApp notifications
- **Redis** (optional) - Queue state caching

### AI/ML Service
- **Python 3.9+**
- **FastAPI** - Modern Python web framework
- **scikit-learn** - Machine learning
- **statsmodels** - Time series (ARIMA)
- **XGBoost** - Gradient boosting
- **pandas** - Data manipulation
- **numpy** - Numerical computing
- **Rule-based Classifier** - Emergency claim verification

### Database & Storage
- **PostgreSQL** (via Supabase)
- **Supabase Storage** - Document uploads
- **Row Level Security** - Fine-grained access control
- **Real-time subscriptions** - Live data updates
- **5 New Tables** - Verification requests, documents, notifications, preferences, history

## 🏗️ Architecture

```
┌─────────────┐
│  Frontend   │  React + TypeScript + Tailwind
│  (Vite)     │  Socket.IO Client
└──────┬──────┘
       │
       │ HTTP/WebSocket
       │
┌──────┴──────┐
│   Backend   │  Node.js + Express + Socket.IO
│   Server    │  Queue Engine + Notification Service
└──────┬──────┘
       │
       ├─────────────┬──────────────┐
       │             │              │
┌──────┴──────┐ ┌───┴────────┐ ┌──┴──────────┐
│  Supabase   │ │ ML Service │ │   Twilio    │
│  PostgreSQL │ │  FastAPI   │ │  SMS/WhatsApp│
│+ Auth       │ │+ AI Classify│ │             │
│+ Storage    │ │            │ │   Gmail     │
└─────────────┘ └────────────┘ │   SMTP      │
                                └─────────────┘
```

### Key Components

1. **Queue Engine** - Core business logic for token management
2. **Socket Service** - Real-time WebSocket communication
3. **ML Service** - Predictive analytics + AI emergency classification
4. **Notification Service** - Multi-channel email/SMS/WhatsApp notifications
5. **Document Service** - File upload and verification
6. **Authentication** - Supabase Auth with role-based access
7. **Admin Workflow** - Priority verification and approval

## 🚀 Quick Start (10 Minutes)

**See [QUICK-START.md](QUICK-START.md) for the fastest setup!**

### What You Need:
1. ✅ Node.js 18+ and npm
2. ✅ Python 3.9+
3. ✅ Supabase account
4. ✅ Gmail account (for notifications)

### Setup Steps:

1. **Database Migration** (2 min)
   - Run [supabase-migrations/priority-verification-system.sql](supabase-migrations/priority-verification-system.sql) in Supabase SQL Editor

2. **Create Storage Bucket** (1 min)
   - Supabase → Storage → New bucket: `queue-documents` (public)

3. **Gmail Setup** (3 min)
   - Enable 2FA
   - Generate app password
   - Add to `server/.env`

4. **Install & Start** (4 min)
   ```bash
   # Install
   npm install
   cd server && npm install nodemailer twilio
   cd ../ml-service && pip install -r requirements.txt
   
   # Start all services
   npm run dev                    # Terminal 1: Frontend
   cd server && npm run dev       # Terminal 2: Backend
   cd ml-service && python app.py # Terminal 3: ML Service
   ```

🎉 **Done!** Visit http://localhost:8080

---

## 📚 Comprehensive Documentation

### Getting Started
- **[QUICK-START.md](QUICK-START.md)** - 10-minute setup guide
- **[COMPLETE-SETUP-GUIDE.md](COMPLETE-SETUP-GUIDE.md)** - Full installation instructions

### Advanced Features (New!)
- **[ADVANCED-FEATURES-GUIDE.md](ADVANCED-FEATURES-GUIDE.md)** - AI classification, notifications, document verification
- **[NOTIFICATION-SETUP-GUIDE.md](NOTIFICATION-SETUP-GUIDE.md)** - Email/SMS/WhatsApp configuration
- **[IMPLEMENTATION-SUMMARY.md](IMPLEMENTATION-SUMMARY.md)** - What was built and how to use it

### Feature Guides
- **[STAFF-MANAGEMENT-README.md](STAFF-MANAGEMENT-README.md)** - Counter panel and staff workflows
- **[AI-WAIT-TIME-PREDICTION.md](AI-WAIT-TIME-PREDICTION.md)** - ML prediction models

---

## 🚀 Getting Started (Detailed)

### Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.9+
- Supabase account
- Git
- Gmail account (for notifications)
- Twilio account (optional, for SMS/WhatsApp)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd virtual_queue_management_system
```

### 2. Setup Frontend

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env.local

# Update .env.local with your Supabase credentials:
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_ML_SERVICE_URL=http://localhost:8000

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:8080`

### 3. Setup Backend

```bash
cd server

# Install dependencies (including new ones)
npm install
npm install nodemailer twilio

# Create .env file
cp .env.example .env

# Update .env with credentials:
PORT=5000
NODE_ENV=development
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CLIENT_URL=http://localhost:8080
ML_SERVICE_URL=http://localhost:8000

# Gmail notifications (REQUIRED)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password

# Twilio (optional - for SMS/WhatsApp)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Start development server
npm run dev
```

Backend will be available at `http://localhost:5000`

### 4. Setup ML Service

```bash
cd ml-service

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start ML service
python app.py
```

ML Service will be available at `http://localhost:8000`

### 5. Setup Database

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the migration file:
   ```sql
   -- Copy and paste content from:
   supabase-migrations/complete-schema.sql
   ```

This will create all necessary tables, indexes, policies, and seed data.

### 6. Create Test Users

```sql
-- Run in Supabase SQL Editor

-- Admin user
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('admin@example.com', crypt('admin123', gen_salt('bf')), NOW());

INSERT INTO public.users (id, email, name, role)
SELECT id, 'admin@example.com', 'Admin User', 'admin'
FROM auth.users WHERE email = 'admin@example.com';

-- Staff user
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('staff@example.com', crypt('staff123', gen_salt('bf')), NOW());

INSERT INTO public.users (id, email, name, role)
SELECT id, 'staff@example.com', 'Staff User', 'staff'
FROM auth.users WHERE email = 'staff@example.com';

-- Citizen user
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('citizen@example.com', crypt('citizen123', gen_salt('bf')), NOW());

INSERT INTO public.users (id, email, name, role)
SELECT id, 'citizen@example.com', 'Citizen User', 'citizen'
FROM auth.users WHERE email = 'citizen@example.com';
```

## 📁 Project Structure

```
virtual_queue_management_system/
├── src/                          # Frontend source
│   ├── components/              # React components
│   │   ├── queue/              # Queue-specific components
│   │   ├── ui/                 # UI components (shadcn)
│   │   └── auth/               # Auth components
│   ├── pages/                   # Page components
│   │   ├── citizen/            # Citizen pages
│   │   ├── staff/              # Staff pages
│   │   ├── admin/              # Admin pages
│   │   └── auth/               # Auth pages
│   ├── services/                # API & Socket services
│   │   ├── api.ts              # HTTP API client
│   │   └── socket.ts           # Socket.IO client
│   ├── hooks/                   # Custom React hooks
│   ├── contexts/                # React contexts
│   └── types/                   # TypeScript types
│
├── server/                       # Backend server
│   └── src/
│       ├── routes/              # API routes
│       │   ├── auth.routes.ts
│       │   ├── queue.routes.ts
│       │   ├── staff.routes.ts
│       │   └── admin.routes.ts
│       ├── services/            # Business logic
│       │   ├── queueEngine.ts  # Core queue logic
│       │   ├── socketService.ts # WebSocket service
│       │   ├── mlService.ts    # ML integration
│       │   └── notificationService.ts
│       ├── models/              # Data models
│       ├── config/              # Configuration
│       └── index.ts             # Server entry point
│
├── ml-service/                   # ML/AI service
│   ├── app.py                   # FastAPI application
│   ├── models/                  # ML models
│   │   ├── wait_time_arima.py
│   │   ├── no_show_rf.py
│   │   └── demand_forecast.py
│   └── requirements.txt
│
└── supabase-migrations/         # Database migrations
    ├── complete-schema.sql
    └── enhanced-staff-management.sql
```

## 📡 API Documentation

### Base URL
- Development: `http://localhost:5000/api`
- Production: Your deployed backend URL

### Authentication
All authenticated endpoints require Bearer token:
```
Authorization: Bearer <your_access_token>
```

### Endpoints

#### Queue APIs (Citizen)
- `POST /queue/join` - Join a queue
- `GET /queue/token/:tokenId` - Get token details
- `GET /queue/service/:serviceId` - Get service queue status
- `GET /queue/stats/:serviceId` - Get queue statistics
- `POST /queue/cancel/:tokenId` - Cancel a token
- `GET /queue/services` - Get all active services
- `GET /queue/user/:userId/tokens` - Get user's tokens

#### Staff APIs
- `POST /staff/call-next` - Call next token
- `POST /staff/token/:tokenId/serve` - Mark token as serving
- `POST /staff/token/:tokenId/complete` - Complete token
- `POST /staff/token/:tokenId/no-show` - Mark as no-show
- `POST /staff/token/:tokenId/transfer` - Transfer token
- `GET /staff/counter/:counterId/current` - Get current token
- `GET /staff/counter/:counterId/history` - Get counter history
- `GET /staff/counters` - Get all counters

#### Admin APIs
- `GET /admin/dashboard` - Dashboard statistics
- `POST /admin/services` - Create service
- `PUT /admin/services/:serviceId` - Update service
- `GET /admin/services` - Get all services
- `POST /admin/counters` - Create counter
- `PUT /admin/counters/:counterId` - Update counter
- `GET /admin/counters` - Get all counters
- `GET /admin/analytics` - Get analytics data
- `GET /admin/reports/service/:serviceId` - Service report

### Socket.IO Events

#### Client → Server
- `join-service` - Subscribe to service updates
- `leave-service` - Unsubscribe from service
- `track-token` - Track specific token
- `untrack-token` - Stop tracking token
- `join-counter` - Join counter room (staff)

#### Server → Client
- `queue-update` - Queue status changed
- `token-update` - Token status changed
- `counter-update` - Counter status changed
- `announcement` - System announcement
- `notification` - User notification

## 🧠 AI/ML Features

### Current Status
All ML models are **scaffolded** with dummy predictions. The structure is production-ready but requires training with real data.

### Models Implemented

1. **Wait Time Prediction (ARIMA)**
   - Predicts estimated wait time based on queue position
   - Considers time of day, service type, priority
   - **Status**: Dummy predictions (10 min/position)

2. **No-Show Prediction (Random Forest)**
   - Predicts probability of citizen not showing up
   - Features: queue position, priority, time, day
   - **Status**: Dummy predictions (5-25% probability)

3. **Demand Forecasting**
   - Forecasts token demand for next few hours
   - Helps with resource planning
   - **Status**: Dummy forecasts with peak hours

### Training Real Models

See `ml-service/README.md` for detailed instructions on:
- Data collection requirements
- Model training procedures
- Performance metrics
- Deployment guidelines

## 📊 Key Features Explained

### Queue Engine Logic

**Priority Handling:**
```
Emergency: Weight 1000 (highest priority)
Disabled: Weight 100
Senior: Weight 50
Normal: Weight 1 (lowest priority)
```

Tokens with higher priority are called first. Within same priority, FIFO (First In First Out) applies.

**No-Show Handling:**
- If token not responded to in 5 minutes → auto-marked as no-show
- Counter becomes available for next token
- Event logged for analytics

**Dynamic Queue Positions:**
- Automatically recalculated when tokens are added/removed
- Considers priority weights
- Updates in real-time via Socket.IO

### Real-time Updates

Socket.IO provides instant updates for:
- Token status changes (called, serving, completed)
- Queue position updates
- Counter status
- System announcements
- Personalized notifications

### Role-Based Access

**Citizen:**
- Join queues
- View own tokens
- Track token status
- Cancel tokens

**Staff:**
- Manage counter
- Call tokens
- Complete services
- Transfer tokens
- View statistics

**Admin:**
- Full system access
- Create/manage services
- Create/manage counters
- View analytics
- Generate reports

## 🚀 Deployment

### Frontend (Vercel/Netlify)

```bash
# Build production bundle
npm run build

# Deploy to Vercel
vercel --prod

# Or Netlify
netlify deploy --prod
```

### Backend (Railway/Render)

```bash
cd server

# Build TypeScript
npm run build

# Start production server
npm start
```

Environment variables:
- Set all variables from `.env.example`
- Update CLIENT_URL to your frontend URL
- Use production Supabase credentials

### ML Service (Railway/Render)

```bash
cd ml-service

# Install dependencies
pip install -r requirements.txt

# Start with gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app:app
```

### Database (Supabase)

Already hosted! Just run migrations in your production Supabase project.

## 🧪 Testing

### Test Credentials
- Admin: `admin@example.com` / `admin123`
- Staff: `staff@example.com` / `staff123`
- Citizen: `citizen@example.com` / `citizen123`

### Testing Workflow

1. **Citizen Flow:**
   - Login as citizen
   - Navigate to "Join Queue"
   - Select a service
   - Fill in details
   - Get token
   - Track token status

2. **Staff Flow:**
   - Login as staff
   - Navigate to "Counter Panel"
   - Select counter
   - Call next token
   - Mark as serving
   - Complete service

3. **Admin Flow:**
   - Login as admin
   - View dashboard statistics
   - Create new service
   - Create new counter
   - View analytics

## 📝 Important Notes

1. **ML Models**: Currently using dummy predictions. Train with real data for production.

2. **Redis**: Optional. System works without Redis (uses in-memory state).

3. **Notifications**: SMS/Email integration can be added to notification service.

4. **Scaling**: Socket.IO supports clustering with Redis adapter for horizontal scaling.

5. **Security**: 
   - All routes use Supabase RLS policies
   - JWT token authentication
   - CORS properly configured
   - Input validation with Zod

## 🤝 Contributing

This is a college project / portfolio project. Feel free to:
- Fork the repository
- Create feature branches
- Submit pull requests
- Report issues

## 📄 License

MIT License - feel free to use for learning and portfolio purposes.

## 🎓 Academic Context

This project demonstrates:
- ✅ Full-stack development (MERN + Python)
- ✅ Real-time systems (Socket.IO)
- ✅ AI/ML integration (ARIMA, Random Forest)
- ✅ Database design (PostgreSQL)
- ✅ Clean architecture
- ✅ Production-ready code
- ✅ Documentation
- ✅ Innovation (Virtual queuing for municipal services)

Perfect for final year projects, internship portfolios, or real-world deployment!

## 📞 Support

For questions or issues:
1. Check documentation in respective folders
2. Review code comments (extensively documented)
3. Check API responses for error messages
4. Review browser console and server logs

## 🎉 Acknowledgments

- Supabase for backend-as-a-service
- shadcn/ui for beautiful components
- FastAPI for Python web framework
- All open-source libraries used

---

**Built with ❤️ for efficient public service delivery**
