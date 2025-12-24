# ML Service for Virtual Queue Management System

This directory contains the Machine Learning service for predictive analytics in the queue management system.

## 🎯 Purpose

Provides AI/ML predictions for:
1. **Wait Time Prediction** - ARIMA-based time series forecasting
2. **No-Show Prediction** - Random Forest classification
3. **Demand Forecasting** - Future demand prediction

## 📦 Setup

### Prerequisites
- Python 3.9+
- pip

### Installation

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## 🚀 Running the Service

```bash
# Development mode with auto-reload
python app.py

# Or using uvicorn directly
uvicorn app:app --reload --port 8000
```

The service will be available at `http://localhost:8000`

## 📡 API Endpoints

### Health Check
```bash
GET /health
```

### Predict Wait Time
```bash
POST /predict/wait-time
Content-Type: application/json

{
  "service_id": "service_uuid",
  "queue_position": 5,
  "current_time": "2025-01-01T10:00:00Z",
  "priority": "normal"
}
```

### Predict No-Show Probability
```bash
POST /predict/no-show
Content-Type: application/json

{
  "token_id": "token_uuid",
  "service_id": "service_uuid",
  "priority": "normal",
  "queue_position": 10,
  "day_of_week": 3,
  "hour_of_day": 14
}
```

### Forecast Demand
```bash
POST /predict/demand
Content-Type: application/json

{
  "service_id": "service_uuid",
  "hours_ahead": 4,
  "current_time": "2025-01-01T10:00:00Z"
}
```

### Send Feedback
```bash
POST /feedback
Content-Type: application/json

{
  "event_type": "token_completed",
  "data": {
    "token_id": "uuid",
    "actual_wait_time": 15,
    "predicted_wait_time": 12
  },
  "timestamp": "2025-01-01T10:30:00Z"
}
```

## 🧠 Models

### 1. Wait Time Prediction (ARIMA)
- **File**: `models/wait_time_arima.py`
- **Algorithm**: ARIMA (AutoRegressive Integrated Moving Average)
- **Input Features**: 
  - Queue position
  - Service ID
  - Time of day
  - Priority level
- **Output**: Predicted wait time in minutes

### 2. No-Show Prediction (Random Forest)
- **File**: `models/no_show_rf.py`
- **Algorithm**: Random Forest Classifier
- **Input Features**:
  - Queue position
  - Priority (one-hot encoded)
  - Hour of day
  - Day of week
  - Service type
- **Output**: No-show probability (0-1)

### 3. Demand Forecasting
- **File**: `models/demand_forecast.py`
- **Algorithm**: Time-series forecasting (ARIMA/Prophet)
- **Input Features**:
  - Historical demand patterns
  - Time of day
  - Day of week
- **Output**: Hourly demand forecast with confidence intervals

## ⚠️ Current Status

**IMPORTANT**: All models are currently using **dummy predictions** for demonstration purposes.

The structure is production-ready, but real model training needs to be implemented with historical data.

### To Deploy Real Models:

1. **Collect Training Data**
   ```python
   # Export historical data from Supabase
   # Structure: tokens, queue_events, services
   ```

2. **Train Models**
   ```python
   from models.wait_time_arima import ARIMAWaitTimeModel
   from models.no_show_rf import RandomForestNoShowModel
   
   # Load historical data
   data = pd.read_csv('historical_data.csv')
   
   # Train wait time model
   wait_model = ARIMAWaitTimeModel(order=(2, 1, 2))
   wait_model.train(data)
   wait_model.save('trained_models/wait_time.pkl')
   
   # Train no-show model
   noshow_model = RandomForestNoShowModel(n_estimators=200)
   noshow_model.train(data)
   noshow_model.save('trained_models/no_show.pkl')
   ```

3. **Replace Dummy Logic**
   - Update `app.py` to load real trained models
   - Remove dummy prediction logic
   - Use model inference instead

## 📊 Model Training Guidelines

### Wait Time Model (ARIMA)
```python
# Required data columns:
# - timestamp, average_wait_time, queue_length, active_counters

# Steps:
# 1. Check stationarity (ADF test)
# 2. Determine optimal (p,d,q) parameters using ACF/PACF
# 3. Train ARIMA model
# 4. Validate on test set (MAE, RMSE)
```

### No-Show Model (Random Forest)
```python
# Required data columns:
# - queue_position, priority, hour_of_day, day_of_week, is_no_show

# Steps:
# 1. Handle class imbalance (SMOTE if needed)
# 2. Feature engineering
# 3. Train Random Forest
# 4. Evaluate (Precision, Recall, AUC-ROC)
# 5. Feature importance analysis
```

## 🔧 Environment Variables

Create `.env` file:
```env
ML_SERVICE_PORT=8000
MODEL_PATH=./trained_models
LOG_LEVEL=INFO
```

## 📈 Performance Metrics

Target metrics for real models:
- **Wait Time Prediction**: MAE < 5 minutes, RMSE < 10 minutes
- **No-Show Prediction**: AUC-ROC > 0.75, Precision > 0.70
- **Demand Forecast**: MAPE < 20%

## 🔄 Model Retraining

Implement periodic retraining:
1. Collect feedback data via `/feedback` endpoint
2. Aggregate weekly/monthly
3. Retrain models
4. A/B test new models
5. Deploy if performance improves

## 🐛 Debugging

Enable debug mode:
```bash
export LOG_LEVEL=DEBUG
python app.py
```

Check logs for model predictions and errors.

## 📚 References

- ARIMA: [statsmodels documentation](https://www.statsmodels.org/)
- Random Forest: [scikit-learn documentation](https://scikit-learn.org/)
- FastAPI: [FastAPI documentation](https://fastapi.tiangolo.com/)

## 🤝 Integration with Backend

Backend calls ML service via HTTP:
```typescript
// Backend service (Node.js)
const response = await axios.post('http://localhost:8000/predict/wait-time', {
  service_id: serviceId,
  queue_position: position,
  current_time: new Date().toISOString(),
  priority: 'normal'
});

const estimatedWait = response.data.predicted_wait_time;
```

## 📝 Notes

- All predictions are currently dummy values
- Models need historical data for training
- Implement proper error handling for production
- Consider adding authentication for production deployment
- Monitor model drift and retrain periodically
