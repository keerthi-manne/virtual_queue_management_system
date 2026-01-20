import express from 'express';
import { SmsMenuService } from '../services/smsMenu';
import twilio from 'twilio';

const router = express.Router();

/**
 * Twilio webhook endpoint for incoming SMS
 * POST /api/sms/webhook
 */
router.post('/webhook', async (req, res) => {
  try {
    const { From, Body } = req.body;

    console.log(`📱 SMS from ${From}: ${Body}`);

    if (!From || !Body) {
      return res.status(400).send('Missing From or Body');
    }

    // Process the message and get response
    const response = await SmsMenuService.processMessage(From, Body);

    // Create TwiML response
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(response);

    res.type('text/xml');
    res.send(twiml.toString());

    console.log(`✅ SMS response sent to ${From}`);
  } catch (error: any) {
    console.error('❌ SMS webhook error:', error);
    
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('Sorry, an error occurred. Please try again or contact support.');
    
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

/**
 * Test endpoint to simulate SMS (for development)
 * POST /api/sms/test
 */
router.post('/test', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'phoneNumber and message required' });
    }

    const response = await SmsMenuService.processMessage(phoneNumber, message);

    res.json({ 
      success: true,
      request: { phoneNumber, message },
      response 
    });
  } catch (error: any) {
    console.error('SMS test error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Send SMS notification (for existing notification system integration)
 * POST /api/sms/send
 */
router.post('/send', async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: 'to and message required' });
    }

    // Check if Twilio is configured
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.warn('⚠️  Twilio not configured, SMS not sent');
      return res.json({ success: false, error: 'Twilio not configured' });
    }

    const client = twilio(accountSid, authToken);

    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: to,
    });

    console.log(`✅ SMS sent to ${to}, SID: ${result.sid}`);

    res.json({ success: true, sid: result.sid });
  } catch (error: any) {
    console.error('❌ SMS send error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
