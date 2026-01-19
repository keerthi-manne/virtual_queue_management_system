-- Daily Demand Tracking Table
-- Stores aggregated token counts per service per day for analytics

CREATE TABLE IF NOT EXISTS daily_demand (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  token_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one record per service per day
  UNIQUE(service_id, date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_daily_demand_service_date ON daily_demand(service_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_demand_date ON daily_demand(date DESC);

-- Function to update daily demand count
CREATE OR REPLACE FUNCTION update_daily_demand()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new token is created or joined_at is updated
  IF (TG_OP = 'INSERT' AND NEW.joined_at IS NOT NULL) OR 
     (TG_OP = 'UPDATE' AND NEW.joined_at IS NOT NULL AND OLD.joined_at IS DISTINCT FROM NEW.joined_at) THEN
    
    INSERT INTO daily_demand (service_id, date, token_count, updated_at)
    VALUES (NEW.service_id, DATE(NEW.joined_at), 1, NOW())
    ON CONFLICT (service_id, date) 
    DO UPDATE SET 
      token_count = daily_demand.token_count + 1,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on tokens table
DROP TRIGGER IF EXISTS trigger_update_daily_demand ON tokens;
CREATE TRIGGER trigger_update_daily_demand
  AFTER INSERT OR UPDATE OF joined_at ON tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_demand();

-- Backfill existing data
INSERT INTO daily_demand (service_id, date, token_count, updated_at)
SELECT 
  service_id,
  DATE(joined_at) as date,
  COUNT(*) as token_count,
  NOW() as updated_at
FROM tokens
WHERE joined_at IS NOT NULL
GROUP BY service_id, DATE(joined_at)
ON CONFLICT (service_id, date) 
DO UPDATE SET 
  token_count = EXCLUDED.token_count,
  updated_at = NOW();

COMMENT ON TABLE daily_demand IS 'Tracks daily token counts per service for demand analysis and forecasting';
