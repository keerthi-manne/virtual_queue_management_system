import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { supabaseAdmin } from '../config/supabase';

// Use the shared supabase client
const supabase = supabaseAdmin;

// Email transporter configuration
const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '587');
const smtpSecure = (process.env.SMTP_SECURE || '').toLowerCase() === 'true' || smtpPort === 465;

const emailTransporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Verify SMTP configuration on startup for clearer diagnostics
emailTransporter.verify((err: Error | null) => {
  if (err) {
    console.error('✗ SMTP verify failed:', err.message);
  } else {
    console.log(`✓ SMTP connected (${smtpHost}:${smtpPort}, secure=${smtpSecure})`);
  }
});

// SMS configuration (Twilio)
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

interface NotificationData {
  userId: string;
  tokenId?: string;
  type: 'email' | 'sms' | 'whatsapp' | 'push';
  template: string;
  subject?: string;
  message: string;
  data?: Record<string, any>;
  priority?: number;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

class NotificationService {
  // Queue notification for sending
  async queueNotification(data: NotificationData): Promise<void> {
    try {
      // Get user details
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('email, phone, name')
        .eq('id', data.userId)
        .single();

      if (userError || !user) {
        console.error('User not found for notification:', data.userId);
        return;
      }

      // Check notification preferences
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', data.userId)
        .single();

      // Check if channel is enabled
      const channelEnabled = this.isChannelEnabled(data.type, prefs);
      if (!channelEnabled) {
        console.log(`${data.type} notifications disabled for user ${data.userId}`);
        return;
      }

      // Check for existing pending notification to avoid duplicates
      const { data: existing } = await supabase
        .from('notification_queue')
        .select('id')
        .eq('user_id', data.userId)
        .eq('token_id', data.tokenId)
        .eq('type', data.type)
        .eq('template', data.template)
        .eq('status', 'PENDING')
        .maybeSingle();

      if (existing) {
        console.log(`Skipping duplicate ${data.type} notification for user ${data.userId}`);
        return;
      }

      // Insert into notification queue
      const { error: queueError } = await supabase
        .from('notification_queue')
        .insert({
          user_id: data.userId,
          token_id: data.tokenId,
          type: data.type,
          template: data.template,
          recipient_email: user.email,
          recipient_phone: user.phone,
          subject: data.subject,
          message: data.message,
          data: data.data,
          priority: data.priority || 5,
          status: 'PENDING',
        });

      if (queueError) {
        console.error('Failed to queue notification:', queueError);
      } else {
        console.log(`Queued ${data.type} notification for user ${data.userId}`);
      }
    } catch (error) {
      console.error('Error queueing notification:', error);
    }
  }

  // Process pending notifications
  async processPendingNotifications(): Promise<void> {
    try {
      // Get pending notifications ordered by priority and scheduled time
      const { data: notifications, error } = await supabase
        .from('notification_queue')
        .select('*')
        .eq('status', 'PENDING')
        .lte('scheduled_for', new Date().toISOString())
        .order('priority', { ascending: true })
        .order('scheduled_for', { ascending: true })
        .limit(50);

      if (error || !notifications || notifications.length === 0) {
        return;
      }

      console.log(`Processing ${notifications.length} pending notifications...`);

      for (const notification of notifications) {
        await this.sendNotification(notification);
      }
    } catch (error) {
      console.error('Error processing notifications:', error);
    }
  }

