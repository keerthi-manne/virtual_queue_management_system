/**
 * Notification Routes
 * Handles sending SMS, Email, WhatsApp notifications
 */

import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

/**
 * POST /api/notifications/send
 * Send notification to user via multiple channels
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { userId, tokenId, title, message, channels } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user details
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('email, phone, name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user preferences
    const { data: prefs } = await supabaseAdmin
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    const results = [];
    const requestedChannels = channels || ['EMAIL', 'SMS', 'WHATSAPP', 'IN_APP'];

    // Send Email
    if (requestedChannels.includes('EMAIL') && prefs?.enable_email && user.email) {
      const emailResult = await sendEmail(user.email, title, message);
      results.push({ channel: 'EMAIL', ...emailResult });

      // Log notification
      await logNotification(userId, tokenId, 'EMAIL', title, message, emailResult.success);
    }

    // Send SMS
    if (requestedChannels.includes('SMS') && prefs?.enable_sms && user.phone) {
      const smsResult = await sendSMS(user.phone, message);
      results.push({ channel: 'SMS', ...smsResult });

      // Log notification
      await logNotification(userId, tokenId, 'SMS', title, message, smsResult.success);
    }

    // Send WhatsApp
    if (requestedChannels.includes('WHATSAPP') && prefs?.enable_whatsapp && user.phone) {
      const whatsappResult = await sendWhatsApp(user.phone, message);
      results.push({ channel: 'WHATSAPP', ...whatsappResult });

      // Log notification
      await logNotification(userId, tokenId, 'WHATSAPP', title, message, whatsappResult.success);
    }

    // Send In-App
    if (requestedChannels.includes('IN_APP') && prefs?.enable_in_app) {
      const inAppResult = await sendInApp(userId, tokenId, title, message);
      results.push({ channel: 'IN_APP', ...inAppResult });
    }

    res.json({
      success: true,
      results,
      message: 'Notifications sent'
    });
  } catch (error: any) {
    console.error('Error sending notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/notifications/token-called
 * Notify user that their token has been called
 */
router.post('/token-called', async (req: Request, res: Response) => {
  try {
    const { tokenId, counterId } = req.body;

    // Get token details
    const { data: token, error } = await supabaseAdmin
      .from('tokens')
      .select(`
        *,
        services(name),
        counters(counter_number, offices(name))
      `)
      .eq('id', tokenId)
      .single();

    if (error || !token) {
      return res.status(404).json({ error: 'Token not found' });
    }

    // Get template
    const { data: template } = await supabaseAdmin
      .from('notification_templates')
      .select('*')
      .eq('event_type', 'TOKEN_CALLED')
      .eq('is_active', true)
      .single();

    if (!template) {
      return res.status(404).json({ error: 'Notification template not found' });
    }

    // Prepare message variables
    const variables = {
      token_label: token.token_label,
      citizen_name: token.citizen_name,
      service_name: token.services?.name || 'Service',
      counter_number: token.counters?.counter_number || 'N/A',
      office_name: token.counters?.offices?.name || 'Office',
      called_time: new Date().toLocaleTimeString()
    };

    // Replace variables in templates
    const smsMessage = replaceVariables(template.sms_template, variables);
    const emailBody = replaceVariables(template.email_template, variables);
    const whatsappMessage = replaceVariables(template.whatsapp_template, variables);
    const emailSubject = replaceVariables(template.email_subject, variables);

    // Send via all channels
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', token.citizen_id)
      .single();

    if (user) {
      await sendNotifications(user.id, tokenId, emailSubject, smsMessage, emailBody, whatsappMessage);
    }

    res.json({ success: true, message: 'Token called notification sent' });
  } catch (error: any) {
    console.error('Error sending token called notification:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper: Replace variables in template
 */
function replaceVariables(template: string, variables: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  return result;
}

/**
 * Helper: Send notifications via all channels
 */
async function sendNotifications(
  userId: string,
  tokenId: string,
  title: string,
  smsMessage: string,
  emailBody: string,
  whatsappMessage: string
) {
  // Get user details
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('email, phone')
    .eq('id', userId)
    .single();

  if (!user) return;

  // Get preferences
  const { data: prefs } = await supabaseAdmin
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Send Email
  if (prefs?.enable_email && user.email) {
    const result = await sendEmail(user.email, title, emailBody);
    await logNotification(userId, tokenId, 'EMAIL', title, emailBody, result.success);
  }

  // Send SMS
  if (prefs?.enable_sms && user.phone) {
    const result = await sendSMS(user.phone, smsMessage);
    await logNotification(userId, tokenId, 'SMS', title, smsMessage, result.success);
  }

  // Send WhatsApp
  if (prefs?.enable_whatsapp && user.phone) {
    const result = await sendWhatsApp(user.phone, whatsappMessage);
    await logNotification(userId, tokenId, 'WHATSAPP', title, whatsappMessage, result.success);
  }

  // Send In-App
  if (prefs?.enable_in_app) {
    await sendInApp(userId, tokenId, title, smsMessage);
  }
}

/**
 * Helper: Send Email (Mock - Replace with real email service)
 */
async function sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
    console.log(`📧 EMAIL to ${to}: ${subject}`);
    console.log(body);
    
    // Mock success for now
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Helper: Send SMS (Mock - Replace with real SMS service)
 */
async function sendSMS(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: Integrate with actual SMS service (Twilio, AWS SNS, etc.)
    console.log(`📱 SMS to ${to}: ${message}`);
    
    // Mock success for now
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Helper: Send WhatsApp (Mock - Replace with real WhatsApp service)
 */
async function sendWhatsApp(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: Integrate with actual WhatsApp Business API
    console.log(`💬 WhatsApp to ${to}: ${message}`);
    
    // Mock success for now
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Helper: Send In-App Notification
 */
async function sendInApp(userId: string, tokenId: string | null, title: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        token_id: tokenId,
        type: 'IN_APP',
        status: 'SENT',
        title,
        message,
        sent_at: new Date().toISOString()
      });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Helper: Log notification to database
 */
async function logNotification(
  userId: string,
  tokenId: string | null,
  type: string,
  title: string,
  message: string,
  success: boolean
) {
  await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: userId,
      token_id: tokenId,
      type,
      status: success ? 'SENT' : 'FAILED',
      title,
      message,
      sent_at: success ? new Date().toISOString() : null,
      error_message: success ? null : 'Failed to send'
    });
}

export default router;