/**
 * ML Service Integration
 * Communicates with Python ML service for predictions
 */

import axios from 'axios';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Predict wait time for a token at given queue position
 * Falls back to simple calculation if ML service unavailable
 */
export async function predictWaitTime(
  serviceId: string, 
  queuePosition: number
): Promise<number> {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/predict/wait-time`, {
      service_id: serviceId,
      queue_position: queuePosition,
      current_time: new Date().toISOString()
    }, {
      timeout: 2000 // 2 second timeout
    });

    return response.data.predicted_wait_time;
  } catch (error) {
    console.warn('ML service unavailable, using fallback calculation');
    // Fallback: simple linear estimation (10 minutes per position)
    return queuePosition * 10;
  }
}

/**
 * Predict no-show probability for a token
 */
export async function predictNoShowProbability(
  tokenId: string,
  historicalData: any
): Promise<number> {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/predict/no-show`, {
      token_id: tokenId,
      ...historicalData
    }, {
      timeout: 2000
    });

    return response.data.no_show_probability;
  } catch (error) {
    console.warn('ML service unavailable for no-show prediction');
    return 0.1; // Default 10% no-show rate
  }
}

/**
 * Get demand forecast for next few hours
 */
export async function getDemandForecast(
  serviceId: string,
  hoursAhead: number = 4
): Promise<any> {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/predict/demand`, {
      service_id: serviceId,
      hours_ahead: hoursAhead,
      current_time: new Date().toISOString()
    }, {
      timeout: 3000
    });

    return response.data.forecast;
  } catch (error) {
    console.warn('ML service unavailable for demand forecast');
    return {
      forecast: [],
      confidence: 'low'
    };
  }
}

/**
 * Send feedback data to ML service for model improvement
 */
export async function sendFeedbackToML(
  eventType: string,
  data: any
): Promise<void> {
  try {
    await axios.post(`${ML_SERVICE_URL}/feedback`, {
      event_type: eventType,
      data,
      timestamp: new Date().toISOString()
    }, {
      timeout: 1000
    });
  } catch (error) {
    // Silent fail - feedback is optional
    console.debug('Could not send feedback to ML service');
  }
}
