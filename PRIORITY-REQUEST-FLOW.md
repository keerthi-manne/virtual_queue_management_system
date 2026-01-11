# Priority Request Flow - Redesign

## Current Problem
- Users can join queue immediately with disability/emergency claims
- Documents are uploaded AFTER token creation
- Admin reviews after token is already in queue

## Required Flow

### For DISABILITY Priority:
1. ✅ User checks "Person with Disability" checkbox
2. ✅ Document upload field appears (REQUIRED)
3. ✅ User uploads disability certificate
4. ✅ User submits form → Creates verification request (NO TOKEN YET)
5. ⏳ Admin reviews uploaded document in Admin Dashboard
6. ✅ Admin approves → System automatically creates token
7. ✅ User receives notification with token number

### For EMERGENCY Priority:
1. User checks "Emergency" checkbox
2. User fills emergency reason
3. Optional: Upload supporting documents
4. AI classifies emergency (auto-approve if confidence > 80%)
5. If AI confidence < 80% → Admin review required
6. After approval → Token created

### For SENIOR CITIZEN:
1. User enters date of birth
2. System auto-calculates age
3. If 60+ → Auto-approved, token created immediately
4. If < 60 but claimed senior → Requires Aadhaar verification

## Implementation Plan

### Phase 1: Update CitizenDashboard Form
- Add state: `disabilityDocUrl`
- Show DocumentUpload inline when `is_disabled` is checked
- Disable submit button until document is uploaded
- Change submission logic:
  - If disability → Create verification_request only (no token)
  - If emergency → Create verification_request + token (pending review)
  - If senior (verified) → Create token immediately
  - If normal → Create token immediately

### Phase 2: Update Admin Approval
- When admin approves disability request → Trigger token creation
- Update priority_verification_requests table with token_id after approval

### Phase 3: User Status Page
- Show pending verification requests
- Display "Your request is under review" message
- Show estimated review time
