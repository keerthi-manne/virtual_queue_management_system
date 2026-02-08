/**
 * Email Test Route - For SMTP configuration testing
 */

import { Router, Request, Response } from 'express';
import nodemailer from 'nodemailer';

const router = Router();

/**
 * POST /api/email-test/send
 * Send a test email to verify SMTP configuration
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { to } = req.body;

    if (!to) {
      return res.status(400).json({ 
        error: 'Email address required',
        example: { to: 'test@example.com' }
      });
    }

    // Check SMTP env vars
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpSecure = (process.env.SMTP_SECURE || '').toLowerCase() === 'true' || smtpPort === 465;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASSWORD;

    if (!smtpUser || !smtpPass) {
      return res.status(500).json({
        error: 'SMTP credentials not configured',
        missing: {
          SMTP_USER: !smtpUser,
          SMTP_PASSWORD: !smtpPass
        }
      });
    }

    // Create test transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // Verify connection
    console.log('Testing SMTP connection...');
    await transporter.verify();
    console.log('✓ SMTP connection verified');

    // Send test email
    const info = await transporter.sendMail({
      from: `${process.env.SMTP_FROM_NAME || 'QueueFlow Test'} <${process.env.SMTP_FROM_EMAIL || smtpUser}>`,
      to,
      subject: '✅ QueueFlow SMTP Test - Success',
      text: `This is a test email from QueueFlow Virtual Queue Management System.\n\nYour SMTP configuration is working correctly!\n\nConfiguration:\n- Host: ${smtpHost}\n- Port: ${smtpPort}\n- Secure: ${smtpSecure}\n- User: ${smtpUser}\n\nTimestamp: ${new Date().toISOString()}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .success { background: #d1fae5; border: 2px solid #10b981; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #10b981; }
              .code { background: #1f2937; color: #10b981; padding: 10px; border-radius: 4px; font-family: monospace; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ SMTP Test Successful</h1>
                <p>QueueFlow Virtual Queue Management System</p>
              </div>
              <div class="content">
                <div class="success">
                  <strong>🎉 Congratulations!</strong><br>
                  Your SMTP configuration is working correctly.
                </div>
                
                <div class="info-box">
                  <strong>Configuration Details:</strong><br>
                  • Host: ${smtpHost}<br>
                  • Port: ${smtpPort}<br>
                  • Secure: ${smtpSecure}<br>
                  • User: ${smtpUser}
                </div>
                
                <div class="info-box">
                  <strong>Next Steps:</strong><br>
                  1. Your notification system is now ready<br>
                  2. Token notifications will be sent automatically<br>
                  3. Users will receive queue updates via email
                </div>
                
                <div class="info-box">
                  <strong>Timestamp:</strong> ${new Date().toLocaleString()}
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log('✓ Test email sent successfully');
    console.log(`Message ID: ${info.messageId}`);

    res.json({
      success: true,
      message: 'Test email sent successfully',
      details: {
        messageId: info.messageId,
        recipient: to,
        smtp: {
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          user: smtpUser
        }
      }
    });

  } catch (error: any) {
    console.error('✗ SMTP test failed:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      command: error.command,
      help: 'Check your SMTP credentials and Gmail App Password setup'
    });
  }
});

/**
 * GET /api/email-test/config
 * Show current SMTP configuration (without sensitive data)
 */
router.get('/config', (req: Request, res: Response) => {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpSecure = (process.env.SMTP_SECURE || '').toLowerCase() === 'true' || smtpPort === 465;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASSWORD;

  res.json({
    configured: !!(smtpUser && smtpPass),
    config: {
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      user: smtpUser || 'NOT_SET',
      password: smtpPass ? '***' + smtpPass.slice(-4) : 'NOT_SET',
      fromName: process.env.SMTP_FROM_NAME || 'QueueFlow Notifications',
      fromEmail: process.env.SMTP_FROM_EMAIL || smtpUser || 'NOT_SET'
    }
  });
});

export default router;
