# AI Wait-Time Prediction Engine

## Overview
Implement machine learning model to predict estimated wait times for citizens joining queues.

## Current Data Available
- Queue length (tokens waiting)
- Service type
- Time of day
- Day of week
- Historical completion times
- Priority levels

## Implementation Plan

### Phase 1: Data Collection & Storage
**Goal:** Gather training data for ML model

**Tasks:**
- [ ] Create `wait_time_predictions` table
- [ ] Log actual vs predicted wait times
- [ ] Store historical queue data
- [ ] Track service completion rates

### Phase 2: Simple Prediction Model
**Goal:** Basic rule-based prediction

**Algorithm:**
```python
def predict_wait_time(queue_length, service_type, hour_of_day, day_of_week):
    base_time = SERVICE_BASE_TIMES[service_type]  # e.g., 5 min for passport
    queue_multiplier = queue_length * 2  # 2 min per person
    time_multiplier = get_time_multiplier(hour_of_day)  # peak hours slower
    day_multiplier = get_day_multiplier(day_of_week)  # weekdays busier

    return base_time + queue_multiplier * time_multiplier * day_multiplier
```

### Phase 3: ML Model Integration
**Goal:** Advanced prediction using historical data

**Features to predict:**
- Total wait time from joining to completion
- Position-based ETA updates
- Confidence intervals

### Phase 4: Real-time Updates
**Goal:** Dynamic predictions as queue changes

**Implementation:**
- Update predictions when tokens join/leave
- Recalculate ETAs for all waiting citizens
- Show live updates in citizen interface

## Database Schema Additions

```sql
-- Store prediction accuracy for model improvement
CREATE TABLE prediction_accuracy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES services(id),
  office_id UUID REFERENCES offices(id),
  predicted_wait_time INTEGER, -- minutes
  actual_wait_time INTEGER,     -- minutes
  queue_length INTEGER,
  hour_of_day INTEGER,
  day_of_week INTEGER,
  priority VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cache predictions for performance
CREATE TABLE wait_time_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES services(id),
  office_id UUID REFERENCES offices(id),
  queue_length INTEGER,
  predicted_wait_time INTEGER,
  confidence_score DECIMAL(3,2), -- 0.0 to 1.0
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints Needed

```
GET /api/predict-wait-time?service_id=X&office_id=Y
POST /api/log-actual-wait-time  // for training data
GET /api/prediction-accuracy    // admin analytics
```

## Integration Points

1. **Citizen Interface:** Show predicted wait time when joining queue
2. **Token Display:** Update ETAs as position changes
3. **Admin Dashboard:** Show prediction accuracy metrics
4. **Staff Panel:** Use predictions for queue management

## Success Metrics

- Prediction accuracy > 80%
- User satisfaction with wait time estimates
- Reduced no-show rates due to accurate information
- Better resource planning for admins

Ready to start implementing this AI feature?</content>
<parameter name="filePath">c:\Users\Keert\my-warm-nook\AI-WAIT-TIME-PREDICTION.md