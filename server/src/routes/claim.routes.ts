/**
 * Claim Routes - Aadhaar, Disability, Emergency Document Upload & Verification
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createWorker } from 'tesseract.js';
import { supabaseAdmin } from '../config/supabase';
import { emailTransporter } from '../services/notification.service';

const router = Router();

// Storage config for uploads
const upload = multer({
  dest: path.join(__dirname, '../../uploads'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

/**
 * POST /api/claim/upload
 * Upload Aadhaar, Disability, or Emergency document
 * Body: { userId, claimType, tokenId? } + file
 */
router.post('/upload', upload.single('document'), async (req: Request, res: Response) => {
  try {
    const { userId, claimType, tokenId, serviceId } = req.body;
    const file = req.file;
    
    if (!userId || !claimType || !file) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Save claim in database with service_id
    const { data: claim, error } = await supabaseAdmin
      .from('priority_claims')
      .insert({
        user_id: userId,
        token_id: tokenId || null,
        service_id: serviceId || null, // Save which service they wanted
        claim_type: claimType.toUpperCase(),
        document_path: file.path,
        document_name: file.originalname,
        status: 'PENDING',
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving claim:', error);
      return res.status(500).json({ error: error.message });
    }

    // Auto-verify for SENIOR and DISABLED (will still need admin approval)
    if (claimType.toUpperCase() === 'SENIOR') {
      // Extract age
      try {
        console.log('🔍 Running OCR for Aadhaar age extraction...');
        const ageResult = await extractAgeFromAadhaar(file.filename);
        console.log('📊 OCR Result:', ageResult);
        
        if (ageResult.success) {
          // Save OCR result regardless of whether they're senior or not
          await supabaseAdmin
            .from('priority_claims')
            .update({ 
              verification_data: { 
                age: ageResult.age, 
                dob: ageResult.dob,
                isSenior: ageResult.isSenior,
                ocrSuccess: true
              },
              auto_verified: ageResult.isSenior // Only auto-verify if they ARE senior
            })
            .eq('id', claim.id);
          
          if (ageResult.isSenior) {
            console.log('✅ Senior claim auto-verified (age >= 60)');
          } else {
            console.log('⚠️ OCR extracted age, but NOT senior (age < 60)');
          }
        }
      } catch (ocrError) {
        console.error('❌ OCR extraction failed:', ocrError);
      }
    } else if (claimType.toUpperCase() === 'DISABLED') {
      // Verify disability certificate
      try {
        console.log('🔍 Running OCR for disability certificate...');
        const certResult = await verifyDisabilityCertificate(file.filename);
        console.log('📊 OCR Result:', certResult);
        
        if (certResult.success) {
          await supabaseAdmin
            .from('priority_claims')
            .update({ 
              verification_data: { 
                keywords: certResult.foundKeywords,
                valid: certResult.valid,
                ocrSuccess: true
              },
              auto_verified: certResult.valid
            })
            .eq('id', claim.id);
          
          if (certResult.valid) {
            console.log('✅ Disability certificate auto-verified');
          } else {
            console.log('⚠️ OCR ran but certificate invalid');
          }
        }
      } catch (ocrError) {
        console.error('❌ OCR extraction failed:', ocrError);
      }
    }

    res.json({ success: true, claim });
  } catch (error: any) {
    console.error('Error uploading claim:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/claim/extract-age
 * Extract age from Aadhaar image using OCR
 * Body: { filename }
 */
router.post('/extract-age', async (req: Request, res: Response) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Filename required' });
    }

    const filePath = path.join(__dirname, '../../uploads', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Use Tesseract OCR to extract text
    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(filePath);
    await worker.terminate();

    console.log('Extracted text from Aadhaar:', text);

    // Extract DOB patterns: DD/MM/YYYY or DD-MM-YYYY
    const dobPatterns = [
      /DOB[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
      /Birth[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
      /(\d{2}[\/\-]\d{2}[\/\-]\d{4})/g
    ];

    let dob: Date | null = null;
    for (const pattern of dobPatterns) {
      const match = text.match(pattern);
      if (match) {
        const dobStr = match[1] || match[0];
        const parts = dobStr.split(/[\/\-]/);
        if (parts.length === 3) {
          // Assume DD/MM/YYYY or DD-MM-YYYY
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // 0-indexed
          const year = parseInt(parts[2]);
          dob = new Date(year, month, day);
          if (!isNaN(dob.getTime())) break;
        }
      }
    }

    if (!dob || isNaN(dob.getTime())) {
      return res.json({ 
        success: false, 
        error: 'Could not extract valid date of birth from Aadhaar',
        extractedText: text.substring(0, 500)
      });
    }

    const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
    const isSenior = age >= 60;

    res.json({ 
      success: true, 
      age, 
      isSenior,
      dob: dob.toISOString().split('T')[0]
    });
  } catch (error: any) {
    console.error('Error extracting age:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/claim/extract-disability
 * Extract and verify disability certificate text using OCR
 * Body: { filename }
 */
router.post('/extract-disability', async (req: Request, res: Response) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Filename required' });
    }

    const filePath = path.join(__dirname, '../../uploads', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Use Tesseract OCR to extract text
    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(filePath);
    await worker.terminate();

    console.log('Extracted text from disability certificate:', text);

    // Check for disability certificate keywords
    const keywords = [
      'disability',
      'disabled',
      'handicap',
      'certificate',
      'govt',
      'government',
      'ministry',
      'social welfare',
      'medical board',
      'permanent',
      'temporary',
      '40%',
      '50%',
      '60%',
      '70%',
      '80%',
      '90%',
      '100%'
    ];

    const lowerText = text.toLowerCase();
    const foundKeywords = keywords.filter(kw => lowerText.includes(kw));
    
    // Valid if at least 3 keywords found (including "disability" or "disabled")
    const hasDisabilityKeyword = foundKeywords.some(kw => 
      kw === 'disability' || kw === 'disabled' || kw === 'handicap'
    );
    const hasGovtKeyword = foundKeywords.some(kw => 
      kw === 'govt' || kw === 'government' || kw === 'ministry'
    );
    
    const valid = hasDisabilityKeyword && hasGovtKeyword && foundKeywords.length >= 3;

    res.json({ 
      success: true, 
      valid,
      foundKeywords,
      extractedText: text.substring(0, 500)
    });
  } catch (error: any) {
    console.error('Error extracting disability certificate:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/claim/emergency
 * Submit emergency claim (requires admin approval)
 * Body: { userId, reason, tokenId? } + file
 */
router.post('/emergency', upload.single('document'), async (req: Request, res: Response) => {
  try {
    const { userId, reason, tokenId } = req.body;
    const file = req.file;
    
    if (!userId || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Save emergency claim in database
    const { data: claim, error } = await supabaseAdmin
      .from('priority_claims')
      .insert({
        user_id: userId,
        token_id: tokenId || null,
        claim_type: 'EMERGENCY',
        document_path: file?.path || null,
        document_name: file?.originalname || null,
        reason: reason,
        status: 'PENDING',
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving emergency claim:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, claim });
  } catch (error: any) {
    console.error('Error submitting emergency claim:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/claim/document/:filename
 * Serve uploaded document for admin review
 */
router.get('/document/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.sendFile(filePath);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/claim/pending
 * Get all pending claims for admin review
 */
router.get('/pending', async (req: Request, res: Response) => {
  try {
    const { data: claims, error } = await supabaseAdmin
      .from('priority_claims')
      .select(`
        *,
        users:user_id (name, email, phone),
        tokens:token_id (token_label, service_id)
      `)
      .eq('status', 'PENDING')
      .order('submitted_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, claims });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/claim/user/:userId
 * Get user's claim status
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { data: claims, error } = await supabaseAdmin
      .from('priority_claims')
      .select('*')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Group by claim type
    const claimStatus = {
      SENIOR: claims.find(c => c.claim_type === 'SENIOR'),
      DISABLED: claims.find(c => c.claim_type === 'DISABLED'),
      EMERGENCY: claims.find(c => c.claim_type === 'EMERGENCY')
    };

    res.json({ success: true, claims: claimStatus });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/claim/approve
 * Approve a claim, generate priority token, and send notifications
 * Body: { claimId, adminNotes?, serviceId? (required if claim doesn't have one) }
 */
router.post('/approve', async (req: Request, res: Response) => {
  try {
    const { claimId, adminNotes, serviceId } = req.body;

    if (!claimId) {
      return res.status(400).json({ error: 'Claim ID required' });
    }

    // Get claim details with user info and service_id
    const { data: claim, error: claimError } = await supabaseAdmin
      .from('priority_claims')
      .select('*, user:user_id(email, name, phone)')
      .eq('id', claimId)
      .single();

    if (claimError || !claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    // Use claim's service_id or the one provided by admin (for old claims)
    const targetServiceId = claim.service_id || serviceId;
    
    if (!targetServiceId) {
      return res.status(400).json({ error: 'Service ID required. This is an old claim without a service selected.' });
    }

    console.log(`✅ Approving claim ${claimId} for user ${claim.user_id}`);

    // Update claim status
    await supabaseAdmin
      .from('priority_claims')
      .update({
        status: 'APPROVED',
        approved_at: new Date().toISOString(),
        admin_notes: adminNotes
      })
      .eq('id', claimId);

    // Generate token with priority
    const priorityMap: { [key: string]: string } = {
      'SENIOR': 'SENIOR',
      'DISABLED': 'DISABLED',
      'EMERGENCY': 'EMERGENCY'
    };

    const priority = priorityMap[claim.claim_type] || 'NORMAL';
    
    // Get service details for queue calculation
    const { data: service } = await supabaseAdmin
      .from('services')
      .select('*')
      .eq('id', targetServiceId)
      .single();

    // Get current queue position
    const { count: queueLength } = await supabaseAdmin
      .from('tokens')
      .select('*', { count: 'exact', head: true })
      .eq('service_id', targetServiceId)
      .eq('status', 'WAITING');

    const estimatedWaitTime = Math.round((queueLength || 0) * (service?.base_handle_time || 15));

    // Generate token label
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const prefix = letters[Math.floor(Math.random() * letters.length)];
    const number = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const tokenLabel = `${prefix}${number}`;

    // Create token
    const { data: token, error: tokenError } = await supabaseAdmin
      .from('tokens')
      .insert({
        user_id: claim.user_id,
        service_id: targetServiceId,
        priority: priority,
        status: 'WAITING',
        token_label: tokenLabel,
        citizen_id: claim.user_id,
        citizen_name: claim.user?.name || 'User',
        citizen_phone: claim.user?.phone || null,
        joined_at: new Date().toISOString()
      })
      .select()
      .single();

    // Add estimated wait time and token_number to response
    if (token) {
      token.estimated_wait_time = estimatedWaitTime;
      token.token_number = token.token_label;
    }

    if (tokenError || !token) {
      console.error('Failed to create token:', tokenError);
      return res.status(500).json({ error: 'Failed to create token' });
    }

    console.log(`🎫 Generated ${priority} token ${tokenLabel} with ${estimatedWaitTime}min wait`);

    // Send email notification
    const userEmail = claim.user?.email;
    const userName = claim.user?.name || 'User';
    
    if (userEmail) {
      console.log(`📧 Sending approval email to ${userEmail}`);
      
      try {
        await emailTransporter.sendMail({
          from: process.env.SMTP_FROM_EMAIL,
          to: userEmail,
          subject: '✅ Priority Claim Approved - Your Token is Ready!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #16a34a;">Priority Claim Approved! 🎉</h2>
              <p>Dear ${userName},</p>
              <p>Great news! Your priority claim for <strong>${claim.claim_type}</strong> status has been approved.</p>
              <div style="background-color: #dcfce7; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0;">Your Token Details:</h3>
                <p style="margin: 5px 0;"><strong>Token Number:</strong> <span style="font-size: 24px; color: #16a34a;">${tokenLabel}</span></p>
                <p style="margin: 5px 0;"><strong>Priority:</strong> ${priority}</p>
                <p style="margin: 5px 0;"><strong>Estimated Wait Time:</strong> ${estimatedWaitTime} minutes</p>
                <p style="margin: 5px 0;"><strong>Service:</strong> ${service?.name || 'Service'}</p>
              </div>
              <p>Please arrive at the counter when your token is called. You'll receive priority service!</p>
              ${adminNotes ? `<p><em>Admin note: ${adminNotes}</em></p>` : ''}
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
              <p style="color: #6b7280; font-size: 12px;">Virtual Queue Management System</p>
            </div>
          `
        });
        console.log('✅ Approval email sent successfully');
      } catch (emailError) {
        console.error('⚠️ Failed to send approval email:', emailError);
      }
    }

    // Send SMS if phone available
    const userPhone = claim.user?.phone;
    if (userPhone && process.env.TWILIO_ACCOUNT_SID) {
      try {
        const twilioClient = require('twilio')(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        
        await twilioClient.messages.create({
          body: `✅ Priority claim approved! Your ${priority} token: ${tokenLabel}. Est. wait: ${estimatedWaitTime}min. Service: ${service?.name || 'Service'}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: userPhone.startsWith('+') ? userPhone : `+91${userPhone}`
        });
        console.log(`📱 SMS sent to ${userPhone}`);
      } catch (smsError) {
        console.error('⚠️ Failed to send SMS:', smsError);
      }
    }

    res.json({ success: true, message: 'Claim approved and token generated', token });
  } catch (error: any) {
    console.error('Error approving claim:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/claim/reject
 * Reject a claim, generate normal priority token, and notify user
 * Body: { claimId, adminNotes }
 */
router.post('/reject', async (req: Request, res: Response) => {
  try {
    const { claimId, adminNotes } = req.body;

    if (!claimId || !adminNotes) {
      return res.status(400).json({ error: 'Claim ID and reason required' });
    }

    // Get claim details with user email and service_id
    const { data: claim, error: claimError } = await supabaseAdmin
      .from('priority_claims')
      .select('*, user:user_id(email, name, phone)')
      .eq('id', claimId)
      .single();

    if (claimError || !claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    if (!claim.service_id) {
      return res.status(400).json({ error: 'No service specified for this claim. Please ask user to resubmit.' });
    }

    console.log(`❌ Rejecting claim ${claimId} for user ${claim.user_id}`);
    console.log(`📝 Rejection reason: ${adminNotes}`);

    // Update claim status
    await supabaseAdmin
      .from('priority_claims')
      .update({
        status: 'REJECTED',
        rejected_at: new Date().toISOString(),
        admin_notes: adminNotes
      })
      .eq('id', claimId);

    // Generate NORMAL priority token as consolation
    const { data: service } = await supabaseAdmin
      .from('services')
      .select('*')
      .eq('id', claim.service_id)
      .single();

    const { count: queueLength } = await supabaseAdmin
      .from('tokens')
      .select('*', { count: 'exact', head: true })
      .eq('service_id', claim.service_id)
      .eq('status', 'WAITING');

    const estimatedWaitTime = Math.round((queueLength || 0) * (service?.base_handle_time || 15));

    // Generate token label
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const prefix = letters[Math.floor(Math.random() * letters.length)];
    const number = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const tokenLabel = `${prefix}${number}`;

    // Create NORMAL priority token
    const { data: token, error: tokenError } = await supabaseAdmin
      .from('tokens')
      .insert({
        user_id: claim.user_id,
        service_id: claim.service_id,
        priority: 'NORMAL',
        status: 'WAITING',
        token_label: tokenLabel,
        citizen_id: claim.user_id,
        citizen_name: claim.user?.name || 'User',
        citizen_phone: claim.user?.phone || null,
        joined_at: new Date().toISOString()
      })
      .select()
      .single();

    // Add estimated wait time and token_number to response
    if (token) {
      token.estimated_wait_time = estimatedWaitTime;
      token.token_number = token.token_label;
    }

    if (tokenError || !token) {
      console.error('Failed to create normal token:', tokenError);
      return res.status(500).json({ error: 'Failed to create token' });
    }

    console.log(`🎫 Generated NORMAL token ${tokenLabel} with ${estimatedWaitTime}min wait`);

    // Send rejection notification email with token
    const userEmail = claim.user?.email;
    const userName = claim.user?.name || 'User';
    
    if (userEmail) {
      console.log(`📧 Sending rejection email with normal token to ${userEmail}`);
      
      try {
        await emailTransporter.sendMail({
          from: process.env.SMTP_FROM_EMAIL,
          to: userEmail,
          subject: '❌ Priority Claim Rejected - Normal Token Generated',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Priority Claim Rejected</h2>
              <p>Dear ${userName},</p>
              <p>Your priority claim for <strong>${claim.claim_type}</strong> status has been reviewed and rejected.</p>
              <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Rejection Reason:</strong></p>
                <p style="margin: 5px 0 0 0;">${adminNotes}</p>
              </div>
              <h3 style="color: #2563eb;">However, we've generated a normal priority token for you:</h3>
              <div style="background-color: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Token Number:</strong> <span style="font-size: 24px; color: #2563eb;">${tokenLabel}</span></p>
                <p style="margin: 5px 0;"><strong>Priority:</strong> NORMAL</p>
                <p style="margin: 5px 0;"><strong>Estimated Wait Time:</strong> ${estimatedWaitTime} minutes</p>
                <p style="margin: 5px 0;"><strong>Service:</strong> ${service?.name || 'Service'}</p>
              </div>
              <p>Please arrive at the counter when your token is called.</p>
              <p>If you believe this rejection is an error, please contact our support team.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
              <p style="color: #6b7280; font-size: 12px;">Virtual Queue Management System</p>
            </div>
          `
        });
        console.log('✅ Rejection email with token sent successfully');
      } catch (emailError) {
        console.error('⚠️ Failed to send rejection email:', emailError);
      }
    } else {
      console.log('⚠️ No email found for user, skipping notification');
    }

    // Send SMS with token
    const userPhone = claim.user?.phone;
    if (userPhone && process.env.TWILIO_ACCOUNT_SID) {
      try {
        const twilioClient = require('twilio')(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        
        await twilioClient.messages.create({
          body: `Priority claim rejected. Reason: ${adminNotes.substring(0, 50)}... Your NORMAL token: ${tokenLabel}. Est. wait: ${estimatedWaitTime}min.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: userPhone.startsWith('+') ? userPhone : `+91${userPhone}`
        });
        console.log(`📱 SMS sent to ${userPhone}`);
      } catch (smsError) {
        console.error('⚠️ Failed to send SMS:', smsError);
      }
    }

    res.json({ success: true, message: 'Claim rejected, normal token generated and user notified', token });
  } catch (error: any) {
    console.error('Error rejecting claim:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions
async function extractAgeFromAadhaar(filename: string) {
  try {
    const filePath = path.join(__dirname, '../../uploads', filename);
    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(filePath);
    await worker.terminate();

    const dobPatterns = [
      /DOB[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
      /Birth[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
      /(\d{2}[\/\-]\d{2}[\/\-]\d{4})/g
    ];

    let dob: Date | null = null;
    for (const pattern of dobPatterns) {
      const match = text.match(pattern);
      if (match) {
        const dobStr = match[1] || match[0];
        const parts = dobStr.split(/[\/\-]/);
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          const year = parseInt(parts[2]);
          dob = new Date(year, month, day);
          if (!isNaN(dob.getTime())) break;
        }
      }
    }

    if (!dob || isNaN(dob.getTime())) {
      return { success: false };
    }

    const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
    const isSenior = age >= 60;

    return { success: true, age, isSenior, dob: dob.toISOString().split('T')[0] };
  } catch {
    return { success: false };
  }
}

async function verifyDisabilityCertificate(filename: string) {
  try {
    const filePath = path.join(__dirname, '../../uploads', filename);
    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(filePath);
    await worker.terminate();

    const keywords = ['disability', 'disabled', 'handicap', 'certificate', 'govt', 'government'];
    const lowerText = text.toLowerCase();
    const foundKeywords = keywords.filter(kw => lowerText.includes(kw));
    
    const hasDisabilityKeyword = foundKeywords.some(kw => 
      kw === 'disability' || kw === 'disabled' || kw === 'handicap'
    );
    const hasGovtKeyword = foundKeywords.some(kw => 
      kw === 'govt' || kw === 'government'
    );
    
    const valid = hasDisabilityKeyword && hasGovtKeyword && foundKeywords.length >= 3;

    return { success: true, valid, foundKeywords };
  } catch {
    return { success: false, valid: false, foundKeywords: [] };
  }
}

export default router;
