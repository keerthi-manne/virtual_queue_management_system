-- Priority Claims Table for Document Verification
-- Stores Aadhaar, Disability Certificate, and Emergency claims
-- Admin approves/rejects claims before flagging users

CREATE TABLE IF NOT EXISTS priority_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_id UUID REFERENCES tokens(id) ON DELETE SET NULL,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('SENIOR', 'DISABLED', 'EMERGENCY')),
  document_path TEXT,
  document_name TEXT,
  reason TEXT, -- For emergency claims
  verification_data JSONB, -- OCR extracted data (age, keywords, etc.)
  auto_verified BOOLEAN DEFAULT FALSE, -- Auto-verified by OCR
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  admin_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_priority_claims_user_id ON priority_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_priority_claims_token_id ON priority_claims(token_id);
CREATE INDEX IF NOT EXISTS idx_priority_claims_status ON priority_claims(status);
CREATE INDEX IF NOT EXISTS idx_priority_claims_claim_type ON priority_claims(claim_type);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_priority_claims_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER priority_claims_updated_at_trigger
BEFORE UPDATE ON priority_claims
FOR EACH ROW
EXECUTE FUNCTION update_priority_claims_updated_at();

-- Comments
COMMENT ON TABLE priority_claims IS 'Priority claims for seniors, disabled, and emergency cases requiring admin approval';
COMMENT ON COLUMN priority_claims.claim_type IS 'SENIOR (age ≥ 60), DISABLED (disability certificate), EMERGENCY (medical emergency)';
COMMENT ON COLUMN priority_claims.auto_verified IS 'Automatically verified by OCR (age/certificate validation)';
COMMENT ON COLUMN priority_claims.verification_data IS 'OCR extracted data: age, DOB, keywords, etc.';
