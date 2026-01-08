"""
Demand Forecasting Model
Time-series based demand prediction
"""

import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List

class DemandForecaster:
    def __init__(self):
        self.is_trained = False
        
    def forecast(self,
                 service_id: str,
                 hours_ahead: int,
                 current_time: datetime) -> Dict:
        """Forecast demand for next N hours"""
        
        forecast_data = []
        insights = []
        
        for hour_offset in range(1, hours_ahead + 1):
            forecast_time = current_time + timedelta(hours=hour_offset)
            hour = forecast_time.hour
            weekday = forecast_time.weekday()
            
            predicted_demand = self._predict_hour(service_id, hour, weekday)
            demand_level = 'low' if predicted_demand < 20 else 'moderate' if predicted_demand < 35 else 'high'
            recommended_counters = max(1, int(np.ceil(predicted_demand / 15)))
            
            forecast_data.append({
                'timestamp': forecast_time.isoformat(),
                'hour': hour,
                'weekday': weekday,
                'predicted_tokens': predicted_demand,
                'lower_bound': int(predicted_demand * 0.75),
                'upper_bound': int(predicted_demand * 1.25),
                'demand_level': demand_level,
                'recommended_counters': recommended_counters
            })
        
        # Generate insights
        peak_hour_data = max(forecast_data, key=lambda x: x['predicted_tokens'])
        peak_time = datetime.fromisoformat(peak_hour_data['timestamp'])
        
        insights.append(f"Peak demand at {peak_time.strftime('%I:%M %p')} with ~{peak_hour_data['predicted_tokens']} customers")
        insights.append(f"Recommend opening {peak_hour_data['recommended_counters']} counters during peak")
        
        return {
            'forecast': forecast_data,
            'insights': insights,
            'confidence': 'medium',
            'model_used': 'time_series_v2',
            'summary': {
                'total_predicted_tokens': sum(f['predicted_tokens'] for f in forecast_data),
                'peak_demand': peak_hour_data['predicted_tokens'],
                'recommended_total_staff': peak_hour_data['recommended_counters']
            }
        }
    
    def _predict_hour(self, service_id: str, hour: int, weekday: int) -> int:
        """Predict demand for specific hour"""
        
        # Base demand by hour
        hourly_pattern = {
            8: 15, 9: 35, 10: 45, 11: 40, 12: 25,
            13: 20, 14: 38, 15: 42, 16: 35, 17: 20,
            18: 10, 19: 5, 20: 3
        }
        
        base_demand = hourly_pattern.get(hour, 10)
        
        # Day of week multiplier
        day_multipliers = {
            0: 1.4,  # Monday
            1: 1.1,  # Tuesday
            2: 1.0,  # Wednesday
            3: 1.0,  # Thursday
            4: 1.2,  # Friday
            5: 0.6,  # Saturday
            6: 0.4   # Sunday
        }
        
        multiplier = day_multipliers.get(weekday, 1.0)
        predicted_demand = int(base_demand * multiplier)
        
        return max(1, predicted_demand)


# Global instance
demand_forecaster = DemandForecaster()
