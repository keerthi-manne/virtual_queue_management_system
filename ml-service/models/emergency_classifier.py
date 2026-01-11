# AI Emergency Classification Model
# Classifies emergency claims as genuine, suspicious, or false

from typing import Dict, Any
import re
from datetime import datetime

class EmergencyClassifier:
    """
    Simple rule-based emergency classifier with confidence scoring
    In production, replace with trained ML model
    """
    
    def __init__(self):
        # Keywords indicating genuine emergencies
        self.genuine_keywords = {
            'medical': ['heart', 'stroke', 'bleeding', 'unconscious', 'accident', 'injury', 'pain', 'ambulance', 'hospital', 'surgery', 'critical', 'urgent', 'emergency', 'fever', 'breathing', 'chest pain'],
            'legal': ['court', 'hearing', 'deadline', 'arrest', 'bail', 'warrant', 'summons', 'legal notice'],
            'travel': ['flight', 'train', 'departure', 'leave', 'travel', 'visa', 'passport'],
            'death': ['death', 'funeral', 'deceased', 'passed away', 'cremation', 'burial'],
            'pregnancy': ['pregnant', 'delivery', 'labor', 'maternity', 'childbirth'],
        }
        
        # Suspicious patterns
        self.suspicious_patterns = [
            r'urgent.*today',
            r'very.*urgent',
            r'please.*fast',
            r'need.*now',
            r'important.*work',
        ]
        
        # False claim indicators
        self.false_indicators = [
            'just need', 'want to', 'prefer', 'would like', 'hoping for', 
            'quick', 'fast', 'soon', 'today only', 'busy schedule'
        ]
    
    def classify(self, reason: str, emergency_type: str = None) -> Dict[str, Any]:
        """
        Classify emergency claim
        
        Returns:
            {
                'classification': 'genuine' | 'suspicious' | 'false',
                'confidence': 0.0-1.0,
                'reasoning': str,
                'requires_admin_review': bool,
                'suggested_priority': str
            }
        """
        if not reason or len(reason.strip()) < 10:
            return {
                'classification': 'false',
                'confidence': 0.95,
                'reasoning': 'Emergency reason too short or missing. Genuine emergencies require detailed explanation.',
                'requires_admin_review': False,
                'suggested_priority': 'NORMAL'
            }
        
        reason_lower = reason.lower()
        
        # Check for genuine emergency keywords
        genuine_score = 0
        matched_categories = []
        
        for category, keywords in self.genuine_keywords.items():
            matches = sum(1 for keyword in keywords if keyword in reason_lower)
            if matches > 0:
                genuine_score += matches * 0.2
                matched_categories.append(category)
        
        # Check for false indicators
        false_score = sum(0.15 for indicator in self.false_indicators if indicator in reason_lower)
        
        # Check for suspicious patterns
        suspicious_score = sum(0.1 for pattern in self.suspicious_patterns if re.search(pattern, reason_lower))
        
        # Length and detail check
        word_count = len(reason.split())
        if word_count < 15:
            false_score += 0.2
        elif word_count > 30:
            genuine_score += 0.1
        
        # Calculate final scores
        genuine_confidence = min(genuine_score, 1.0)
        false_confidence = min(false_score, 1.0)
        suspicious_confidence = min(suspicious_score, 1.0)
        
        # Determine classification
        if genuine_confidence > 0.6 and false_confidence < 0.3:
            classification = 'genuine'
            confidence = genuine_confidence
            requires_review = genuine_confidence < 0.8  # High confidence genuine cases can auto-approve
            priority = 'EMERGENCY'
            reasoning = f"Strong indicators of genuine emergency: {', '.join(matched_categories)}. "
            
            if requires_review:
                reasoning += "Requires admin verification for final approval."
            else:
                reasoning += "Automatically approved based on clear emergency indicators."
                
        elif false_confidence > 0.5 or genuine_confidence < 0.2:
            classification = 'false'
            confidence = false_confidence
            requires_review = False
            priority = 'NORMAL'
            reasoning = "No genuine emergency indicators found. Claim appears to be convenience-based rather than urgent necessity."
            
        else:
            classification = 'suspicious'
            confidence = 0.5 + suspicious_confidence
            requires_review = True
            priority = 'NORMAL'  # Keep normal until verified
            reasoning = "Mixed indicators detected. Manual admin review required to verify authenticity of emergency claim."
        
        return {
            'classification': classification,
            'confidence': round(confidence, 2),
            'reasoning': reasoning,
            'requires_admin_review': requires_review,
            'suggested_priority': priority,
            'matched_categories': matched_categories if classification == 'genuine' else [],
            'timestamp': datetime.now().isoformat()
        }
    
    def verify_senior_citizen(self, date_of_birth: str, claimed_age: int = None) -> Dict[str, Any]:
        """
        Verify senior citizen status from date of birth
        """
        try:
            dob = datetime.fromisoformat(date_of_birth.replace('Z', '+00:00'))
            age = (datetime.now() - dob).days // 365
            
            is_senior = age >= 60
            confidence = 1.0 if abs(age - (claimed_age or age)) <= 1 else 0.7
            
            return {
                'is_senior': is_senior,
                'actual_age': age,
                'confidence': confidence,
                'requires_document': not is_senior or confidence < 0.9,
                'reasoning': f"Calculated age: {age} years. Senior citizen status: {'Verified' if is_senior else 'Not qualified'}"
            }
        except Exception as e:
            return {
                'is_senior': False,
                'actual_age': None,
                'confidence': 0.0,
                'requires_document': True,
                'reasoning': f"Unable to verify age: {str(e)}"
            }
    
    def validate_aadhaar_format(self, aadhaar_number: str) -> bool:
        """
        Validate Aadhaar number format (12 digits)
        """
        return bool(re.match(r'^\d{12}$', aadhaar_number))
    
    def extract_age_from_text(self, text: str) -> int | None:
        """
        Extract age mentions from text
        """
        patterns = [
            r'(\d+)\s*years?\s*old',
            r'age\s*[:\-]?\s*(\d+)',
            r'(\d+)\s*yrs?'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text.lower())
            if match:
                age = int(match.group(1))
                if 0 < age < 120:  # Sanity check
                    return age
        return None

# Singleton instance
emergency_classifier = EmergencyClassifier()
