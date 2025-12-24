# Backend Server - Virtual Queue Management System

Node.js + Express + Socket.IO backend server with TypeScript.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your credentials

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📋 Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests (when implemented)

## 🔑 Environment Variables

Create `.env` file with:

```env
PORT=5000
NODE_ENV=development

# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Redis (optional - will use in-memory if not available)
REDIS_URL=redis://localhost:6379

# ML Service
ML_SERVICE_URL=http://localhost:8000

# CORS
CLIENT_URL=http://localhost:5173
```

## 📡 API Structure

### Routes
- `/api/auth` - Authentication endpoints
- `/api/queue` - Queue management (citizen-facing)
- `/api/staff` - Staff operations
- `/api/admin` - Administrative functions

### Services
- **queueEngine.ts** - Core queue management logic
- **socketService.ts** - Real-time WebSocket management
- **mlService.ts** - ML service integration
- **notificationService.ts** - User notifications

## 🏗️ Architecture

```
src/
├── index.ts              # Server entry point
├── config/
│   └── supabase.ts      # Supabase client setup
├── routes/              # API route handlers
│   ├── auth.routes.ts
│   ├── queue.routes.ts
│   ├── staff.routes.ts
│   └── admin.routes.ts
├── services/            # Business logic
│   ├── queueEngine.ts   # Core queue logic
│   ├── socketService.ts # Socket.IO management
│   ├── mlService.ts     # ML integration
│   └── notificationService.ts
└── models/
    └── queue.model.ts   # TypeScript interfaces
```

## 🔄 Queue Engine

The core queue engine handles:
- **Token creation** with automatic position calculation
- **Priority handling** (Emergency > Disabled > Senior > Normal)
- **Dynamic queue positions** - auto-recalculated
- **No-show detection** - 5-minute timeout
- **Token transfer** between counters
- **Statistics** - real-time queue analytics

### Priority Weights
```typescript
EMERGENCY: 1000
DISABLED: 100
SENIOR: 50
NORMAL: 1
```

### Token Lifecycle
```
WAITING → CALLED → SERVING → COMPLETED
                 ↓
              NO_SHOW / CANCELLED
```

## 🔌 Socket.IO Events

### Server Emits
- `queue-update` - Service queue changed
- `token-update` - Token status changed
- `counter-update` - Counter status changed
- `announcement` - System-wide announcement
- `notification` - User-specific notification

### Client Emits
- `join-service` - Subscribe to service updates
- `track-token` - Track specific token
- `join-counter` - Join counter room (staff)

## 🧠 ML Integration

Server communicates with Python ML service for:
- **Wait time prediction** - ARIMA-based forecasting
- **No-show probability** - Random Forest classification
- **Demand forecasting** - Time-series prediction

Falls back to simple calculations if ML service unavailable.

## 🗄️ Database

Uses Supabase (PostgreSQL) with:
- Row Level Security (RLS) policies
- Foreign key relationships
- Indexes for performance
- Triggers for timestamps

### Main Tables
- `users` - User profiles (extends auth.users)
- `services` - Municipal services
- `counters` - Service counters
- `tokens` - Queue tokens
- `queue_events` - Event log for analytics
- `notifications` - User notifications

## 📊 API Response Format

### Success Response
```json
{
  "success": true,
  "data": {...},
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "error": "Error message",
  "status": 400
}
```

## 🔐 Authentication

Uses Supabase Auth with JWT tokens:
- Token in `Authorization: Bearer <token>` header
- Middleware validates token
- User role checked for authorization

## 📝 Code Style

- TypeScript strict mode
- Async/await for asynchronous operations
- Comprehensive error handling
- JSDoc comments for documentation
- Consistent naming conventions

## 🐛 Debugging

Enable debug logs:
```bash
export NODE_ENV=development
npm run dev
```

Check logs for:
- API request/response
- Socket.IO connections
- Queue operations
- ML service calls

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

### Environment
- Set `NODE_ENV=production`
- Use production Supabase credentials
- Configure CORS for production domains
- Use Redis for production (recommended)

### Scaling
- Use PM2 for process management
- Use Redis adapter for Socket.IO clustering
- Load balancer for multiple instances
- Monitor with logs and metrics

## 📈 Performance Tips

1. **Database Queries**
   - Use indexes (already configured)
   - Batch operations where possible
   - Use pagination for large results

2. **Socket.IO**
   - Use rooms for targeted broadcasting
   - Disconnect idle connections
   - Rate limit socket events

3. **Caching**
   - Redis for frequently accessed data
   - In-memory cache for service list
   - Cache ML predictions

## 🔒 Security

- Input validation with Zod
- SQL injection protection (Supabase)
- XSS protection
- CORS configured
- Rate limiting (add middleware if needed)
- JWT token expiration

## 🧪 Testing

Add tests for:
- Queue engine logic
- API endpoints
- Socket.IO events
- ML service integration

```bash
# When tests are added:
npm test
```

## 📚 Additional Documentation

- See `/docs` for detailed API documentation
- Check code comments for implementation details
- Review `queue.model.ts` for data structures

## 🤝 Contributing

Follow existing code style and patterns:
- Add JSDoc comments
- Handle errors appropriately
- Write type-safe code
- Add validation for inputs

## 📞 Support

Check:
1. Server logs for errors
2. Database logs in Supabase
3. API responses for error details
4. Socket.IO connection status
