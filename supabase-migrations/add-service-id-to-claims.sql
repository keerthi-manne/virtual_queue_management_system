-- Add service_id column to priority_claims table
-- This stores which service the user was trying to join when they uploaded the document

ALTER TABLE priority_claims 
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN priority_claims.service_id IS 'The service the user wanted to join when uploading the priority claim document';
