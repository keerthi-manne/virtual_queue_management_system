# 🎫 Virtual Queue Management System for Municipal Corporations

A comprehensive, production-ready queue management system with real-time updates, AI/ML predictions, and multi-service support.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
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
- **AI/ML Predictions** - Wait time prediction, no-show probability, and demand forecasting
- **Staff Management** - Counter panel for staff to manage token flow
- **Admin Dashboard** - Comprehensive analytics and system management

## ✨ Features

### For Citizens
- ✅ Join queue remotely
- ✅ Select service type
- ✅ Get digital token
- ✅ View live queue position
- ✅ View predicted wait time
- ✅ Priority options (Senior/Disabled/Emergency)
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
- ✅ Analytics dashboard
- ✅ Service reports
- ✅ Peak hour analysis

### Advanced Features
- 🧠 **AI/ML Predictions** - ARIMA-based wait time prediction
- 🔄 **Real-time Updates** - Socket.IO for instant notifications
- 📊 **Analytics** - Comprehensive reporting and insights
- 🔐 **Role-based Access** - Citizen, Staff, Admin roles
- 📱 **Responsive Design** - Works on desktop and mobile
- ♿ **Accessibility** - WCAG compliant design

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
- **Redis** (optional) - Queue state caching

### AI/ML Service
- **Python 3.9+**
- **FastAPI** - Modern Python web framework
- **scikit-learn** - Machine learning
- **statsmodels** - Time series (ARIMA)
- **XGBoost** - Gradient boosting
- **pandas** - Data manipulation
- **numpy** - Numerical computing

### Database
- **PostgreSQL** (via Supabase)
- **Row Level Security** - Fine-grained access control
- **Real-time subscriptions** - Live data updates

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
│   Server    │  Queue Engine + Business Logic
└──────┬──────┘
       │
       ├─────────────┐
       │             │
┌──────┴──────┐ ┌───┴────────┐
│  Supabase   │ │ ML Service │
│  PostgreSQL │ │  FastAPI   │
│  + Auth     │ │  (Python)  │
└─────────────┘ └────────────┘
```

### Key Components

1. **Queue Engine** - Core business logic for token management
2. **Socket Service** - Real-time WebSocket communication
3. **ML Service** - Predictive analytics (wait time, no-show, demand)
4. **Notification Service** - Multi-channel notifications
5. **Authentication** - Supabase Auth with role-based access

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.9+
- Supabase account
- Git

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

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:5173`

### 3. Setup Backend

```bash
cd server

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Update .env with credentials:
PORT=5000
NODE_ENV=development
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CLIENT_URL=http://localhost:5173
ML_SERVICE_URL=http://localhost:8000

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
