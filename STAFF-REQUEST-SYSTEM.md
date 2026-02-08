# 🎯 Staff Request System & Counter Display - Implementation Guide

## ✅ Features Implemented

### 1. **Staff Request System**

**Staff Can:**
- Click "Request to Serve" button next to any waiting queue member
- Send requests with optional reason to admin
- See request status updates

**Admin Can:**
- View all pending staff requests in a dedicated section
- See full details: staff name, token, citizen info, priority, service
- Approve requests → assigns token to staff's counter & calls it
- Reject requests with notes
- All actions logged with timestamps

**Workflow:**
1. Staff sees waiting queue and clicks "Request to Serve" on a specific token
2. Request sent to admin with all details
3. Admin reviews and approves/rejects
4. On approval:
   - Token assigned to staff's counter
   - Token status changed to "CALLED"
   - Notifications sent to citizen (SMS/WhatsApp/Email)
   - Staff can now serve the customer

### 2. **User Counter Display**

**Citizens See:**
- **Large counter assignment** when token is called
  - "You are assigned to Counter: [X]" banner
  - Counter number displayed in large, bold text
  - Visual emphasis with colored background
- **Position in counter's queue** if pre-assigned
- **Estimated wait time** based on counter performance
- **Real-time updates** via WebSocket

**Display Features:**
- Visual hierarchy: Counter number most prominent
- Color coding: Blue for assigned, Primary for called
- Position tracking at specific counter
- AI-powered wait time predictions

## 📁 Files Created/Modified

### New Files:
1. **`supabase-migrations/staff-requests-table.sql`**
   - Creates `staff_requests` table
   - Includes RLS policies for security
   - Indexes for performance

2. **`server/src/routes/staff-requests.routes.ts`**
   - POST `/api/staff-requests` - Create request
   - GET `/api/staff-requests` - List requests
   - PATCH `/api/staff-requests/:id/approve` - Approve request
   - PATCH `/api/staff-requests/:id/reject` - Reject request

3. **`src/components/admin/StaffRequestsManager.tsx`**
   - Admin UI component
   - Shows pending requests
   - Approve/reject dialog
   - Real-time refresh (10s)

### Modified Files:
1. **`server/src/index.ts`**
   - Added staff requests routes

2. **`src/pages/staff/StaffDashboard.tsx`**
   - Added "Request to Serve" button
   - Request handling logic
   - Toast notifications

3. **`src/pages/citizen/CitizenDashboard.tsx`**
   - Counter assignment banner
   - Large counter number display
   - Position in counter queue
   - Enhanced visual indicators

4. **`src/pages/admin/AdminDashboard.tsx`**
   - Integrated StaffRequestsManager component

## 🚀 Setup Instructions

### Step 1: Run Database Migration

```sql
-- Run in Supabase SQL Editor
-- File: supabase-migrations/staff-requests-table.sql
```

This creates:
- `staff_requests` table with all fields
- RLS policies for staff and admin
- Performance indexes

### Step 2: Test the System

#### A. **As Staff:**
1. Sign in as staff@test.com
2. Select office, service, and counter
3. See waiting queue with "Request to Serve" buttons
4. Click button next to any token
5. Request sent! Toast notification confirms

#### B. **As Admin:**
1. Sign in as admin@test.com
2. Scroll to "Staff Service Requests" section
3. See pending requests with all details
4. Click "Approve" → Token assigned & called
5. Click "Reject" → Request rejected with notes

#### C. **As Citizen:**
1. Join queue (get token like A123)
2. Wait for token to be called
3. See large counter assignment banner
4. "You are assigned to Counter: 5" appears
5. Position and wait time shown

## 🎨 UI Components

### Staff Dashboard - Request Button
```tsx
<Button
  size="sm"
  variant="outline"
  onClick={() => handleRequestToServe(token)}
  disabled={!selectedCounter}
>
  <Send className="h-4 w-4 mr-1" />
  Request to Serve
</Button>
```

### Citizen Dashboard - Counter Banner
```tsx
{token.counter_id && token.status === 'CALLED' && (
  <div className="p-4 bg-primary text-primary-foreground rounded-lg text-center">
    <p className="text-sm font-medium mb-2">🎯 You are assigned to</p>
    <p className="text-4xl font-bold">Counter {counterNumber}</p>
    <p className="text-sm mt-2">Please proceed to the counter now!</p>
  </div>
)}
```

### Admin Dashboard - Requests Manager
- Card with pending count badge
- Request details: staff, token, citizen, service, priority
- Approve/Reject buttons
- Dialog for confirmation with notes field
- Auto-refresh every 10 seconds

## 🔄 API Endpoints

### Create Request
```http
POST /api/staff-requests
Content-Type: application/json

{
  "staffId": "uuid",
  "tokenId": "uuid",
  "reason": "Optional reason text"
}
```

### List Requests
```http
GET /api/staff-requests?staffId=uuid&status=PENDING
```

### Approve Request
```http
PATCH /api/staff-requests/:id/approve
Content-Type: application/json

{
  "adminId": "uuid",
  "counterId": "uuid (optional)",
  "notes": "Optional notes"
}
```

### Reject Request
```http
PATCH /api/staff-requests/:id/reject
Content-Type: application/json

{
  "adminId": "uuid",
  "notes": "Reason for rejection"
}
```

## 🔒 Security (RLS Policies)

- **Staff:** Can only view/create own requests
- **Admin:** Can view/update all requests
- **Separation of duties:** Staff can't approve own requests
- **Audit trail:** All actions logged with timestamps

## 📊 Database Schema

```sql
CREATE TABLE staff_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES users(id),
  token_id UUID NOT NULL REFERENCES tokens(id),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT
);
```

## 🎯 Key Features

✅ **Request to Serve** - Staff can request specific customers
✅ **Admin Approval** - Full control over assignments
✅ **Auto-Assignment** - Approved requests auto-assign to counter
✅ **Notifications** - SMS/WhatsApp/Email sent on assignment
✅ **Counter Display** - Large, clear counter numbers for citizens
✅ **Position Tracking** - Show position in counter's specific queue
✅ **Real-time Updates** - WebSocket for live status changes
✅ **Audit Trail** - All requests logged with timestamps
✅ **Mobile Responsive** - Works on all screen sizes

## 🧪 Testing Checklist

- [ ] Staff can see "Request to Serve" buttons
- [ ] Requests show in admin dashboard
- [ ] Admin can approve requests
- [ ] Token gets assigned to correct counter
- [ ] Citizen sees counter assignment banner
- [ ] Notifications sent on assignment
- [ ] Admin can reject requests
- [ ] Rejected requests don't assign tokens
- [ ] Real-time updates work (10s refresh)
- [ ] Mobile view looks good

## 🚀 Services Running

- **Frontend:** http://localhost:8080
- **Backend:** http://localhost:5000
- **ML Service:** http://localhost:8000

All features are live and ready to test!
