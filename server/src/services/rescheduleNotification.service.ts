/**
 * Reschedule Notification Service
 * Handles SMS and Email notifications for token reschedule requests
 */

import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { supabaseAdmin } from '../config/supabase';

// Email transporter configuration
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// SMS configuration (Twilio)
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

interface User {
  id: string;
  email: string;
  phone?: string;
  name: string;
}

interface Token {
  id: string;
  token_label: string;
  service_id: string;
  position_in_queue?: number;
  estimated_wait_minutes?: number;
  services?: {
    name: string;
  };
}

/**
 * Send reschedule request notification (SMS + Email)
 */
export async function sendRescheduleRequest(
  user: User,
  token: Token,
  rescheduleRequestId: string,
  expiresAt: string
): Promise<void> {
  try {
    const serviceName = token.services?.name || 'Service';
    const frontendUrl = process.env.CLIENT_URL || 'http://localhost:8080';
    const rescheduleUrl = `${frontendUrl}/reschedule/${rescheduleRequestId}`;
    
    // Format expiry time
    const expiryDate = new Date(expiresAt);
    const expiryTime = expiryDate.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    // Send Email
    const emailSent = await sendRescheduleEmail(
      user,
      token,
      serviceName,
      rescheduleUrl,
      expiryTime
    );

    // Send SMS
    const smsSent = await sendRescheduleSMS(
      user,
      token,
      serviceName,
      rescheduleUrl,
      expiryTime
    );

    // Update reschedule request with notification status
    await supabaseAdmin
      .from('reschedule_requests')
      .update({
        notification_sent: emailSent || smsSent,
        email_sent: emailSent,
        sms_sent: smsSent,
        updated_at: new Date().toISOString()
      })
      .eq('id', rescheduleRequestId);

    console.log(`✅ Reschedule notifications sent for token ${token.token_label}`);
  } catch (error) {
    console.error('Error sending reschedule request:', error);
    throw error;
  }
}

/**
 * Send reschedule confirmation notification
 */
export async function sendRescheduleConfirmation(
  user: User,
  newToken: Token,
  service: { name: string }
): Promise<void> {
  try {
    // Send Email
    await sendConfirmationEmail(user, newToken, service.name);

    // Send SMS
    await sendConfirmationSMS(user, newToken, service.name);

    console.log(`✅ Confirmation sent for new token ${newToken.token_label}`);
  } catch (error) {
    console.error('Error sending confirmation:', error);
  }
}

/**
 * Send reschedule request email
 */
