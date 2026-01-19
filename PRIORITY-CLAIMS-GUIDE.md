# Priority Claims System - Complete Guide

## Overview

This system allows users to claim priority (Senior, Disabled, Emergency) by uploading documents. The system uses OCR to auto-verify, then sends to admin for final approval.

## Flow

1. **User uploads document** (Aadhaar for senior, disability certificate, emergency proof)
2. **OCR extracts data** (age from Aadhaar, keywords from disability certificate)
3. **Auto-verification** (age ≥ 60 for senior, valid keywords for disabled)
4. **Admin review** (approves or rejects claim)
5. **Priority applied** (only after admin approval)

## API Endpoints

### 1. Upload Document
```
POST /api/claim/upload
Content-Type: multipart/form-data

Body:
- document: File (image of Aadhaar/certificate)
- userId: UUID
- claimType: SENIOR | DISABLED | EMERGENCY
- tokenId: UUID (optional - if claiming for existing token)
```

**Response:**
```json
{
  "success": true,
  "claim": {
    "id": "claim-uuid",
    "user_id": "user-uuid",
    "claim_type": "SENIOR",
    "status": "PENDING",
    "auto_verified": true
  }
}
```

### 2. Extract Age from Aadhaar (Manual OCR)
```
POST /api/claim/extract-age
Content-Type: application/json

Body:
{
  "filename": "uploaded-file-name"
}
```

**Response:**
```json
{
  "success": true,
  "age": 65,
  "isSenior": true,
  "dob": "1960-01-15"
}
```

### 3. Verify Disability Certificate (Manual OCR)
```
POST /api/claim/extract-disability
Content-Type: application/json

Body:
{
  "filename": "uploaded-file-name"
}
```

**Response:**
```json
{
  "success": true,
  "valid": true,
  "foundKeywords": ["disability", "government", "certificate"],
  "extractedText": "..."
}
```

### 4. Get Pending Claims (Admin)
```
GET /api/claim/pending
```

**Response:**
```json
{
  "success": true,
  "claims": [
    {
      "id": "claim-uuid",
      "user_id": "user-uuid",
      "claim_type": "SENIOR",
      "status": "PENDING",
      "auto_verified": true,
      "verification_data": { "age": 65, "dob": "1960-01-15" },
      "submitted_at": "2026-01-19T08:00:00Z",
      "users": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+919876543210"
      }
    }
  ]
}
```

### 5. Approve Claim (Admin)
```
POST /api/claim/approve
Content-Type: application/json

Body:
{
  "claimId": "claim-uuid",
  "adminNotes": "Age verified, approved"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Claim approved"
}
```

### 6. Reject Claim (Admin)
```
POST /api/claim/reject
Content-Type: application/json

Body:
{
  "claimId": "claim-uuid",
  "adminNotes": "Document unclear, resubmit"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Claim rejected"
}
```

## Database Migration

Run this SQL in Supabase SQL Editor:

```sql
-- See supabase-migrations/priority-claims-table.sql
```

Or run via command:
```bash
psql <your-db-url> -f supabase-migrations/priority-claims-table.sql
```

## Testing

### 1. Test Senior Claim with Aadhaar

Create a test Aadhaar image with visible DOB text:
- Use an image editor to create a fake Aadhaar with text "DOB: 15/01/1960"
- Or use a real (redacted) Aadhaar image

Upload:
```bash
curl -X POST http://localhost:5000/api/claim/upload \
  -F "document=@aadhaar.jpg" \
  -F "userId=6c6e1c15-bf28-4cb8-a2da-e4e3a96a9b96" \
  -F "claimType=SENIOR"
```

### 2. Test Disability Claim

Create a test disability certificate image with text:
- "Government of India"
- "Disability Certificate"
- "Permanent Disability: 60%"

Upload:
```bash
curl -X POST http://localhost:5000/api/claim/upload \
  -F "document=@disability-cert.jpg" \
  -F "userId=6c6e1c15-bf28-4cb8-a2da-e4e3a96a9b96" \
  -F "claimType=DISABLED"
```

### 3. Test Emergency Claim

Upload:
```bash
curl -X POST http://localhost:5000/api/claim/emergency \
  -F "document=@medical-report.jpg" \
  -F "userId=6c6e1c15-bf28-4cb8-a2da-e4e3a96a9b96" \
  -F "reason=Severe chest pain, requires immediate attention"
```

### 4. Admin Review

Get pending claims:
```bash
curl http://localhost:5000/api/claim/pending
```

Approve a claim:
```bash
curl -X POST http://localhost:5000/api/claim/approve \
  -H "Content-Type: application/json" \
  -d '{
    "claimId": "claim-uuid-from-pending",
    "adminNotes": "Verified and approved"
  }'
```

## Frontend Integration

### Upload Form (React)

```tsx
const handleUpload = async (file: File, claimType: string) => {
  const formData = new FormData();
  formData.append('document', file);
  formData.append('userId', userId);
  formData.append('claimType', claimType);
  
  const res = await fetch('/api/claim/upload', {
    method: 'POST',
    body: formData
  });
  
  const data = await res.json();
  console.log('Claim submitted:', data.claim);
};
```

### Admin Dashboard

```tsx
const PendingClaims = () => {
  const [claims, setClaims] = useState([]);
  
  useEffect(() => {
    fetch('/api/claim/pending')
      .then(res => res.json())
      .then(data => setClaims(data.claims));
  }, []);
  
  const approveClaim = async (claimId: string) => {
    await fetch('/api/claim/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimId, adminNotes: 'Approved' })
    });
    // Refresh claims
  };
  
  return (
    <div>
      {claims.map(claim => (
        <div key={claim.id}>
          <h3>{claim.claim_type}</h3>
          <p>User: {claim.users.name}</p>
          <p>Auto-verified: {claim.auto_verified ? 'Yes' : 'No'}</p>
          <button onClick={() => approveClaim(claim.id)}>Approve</button>
        </div>
      ))}
    </div>
  );
};
```

## OCR Accuracy Tips

- **Aadhaar**: Ensure DOB is clearly visible, no glare/shadows
- **Disability Certificate**: Scan at high resolution (300 DPI+)
- **Text quality**: Clear fonts, good lighting
- **Supported formats**: JPG, PNG, PDF

## Security

- Files stored in `server/uploads/` directory
- File size limit: 5MB
- Supported types: Images (JPG, PNG), PDF
- Admin-only approval endpoints (add auth middleware)
- Document paths not exposed to users

## Next Steps

1. Run database migration
2. Test with sample documents
3. Add frontend upload UI
4. Add admin dashboard for claim review
5. Add authentication to admin endpoints
6. Deploy and test in production

---

**Last Updated:** January 19, 2026
