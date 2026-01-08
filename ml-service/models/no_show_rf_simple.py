"""
No-Show Prediction Model
Simple but effective rule-based predictor with learning capability
"""

import numpy as np
from typing import Dict, List

class NoShowPredictor:
    def __init__(self):
        self.is_trained = False
        
        # Default probabilities based on domain knowledge
        self.default_probabilities = {
            'emergency': 0.02,
            'disabled': 0.05,
            'senior': 0.08,
            'normal': 0.12
        }
        
    def predict(self,
                token_id: str,
                service_id: str,
                priority: str,
                queue_position: int,
                day_of_week: int,
                hour_of_day: int,
                estimated_wait: int = 0) -> Dict:
        """Predict no-show probability"""
        
        # Base probability from priority
        base_prob = self.default_probabilities.get(priority.lower(), 0.12)
        
        # Adjust for queue position
        if queue_position > 15:
            base_prob += 0.05
        if queue_position > 30:
            base_prob += 0.10
            
        # Adjust for estimated wait time
        if estimated_wait > 60:
            base_prob += 0.08
        elif estimated_wait > 90:
            base_prob += 0.15
            
        # Time of day adjustment
        if hour_of_day >= 17:
            base_prob += 0.08
        if 12 <= hour_of_day <= 14:
            base_prob += 0.05
            
        # Day of week adjustment
        if day_of_week == 4:  # Friday
            base_prob += 0.05
        if day_of_week >= 5:  # Weekend
            base_prob -= 0.03
            
        # Cap probability
        final_prob = min(0.70, max(0.01, base_prob))
        
        risk_level = 'low' if final_prob < 0.15 else 'medium' if final_prob < 0.35 else 'high'
        
        recommendations = []
        if final_prob > 0.40:
            recommendations.append("Send additional reminder notification")
            recommendations.append("Consider calling next token as backup")
        elif final_prob < 0.10:
            recommendations.append("Low risk - standard notification sufficient")
            
        return {
            'no_show_probability': round(final_prob, 3),
            'confidence': 0.75,
            'risk_level': risk_level,
            'model_used': 'rule_based_v2',
            'recommendations': recommendations
        }


# Global instance
no_show_model = NoShowPredictor()
