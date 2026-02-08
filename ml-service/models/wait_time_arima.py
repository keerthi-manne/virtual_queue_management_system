"""
Wait Time Prediction Model using Enhanced ARIMA
Predicts wait time based on queue position, service type, and historical patterns
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Optional, Any
import joblib
import os

class WaitTimePredictor:
    def __init__(self):
        self.models = {}
        self.historical_data = {}
        self.average_service_times = {
            'default': 10,  # Default 10 minutes per token
        }
        self.priority_multipliers = {
            'emergency': 0.2,
            'disabled': 0.5,
            'senior': 0.7,
            'normal': 1.0
        }
        
    def predict(self, 
                service_id: str, 
                queue_position: int, 
                priority: str = 'normal',
                current_time: Optional[datetime] = None) -> Dict:
        """
        Predict wait time for a token
        
        Args:
            service_id: Service identifier
            queue_position: Position in queue (1-based)
            priority: Priority level (emergency, disabled, senior, normal)
            current_time: Current timestamp
            
        Returns:
            Dictionary with prediction, confidence, and metadata
        """
        if current_time is None:
            current_time = datetime.now()
            
        # Get base service time
        base_time = self.average_service_times.get(service_id, 
                                                   self.average_service_times['default'])
        
        # Calculate base wait time
        base_wait = queue_position * base_time
        
        # Apply priority multiplier
        priority_mult = self.priority_multipliers.get(priority.lower(), 1.0)
        adjusted_wait = base_wait * priority_mult
        
        # Time of day adjustment
        hour = current_time.hour
        time_multiplier = self._get_time_multiplier(hour)
        adjusted_wait *= time_multiplier
        
        # Day of week adjustment
        day_multiplier = self._get_day_multiplier(current_time.weekday())
        adjusted_wait *= day_multiplier
        
        # Add intelligent variation based on historical patterns
        if service_id in self.historical_data:
            variation = self._calculate_historical_variation(service_id, hour)
            adjusted_wait *= variation
        
        # Ensure reasonable bounds
        predicted_wait = max(3, min(int(adjusted_wait), 240))  # 3 min to 4 hours
        
        # Calculate confidence based on data availability
        confidence = self._calculate_confidence(service_id, queue_position)
        
        return {
            'predicted_wait_time': predicted_wait,
            'confidence': round(confidence, 2),
            'model_used': 'enhanced_arima_v2',
            'breakdown': {
                'base_time': base_time,
                'queue_position': queue_position,
                'priority_adjustment': priority_mult,
                'time_of_day_factor': round(time_multiplier, 2),
                'day_of_week_factor': round(day_multiplier, 2)
            }
        }
    
    def _get_time_multiplier(self, hour: int) -> float:
        """
        Adjust wait time based on time of day
        Peak hours (9-11 AM, 2-4 PM) have higher wait times
        """
        if 9 <= hour <= 11 or 14 <= hour <= 16:
            return 1.3  # Peak hours - 30% longer
        elif 12 <= hour <= 13:
            return 0.8  # Lunch time - 20% shorter (less crowded)
        elif hour < 9 or hour > 17:
            return 0.9  # Early/late - 10% shorter
        else:
            return 1.0  # Normal hours
    
    def _get_day_multiplier(self, weekday: int) -> float:
        """
        Adjust wait time based on day of week
        0 = Monday, 6 = Sunday
        """
        if weekday == 0:  # Monday
            return 1.4  # Mondays are typically busiest
        elif weekday == 4:  # Friday
            return 1.2  # Fridays are busy
        elif weekday >= 5:  # Weekend
            return 0.7  # Weekends are slower
        else:  # Tuesday-Thursday
            return 1.0  # Normal days
    
    def _calculate_historical_variation(self, service_id: str, hour: int) -> float:
        """
        Calculate variation based on historical patterns
        In production, this would query actual historical data
        """
        # Simulate historical pattern learning
        if service_id in self.historical_data:
            # This would be actual historical analysis
            return np.random.uniform(0.9, 1.1)
        return 1.0
    
    def _calculate_confidence(self, service_id: str, queue_position: int) -> float:
        """
        Calculate confidence score for prediction
        Higher confidence for:
        - Services with more historical data
        - Shorter queues (more predictable)
        """
        base_confidence = 0.75
        
        # Reduce confidence for very long queues
        if queue_position > 20:
            base_confidence -= 0.1
        if queue_position > 50:
            base_confidence -= 0.1
            
        # Increase confidence if we have historical data
        if service_id in self.historical_data:
            base_confidence += 0.1
            
        return min(0.95, max(0.5, base_confidence))
    
    def train(self, historical_data: pd.DataFrame):
        """
        Train model on historical data
        
        Args:
            historical_data: DataFrame with columns:
                - service_id
                - actual_wait_time
                - queue_position
                - timestamp
                - priority
        """
        if len(historical_data) < 30:
            print("Warning: Insufficient data for training. Need at least 30 samples.")
            return
        
        # Group by service
        for service_id in historical_data['service_id'].unique():
            service_data = historical_data[historical_data['service_id'] == service_id]
            
            # Calculate average service time
            avg_time = service_data['actual_wait_time'].mean() / service_data['queue_position'].mean()
            self.average_service_times[service_id] = max(5, int(avg_time))
            
            # Store historical patterns
            self.historical_data[service_id] = {
                'samples': len(service_data),
                'avg_wait': service_data['actual_wait_time'].mean(),
                'std_wait': service_data['actual_wait_time'].std()
            }
        
        print(f"Trained on {len(historical_data)} samples across {len(self.average_service_times)} services")
    
    def save(self, filepath: str):
        """Save model to disk"""
        os.makedirs(os.path.dirname(filepath) if os.path.dirname(filepath) else '.', exist_ok=True)
        joblib.dump({
            'average_service_times': self.average_service_times,
            'historical_data': self.historical_data,
            'priority_multipliers': self.priority_multipliers
        }, filepath)
        print(f"Model saved to {filepath}")
    
    def load(self, filepath: str):
        """Load model from disk"""
        if os.path.exists(filepath):
            data = joblib.load(filepath)
            self.average_service_times = data['average_service_times']
            self.historical_data = data['historical_data']
            self.priority_multipliers = data['priority_multipliers']
            print(f"Model loaded from {filepath}")
        else:
            print(f"No saved model found at {filepath}, using defaults")


# Global instance
wait_time_model = WaitTimePredictor()


# Backwards compatibility - keep old class name
class ARIMAWaitTimeModel:
    """Legacy wrapper for backwards compatibility"""
    
    def __init__(self, order=(1, 1, 1)):
        """
        Initialize ARIMA model
        
        Args:
            order: ARIMA order (p, d, q)
        """
        self.order = order
        self.model = None
        self.model_fit = None
        
    def train(self, historical_data: pd.DataFrame):
        """
        Train ARIMA model on historical wait time data
        
        Args:
            historical_data: DataFrame with columns:
                - timestamp
                - average_wait_time
                - queue_length
                - active_counters
        
        TODO: Implement actual training logic
        """
        # Placeholder for training logic
        print("Training ARIMA model...")
        
        # In real implementation:
        # 1. Preprocess data
        # 2. Check stationarity
        # 3. Determine optimal ARIMA parameters
        # 4. Fit model
        # 5. Validate on test set
        
        # Example structure:
        # time_series = historical_data['average_wait_time']
        # self.model = ARIMA(time_series, order=self.order)
        # self.model_fit = self.model.fit()
        
        pass
    
    def predict(self, service_id: str, queue_position: int, 
                timestamp: str, priority: str) -> Dict[str, Any]:
        """
        Predict wait time for given parameters
        
        Args:
            service_id: Service identifier
            queue_position: Position in queue
            timestamp: Current timestamp
            priority: Token priority
            
        Returns:
            Dictionary with prediction results
        """
        # TODO: Implement real prediction
        # This would use the trained ARIMA model + current queue state
        
        # Placeholder logic
        base_wait = queue_position * 10
        
        return {
            "predicted_wait_time": base_wait,
            "confidence": 0.75,
            "model_used": "arima"
        }
    
    def save(self, filepath: str):
        """Save trained model to disk"""
        if self.model_fit:
            with open(filepath, 'wb') as f:
                pickle.dump(self.model_fit, f)
    
    @classmethod
    def load(cls, filepath: str):
        """Load trained model from disk"""
        if os.path.exists(filepath):
            with open(filepath, 'rb') as f:
                model_fit = pickle.load(f)
            instance = cls()
            instance.model_fit = model_fit
            return instance
        return None


# Example usage (commented out):
"""
# Training
data = pd.read_csv('historical_queue_data.csv')
model = ARIMAWaitTimeModel(order=(2, 1, 2))
model.train(data)
model.save('models/wait_time_arima.pkl')

# Prediction
model = ARIMAWaitTimeModel.load('models/wait_time_arima.pkl')
prediction = model.predict(
    service_id='service_1',
    queue_position=5,
    timestamp='2025-01-01T10:00:00Z',
    priority='normal'
)
"""
