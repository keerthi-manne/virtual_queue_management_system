"""
Virtual Queue Management System - ML Service
Provides AI/ML predictions for wait times, no-show probability, and demand forecasting

This service is scaffolded for production but uses dummy predictions initially.
Real model training should be implemented with historical data.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
from datetime import datetime, timedelta
import random

app = FastAPI(
    title="Queue Management ML Service",
    description="AI/ML predictions for virtual queue management",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class WaitTimePredictionRequest(BaseModel):
    service_id: str
    queue_position: int
    current_time: str
    priority: Optional[str] = "normal"

class WaitTimePredictionResponse(BaseModel):
    predicted_wait_time: int  # in minutes
    confidence: float
    model_used: str

class NoShowPredictionRequest(BaseModel):
    token_id: str
    service_id: str
    priority: str
    queue_position: int
    day_of_week: int
    hour_of_day: int

class NoShowPredictionResponse(BaseModel):
    no_show_probability: float
    confidence: float
    model_used: str

class DemandForecastRequest(BaseModel):
    service_id: str
    hours_ahead: int
    current_time: str

class DemandForecastResponse(BaseModel):
    forecast: List[Dict[str, Any]]
    confidence: str
    model_used: str

class FeedbackRequest(BaseModel):
    event_type: str
    data: Dict[str, Any]
    timestamp: str


@app.get("/")
def read_root():
    """Health check endpoint"""
    return {
        "status": "running",
        "service": "Queue Management ML Service",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/health")
def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "models": {
            "wait_time_arima": "loaded (dummy)",
            "no_show_rf": "loaded (dummy)",
            "demand_forecast": "loaded (dummy)"
        },
        "timestamp": datetime.now().isoformat()
    }


@app.post("/predict/wait-time", response_model=WaitTimePredictionResponse)
async def predict_wait_time(request: WaitTimePredictionRequest):
    """
    Predict wait time for a token in queue
    
    CURRENT IMPLEMENTATION: Dummy prediction
    TODO: Replace with real ARIMA model trained on historical data
    
    Real implementation should:
    1. Load trained ARIMA model
    2. Consider historical queue patterns
    3. Account for time of day, day of week
    4. Factor in current queue length and service rate
    5. Adjust for priority levels
    """
    try:
        # DUMMY PREDICTION LOGIC
        # Replace this with real model inference
        base_wait_time = request.queue_position * 10  # 10 minutes per position
        
        # Priority adjustment
        priority_multiplier = {
            "emergency": 0.2,
            "disabled": 0.5,
            "senior": 0.7,
            "normal": 1.0
        }
        multiplier = priority_multiplier.get(request.priority, 1.0)
        
        # Add some randomness to simulate real variation
        variation = random.uniform(0.8, 1.2)
        predicted_wait = int(base_wait_time * multiplier * variation)
        
        # Ensure minimum wait time
        predicted_wait = max(5, predicted_wait)
        
        return WaitTimePredictionResponse(
            predicted_wait_time=predicted_wait,
            confidence=0.75,  # Dummy confidence
            model_used="dummy_linear_model"
        )
        
        # REAL IMPLEMENTATION TEMPLATE:
        # from models.wait_time_arima import ARIMAWaitTimeModel
        # model = ARIMAWaitTimeModel.load()
        # prediction = model.predict(
        #     service_id=request.service_id,
        #     queue_position=request.queue_position,
        #     timestamp=request.current_time,
        #     priority=request.priority
        # )
        # return prediction
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/no-show", response_model=NoShowPredictionResponse)
async def predict_no_show(request: NoShowPredictionRequest):
    """
    Predict no-show probability for a token
    
    CURRENT IMPLEMENTATION: Dummy prediction
    TODO: Replace with real Random Forest classifier
    
    Real implementation should:
    1. Load trained Random Forest model
    2. Extract features: time of day, day of week, queue position, priority
    3. Use historical no-show patterns
    4. Consider user history if available
    """
    try:
        # DUMMY PREDICTION LOGIC
        # Higher queue position = higher no-show probability
        base_probability = 0.05 + (request.queue_position * 0.01)
        
        # Hour of day adjustment (higher probability during lunch/evening)
        if 12 <= request.hour_of_day <= 14 or request.hour_of_day >= 17:
            base_probability *= 1.5
        
        # Priority adjustment (emergency/disabled less likely to no-show)
        if request.priority in ["emergency", "disabled"]:
            base_probability *= 0.5
        
        # Cap at reasonable range
        no_show_prob = min(0.5, max(0.01, base_probability))
        
        return NoShowPredictionResponse(
            no_show_probability=round(no_show_prob, 3),
            confidence=0.70,
            model_used="dummy_rule_based"
        )
        
        # REAL IMPLEMENTATION TEMPLATE:
        # from models.no_show_rf import RandomForestNoShowModel
        # model = RandomForestNoShowModel.load()
        # features = model.extract_features(request)
        # prediction = model.predict_proba(features)
        # return prediction
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/demand", response_model=DemandForecastResponse)
async def forecast_demand(request: DemandForecastRequest):
    """
    Forecast demand for next few hours
    
    CURRENT IMPLEMENTATION: Dummy forecast
    TODO: Replace with time-series forecasting (ARIMA/Prophet)
    
    Real implementation should:
    1. Load trained time-series model
    2. Consider historical patterns
    3. Account for day of week, holidays
    4. Generate confidence intervals
    """
    try:
        # DUMMY FORECAST LOGIC
        current_time = datetime.fromisoformat(request.current_time.replace('Z', '+00:00'))
        forecast_data = []
        
        # Simulate hourly demand forecast
        base_demand = random.randint(10, 30)
        
        for i in range(request.hours_ahead):
            forecast_time = current_time + timedelta(hours=i+1)
            hour = forecast_time.hour
            
            # Simulate peak hours (9-11 AM, 2-4 PM)
            if 9 <= hour <= 11 or 14 <= hour <= 16:
                demand = int(base_demand * random.uniform(1.3, 1.8))
            else:
                demand = int(base_demand * random.uniform(0.7, 1.2))
            
            forecast_data.append({
                "timestamp": forecast_time.isoformat(),
                "hour": hour,
                "predicted_tokens": demand,
                "lower_bound": int(demand * 0.8),
                "upper_bound": int(demand * 1.2)
            })
        
        return DemandForecastResponse(
            forecast=forecast_data,
            confidence="medium",
            model_used="dummy_pattern_based"
        )
        
        # REAL IMPLEMENTATION TEMPLATE:
        # from models.demand_forecast import DemandForecastModel
        # model = DemandForecastModel.load()
        # forecast = model.predict(
        #     service_id=request.service_id,
        #     hours_ahead=request.hours_ahead,
        #     current_time=request.current_time
        # )
        # return forecast
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/feedback")
async def receive_feedback(request: FeedbackRequest):
    """
    Receive feedback data for model improvement
    
    In production, this should:
    1. Store feedback in database
    2. Trigger periodic model retraining
    3. Track prediction accuracy
    """
    try:
        # TODO: Store feedback for model retraining
        # In production, save to database or data warehouse
        print(f"Feedback received: {request.event_type} at {request.timestamp}")
        
        return {
            "status": "received",
            "event_type": request.event_type,
            "timestamp": request.timestamp
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/models/info")
def get_models_info():
    """Get information about loaded models"""
    return {
        "models": [
            {
                "name": "wait_time_arima",
                "type": "ARIMA Time Series",
                "status": "dummy",
                "description": "Predicts wait time based on queue position and historical patterns",
                "features": ["queue_position", "service_id", "time_of_day", "priority"]
            },
            {
                "name": "no_show_rf",
                "type": "Random Forest Classifier",
                "status": "dummy",
                "description": "Predicts probability of no-show",
                "features": ["queue_position", "priority", "hour_of_day", "day_of_week"]
            },
            {
                "name": "demand_forecast",
                "type": "Time Series Forecasting",
                "status": "dummy",
                "description": "Forecasts demand for upcoming hours",
                "features": ["historical_demand", "time_of_day", "day_of_week"]
            }
        ],
        "note": "All models are currently using dummy predictions. Train with real data for production."
    }


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