  // Send individual notification
  private async sendNotification(notification: any): Promise<void> {
    try {
      let success = false;

      switch (notification.type) {
        case 'email':
          success = await this.sendEmail(notification);
          break;
        case 'sms':
          success = await this.sendSMS(notification);
          break;
        case 'whatsapp':
          success = await this.sendWhatsApp(notification);
          break;
        default:
          console.log(`Unsupported notification type: ${notification.type}`);
      }

      // Update notification status
      await supabase
        .from('notification_queue')
        .update({
          status: success ? 'SENT' : 'FAILED',
          attempts: notification.attempts + 1,
          last_attempt_at: new Date().toISOString(),
          sent_at: success ? new Date().toISOString() : null,
        })
        .eq('id', notification.id);

    } catch (error) {
      console.error('Error sending notification:', error);
      
      // Update with error
      await supabase
        .from('notification_queue')
        .update({
          status: notification.attempts >= 2 ? 'FAILED' : 'RETRY',
          attempts: notification.attempts + 1,
          last_attempt_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', notification.id);
    }
  }

  // Send email
  private async sendEmail(notification: any): Promise<boolean> {
    try {
      if (!notification.recipient_email) {
        console.log('No email address provided');
        return false;
      }

      const mailOptions = {
        from: `${process.env.SMTP_FROM_NAME || 'QueueFlow'} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: notification.recipient_email,
        subject: notification.subject,
        text: notification.message,
        html: this.generateEmailHTML(notification),
      };

      await emailTransporter.sendMail(mailOptions);
      console.log(`Email sent to ${notification.recipient_email}`);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  // Send SMS (using Twilio)
  private async sendSMS(notification: any): Promise<boolean> {
    try {
      if (!notification.recipient_phone) {
        console.log('No phone number provided');
        return false;
      }

      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        console.log('Twilio not configured, skipping SMS');
        return false;
      }

      // Format phone number to E.164 format (+919353900190)
      let phoneNumber = notification.recipient_phone.replace(/\s+/g, '');
      if (!phoneNumber.startsWith('+')) {
        // Assume Indian number if no country code
        phoneNumber = '+91' + phoneNumber;
      }

      const message = await twilioClient.messages.create({
        body: notification.message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });
      
      console.log(`SMS sent to ${phoneNumber}: ${message.sid}`);
      return true;
    } catch (error) {
      console.error('Error sending SMS:', error);
      return false;
    }
  }

  // Send WhatsApp (using Twilio WhatsApp API)
  private async sendWhatsApp(notification: any): Promise<boolean> {
    try {
      if (!notification.recipient_phone) {
        console.log('No phone number provided');
        return false;
      }

      // TODO: Implement WhatsApp Business API
      // const message = await twilioClient.messages.create({
      //   body: notification.message,
      //   from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      //   to: `whatsapp:${notification.recipient_phone}`,
      // });
      
      console.log(`WhatsApp would be sent to ${notification.recipient_phone}: ${notification.message}`);
      return true;
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      return false;
    }
  }

  // Generate HTML email template
  private generateEmailHTML(notification: any): string {
    const data = notification.data || {};
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .token { font-size: 48px; font-weight: bold; color: #667eea; margin: 20px 0; text-align: center; }
            .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #667eea; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎫 QueueFlow</h1>
              <p>Virtual Queue Management System</p>
            </div>
            <div class="content">
              ${notification.message}
              ${data.tokenLabel ? `<div class="token">${data.tokenLabel}</div>` : ''}
              ${data.position ? `<div class="info-box"><strong>Your Position:</strong> ${data.position}</div>` : ''}
              ${data.estimatedWait ? `<div class="info-box"><strong>Estimated Wait:</strong> ${data.estimatedWait} minutes</div>` : ''}
              ${data.serviceName ? `<div class="info-box"><strong>Service:</strong> ${data.serviceName}</div>` : ''}
              ${data.officeName ? `<div class="info-box"><strong>Office:</strong> ${data.officeName}</div>` : ''}
              ${data.actionUrl ? `<a href="${data.actionUrl}" class="button">View Token Status</a>` : ''}
            </div>
            <div class="footer">
              <p>© 2026 Municipal Services • QueueFlow</p>
              <p>This is an automated message. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // Helper: Check if channel is enabled
  private isChannelEnabled(channel: string, prefs: any): boolean {
    if (!prefs) return true; // Default to enabled if no preferences

    switch (channel) {
      case 'email':
        return prefs.email_enabled !== false;
      case 'sms':
        return prefs.sms_enabled !== false;
      case 'whatsapp':
        return prefs.whatsapp_enabled === true;
      case 'push':
        return prefs.push_enabled !== false;
      default:
        return true;
    }
  }

  // Template-based notifications
  async notifyTokenCreated(userId: string, tokenId: string, tokenData: any): Promise<void> {
    const message = `Your queue token ${tokenData.tokenLabel} has been created! You are at position ${tokenData.position} with an estimated wait time of ${tokenData.estimatedWait} minutes.`;

    await this.queueNotification({
      userId,
      tokenId,
      type: 'email',
      template: 'token_created',
      subject: `Queue Token Created: ${tokenData.tokenLabel}`,
      message,
      data: tokenData,
      priority: 3,
    });

    await this.queueNotification({
      userId,
      tokenId,
      type: 'sms',
      template: 'token_created',
      message: `QueueFlow: Token ${tokenData.tokenLabel} created. Position: ${tokenData.position}. Est. wait: ${tokenData.estimatedWait}min`,
      data: tokenData,
      priority: 3,
    });
  }

  async notifyTurnAlert(userId: string, tokenId: string, tokenData: any): Promise<void> {
    const message = `🔔 Your turn is coming soon! You are now ${tokenData.tokensAhead} ${tokenData.tokensAhead === 1 ? 'person' : 'people'} away. Please be ready.`;

    await this.queueNotification({
      userId,
      tokenId,
      type: 'email',
      template: 'turn_alert',
      subject: `⏰ Almost Your Turn - ${tokenData.tokenLabel}`,
      message,
      data: tokenData,
      priority: 1,
    });

    await this.queueNotification({
      userId,
      tokenId,
      type: 'sms',
      template: 'turn_alert',
      message: `QueueFlow ALERT: Token ${tokenData.tokenLabel} - Only ${tokenData.tokensAhead} ahead! Be ready.`,
      data: tokenData,
      priority: 1,
    });
  }

  async notifyYourTurn(userId: string, tokenId: string, tokenData: any): Promise<void> {
    const message = `🎯 It's your turn NOW! Please proceed to Counter ${tokenData.counterNumber}. Token: ${tokenData.tokenLabel}`;

    await this.queueNotification({
      userId,
      tokenId,
      type: 'email',
      template: 'your_turn',
      subject: `🔴 YOUR TURN NOW - ${tokenData.tokenLabel}`,
      message,
      data: tokenData,
      priority: 1,
    });

    await this.queueNotification({
      userId,
      tokenId,
      type: 'sms',
      template: 'your_turn',
      message: `QueueFlow: YOUR TURN! Token ${tokenData.tokenLabel} - Counter ${tokenData.counterNumber}`,
      data: tokenData,
      priority: 1,
    });

    await this.queueNotification({
      userId,
      tokenId,
      type: 'whatsapp',
      template: 'your_turn',
      message: `🎯 YOUR TURN NOW!\n\nToken: ${tokenData.tokenLabel}\nCounter: ${tokenData.counterNumber}\n\nPlease proceed immediately.`,
      data: tokenData,
      priority: 1,
    });
  }

  async notifyPositionUpdate(userId: string, tokenId: string, tokenData: any): Promise<void> {
    const message = `Your position has been updated. You are now at position ${tokenData.position} in the queue.`;

    await this.queueNotification({
      userId,
      tokenId,
      type: 'email',
      template: 'position_update',
      subject: `Position Update: ${tokenData.tokenLabel}`,
      message,
      data: tokenData,
      priority: 5,
    });
  }

  async notifyVerificationRequired(userId: string, tokenId: string, reason: string): Promise<void> {
    const message = `Your priority claim requires verification. Reason: ${reason}. Please upload required documents to proceed.`;

    await this.queueNotification({
      userId,
      tokenId,
      type: 'email',
      template: 'verification_required',
      subject: '📋 Document Verification Required',
      message,
      data: { reason },
      priority: 2,
    });
  }

  async notifyPriorityApproved(userId: string, tokenId: string, priorityType: string): Promise<void> {
    const message = `Great news! Your ${priorityType} priority has been approved. Your token will be moved to a higher priority in the queue.`;

    await this.queueNotification({
      userId,
      tokenId,
      type: 'email',
      template: 'priority_approved',
      subject: '✅ Priority Status Approved',
      message,
      data: { priorityType },
      priority: 2,
    });

    await this.queueNotification({
      userId,
      tokenId,
      type: 'sms',
      template: 'priority_approved',
      message: `QueueFlow: Your ${priorityType} priority approved! Token will be prioritized.`,
      data: { priorityType },
      priority: 2,
    });
  }

  async notifyPriorityRejected(userId: string, tokenId: string, priorityType: string, reason: string): Promise<void> {
    const message = `Your ${priorityType} priority claim has been rejected. Reason: ${reason}. Your token will remain at normal priority.`;

    await this.queueNotification({
      userId,
      tokenId,
      type: 'email',
      template: 'priority_rejected',
      subject: '❌ Priority Claim Rejected',
      message,
      data: { priorityType, reason },
      priority: 3,
    });
  }
}

export const notificationService = new NotificationService();
export { emailTransporter }; // Export for direct use in other routes

console.log('✓ Notification service initialized');
console.log('✓ Email notifications enabled');
console.log('✓ Processing pending notifications every 30 seconds');

// Background job to process notifications every 30 seconds
setInterval(() => {
  notificationService.processPendingNotifications();
}, 30000);