async function sendRescheduleEmail(
  user: User,
  token: Token,
  serviceName: string,
  rescheduleUrl: string,
  expiryTime: string
): Promise<boolean> {
  try {
    if (!process.env.SMTP_USER) {
      console.warn('SMTP not configured, skipping email');
      return false;
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .token-box { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 5px; }
    .button { display: inline-block; padding: 15px 30px; margin: 10px 5px; text-decoration: none; border-radius: 5px; font-weight: bold; text-align: center; }
    .button-primary { background: #10b981; color: white; }
    .button-secondary { background: #ef4444; color: white; }
    .button:hover { opacity: 0.9; }
    .info { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Token No-Show Detected</h1>
      <p>We noticed you missed your appointment</p>
    </div>
    <div class="content">
      <p>Hi <strong>${user.name}</strong>,</p>
      
      <p>We called your token but you didn't arrive at the counter. We understand things come up!</p>
      
      <div class="token-box">
        <h3 style="margin-top: 0; color: #667eea;">Original Token Details</h3>
        <p><strong>Token Number:</strong> ${token.token_label}</p>
        <p><strong>Service:</strong> ${serviceName}</p>
        <p><strong>Status:</strong> No Show</p>
        <p><strong>Original Position:</strong> ${token.position_in_queue || 'N/A'}</p>
        <p><strong>Original Estimated Wait:</strong> ${token.estimated_wait_minutes ? `${token.estimated_wait_minutes} minutes` : 'N/A'}</p>
      </div>

      <div class="info">
        <strong>⚠️ Would you like to reschedule?</strong>
        <p style="margin: 10px 0 0 0;">You can get a new token and rejoin the queue at the current position. This offer expires on <strong>${expiryTime}</strong></p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${rescheduleUrl}?action=accept" class="button button-primary">
          ✓ YES, Reschedule My Token
        </a>
        <a href="${rescheduleUrl}?action=decline" class="button button-secondary">
          ✗ No Thanks
        </a>
      </div>

      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Or copy this link: <a href="${rescheduleUrl}">${rescheduleUrl}</a>
      </p>

      <div class="footer">
        <p>This is an automated message from Virtual Queue Management System</p>
        <p>Please do not reply to this email</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const emailText = `
Hi ${user.name},

TOKEN NO-SHOW DETECTED

We called your token but you didn't arrive at the counter. We understand things come up!

Original Token Details:
- Token Number: ${token.token_label}
- Service: ${serviceName}
- Status: No Show

WOULD YOU LIKE TO RESCHEDULE?
You can get a new token and rejoin the queue.
This offer expires on: ${expiryTime}

To reschedule, visit: ${rescheduleUrl}

---
Virtual Queue Management System
    `;

    await emailTransporter.sendMail({
      from: `"Queue Management" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: `⏰ Reschedule Your Token ${token.token_label}?`,
      text: emailText,
      html: emailHtml,
    });

    console.log(`📧 Reschedule email sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error('Failed to send reschedule email:', error);
    return false;
  }
}

/**
 * Send reschedule request SMS
 */
async function sendRescheduleSMS(
  user: User,
  token: Token,
  serviceName: string,
  rescheduleUrl: string,
  expiryTime: string
): Promise<boolean> {
  try {
    if (!twilioClient || !user.phone) {
      console.warn('Twilio not configured or no phone number, skipping SMS');
      return false;
    }

    const smsMessage = `
🔔 Token No-Show Alert

Hi ${user.name}, we called token ${token.token_label} for ${serviceName} but you didn't show up.

Would you like to RESCHEDULE and get a new token?

Reply or visit: ${rescheduleUrl}

Expires: ${expiryTime}

- Queue Management System
    `.trim();

    await twilioClient.messages.create({
      body: smsMessage,
      to: user.phone,
      from: process.env.TWILIO_PHONE_NUMBER,
    });

    console.log(`📱 Reschedule SMS sent to ${user.phone}`);
    return true;
  } catch (error) {
    console.error('Failed to send reschedule SMS:', error);
    return false;
  }
}

/**
 * Send reschedule confirmation email
 */
async function sendConfirmationEmail(
  user: User,
  newToken: Token,
  serviceName: string
): Promise<void> {
  try {
    if (!process.env.SMTP_USER) {
      return;
    }

    const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const statusUrl = `${frontendUrl}/check-status?token=${newToken.token_label}`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .token-box { background: white; padding: 25px; text-align: center; margin: 20px 0; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .token-number { font-size: 48px; font-weight: bold; color: #667eea; margin: 10px 0; }
    .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; }
    .success-icon { font-size: 64px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="success-icon">✅</div>
      <h1>Reschedule Confirmed!</h1>
      <p>Your new token is ready</p>
    </div>
    <div class="content">
      <p>Hi <strong>${user.name}</strong>,</p>
      
      <p>Great news! Your reschedule request has been approved. Here's your new token:</p>
      
      <div class="token-box">
        <p style="margin: 0; color: #666;">Your New Token Number</p>
        <div class="token-number">${newToken.token_label}</div>
        <p style="margin: 10px 0 5px 0; color: #666;">Service: <strong>${serviceName}</strong></p>
        ${newToken.position_in_queue ? `<p style="margin: 5px 0; color: #666;">Position in Queue: <strong>${newToken.position_in_queue}</strong></p>` : ''}
        ${newToken.estimated_wait_minutes ? `<p style="margin: 5px 0; color: #666;">Estimated Wait Time: <strong>${newToken.estimated_wait_minutes} minutes</strong></p>` : ''}
      </div>

      <p>You've been added back to the queue. Please arrive at the facility and wait for your token to be called.</p>

      <div style="text-align: center;">
        <a href="${statusUrl}" class="button">Check Queue Status</a>
      </div>

      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Thank you for using our queue management system. We look forward to serving you!
      </p>
    </div>
  </div>
</body>
</html>
    `;

    await emailTransporter.sendMail({
      from: `"Queue Management" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: `✅ Reschedule Confirmed - New Token ${newToken.token_label}`,
      html: emailHtml,
    });

    console.log(`📧 Confirmation email sent to ${user.email}`);
  } catch (error) {
    console.error('Failed to send confirmation email:', error);
  }
}

/**
 * Send reschedule confirmation SMS
 */
async function sendConfirmationSMS(
  user: User,
  newToken: Token,
  serviceName: string
): Promise<void> {
  try {
    if (!twilioClient || !user.phone) {
      return;
    }

    const smsMessage = `
✅ RESCHEDULE CONFIRMED!

Hi ${user.name}, your new token is ready:

Token: ${newToken.token_label}
Service: ${serviceName}

You've been added back to the queue. Please come to the facility.

- Queue Management System
    `.trim();

    await twilioClient.messages.create({
      body: smsMessage,
      to: user.phone,
      from: process.env.TWILIO_PHONE_NUMBER,
    });

    console.log(`📱 Confirmation SMS sent to ${user.phone}`);
  } catch (error) {
    console.error('Failed to send confirmation SMS:', error);
  }
}

export default {
  sendRescheduleRequest,
  sendRescheduleConfirmation,
};
