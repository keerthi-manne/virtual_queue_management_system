/**
 * Reschedule Routes
 * Handles token reschedule requests for no-shows
 */

import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { sendRescheduleRequest, sendRescheduleConfirmation } from '../services/rescheduleNotification.service';

const router = Router();

/**
 * POST /api/reschedule/mark-no-show
 * Mark a token as no-show and create reschedule request
 */
router.post('/mark-no-show', async (req: Request, res: Response) => {
  try {
    const { tokenId, reason, staffId } = req.body;

    if (!tokenId) {
      return res.status(400).json({ error: 'Token ID is required' });
    }

    // Get token details first
    const { data: token, error: tokenError } = await supabaseAdmin
      .from('tokens')
      .select(`
        *,
        users!citizen_id(id, email, phone, name),
        services(id, name)
      `)
      .eq('id', tokenId)
      .single();

    if (tokenError || !token) {
      return res.status(404).json({ error: 'Token not found' });
    }

    // Check if token can be marked as no-show (must be called or serving)
    if (!['called', 'serving'].includes(token.status)) {
      return res.status(400).json({ 
        error: 'Token must be called or serving to mark as no-show' 
      });
    }

    // Update token status to no_show
    const { error: updateError } = await supabaseAdmin
      .from('tokens')
      .update({ 
        status: 'no_show'
      })
      .eq('id', tokenId);

    if (updateError) {
      throw updateError;
    }

    // Log the event
    await supabaseAdmin
      .from('queue_events')
      .insert({
        token_id: tokenId,
        event_type: 'no_show',
        old_status: token.status,
        new_status: 'no_show',
        staff_id: staffId,
        metadata: { reason }
      });

    // Create reschedule request using database function
    const { data: rescheduleRequest, error: rescheduleError } = await supabaseAdmin
      .rpc('create_reschedule_request', {
        p_token_id: tokenId,
        p_reason: reason
      });

    if (rescheduleError) {
      console.error('Failed to create reschedule request:', rescheduleError);
      throw rescheduleError;
    }

    // Get the created reschedule request details
    const { data: requestDetails, error: requestError } = await supabaseAdmin
      .from('reschedule_requests')
      .select('*')
      .eq('id', rescheduleRequest)
      .single();

    if (requestError || !requestDetails) {
      console.error('Failed to fetch reschedule request details:', requestError);
    }

    // Send notifications (SMS + Email) - Don't wait for it
    sendRescheduleRequest(
      token.users,
      token,
      rescheduleRequest,
      requestDetails?.expires_at
    ).catch(err => console.error('Failed to send reschedule notification:', err));

    res.json({
      success: true,
      message: 'Token marked as no-show and reschedule request created',
      rescheduleRequestId: rescheduleRequest,
      tokenId
    });
  } catch (error: any) {
    console.error('Error marking no-show:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/reschedule/accept/:requestId
 * Accept a reschedule request and create new token
 */
router.post('/accept/:requestId', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;

    // Verify request exists and is pending
    const { data: request, error: requestError } = await supabaseAdmin
      .from('reschedule_requests')
      .select(`
        *,
        tokens!original_token_id(
          token_label,
          service_id,
          services(id, name)
        ),
        users!citizen_id(id, email, phone, name)
      `)
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      return res.status(404).json({ error: 'Reschedule request not found' });
    }

    if (request.request_status !== 'pending') {
      return res.status(400).json({ 
        error: 'Reschedule request has already been processed' 
      });
    }

    // Check if expired
    if (new Date(request.expires_at) < new Date()) {
      await supabaseAdmin
        .from('reschedule_requests')
        .update({ request_status: 'expired' })
        .eq('id', requestId);
      
      return res.status(400).json({ 
        error: 'Reschedule request has expired' 
      });
    }

    // Accept reschedule using database function
    const { data: newTokenId, error: acceptError } = await supabaseAdmin
      .rpc('accept_reschedule_request', {
        p_request_id: requestId
      });

    if (acceptError) {
      console.error('Failed to accept reschedule:', acceptError);
      throw acceptError;
    }

    // Get new token details
    const { data: newToken, error: tokenError } = await supabaseAdmin
      .from('tokens')
      .select(`
        *,
        services(id, name),
        counters(id, counter_number)
      `)
      .eq('id', newTokenId)
      .single();

    if (tokenError) {
      console.error('Failed to fetch new token:', tokenError);
    }

    // Send confirmation notification
    if (newToken) {
      sendRescheduleConfirmation(
        request.users,
        newToken,
        request.tokens.services
      ).catch(err => console.error('Failed to send confirmation:', err));
    }

    // Update the reschedule request with new_token_id for the GET endpoint
    await supabaseAdmin
      .from('reschedule_requests')
      .update({ new_token_id: newTokenId })
      .eq('id', requestId);

    res.json({
      success: true,
      message: 'Reschedule accepted successfully',
      newToken,
      new_token: newToken,
      requestId
    });
  } catch (error: any) {
    console.error('Error accepting reschedule:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/reschedule/decline/:requestId
 * Decline a reschedule request
 */
router.post('/decline/:requestId', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;

    // Verify request exists and is pending
    const { data: request, error: requestError } = await supabaseAdmin
      .from('reschedule_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      return res.status(404).json({ error: 'Reschedule request not found' });
    }

    if (request.request_status !== 'pending') {
      return res.status(400).json({ 
        error: 'Reschedule request has already been processed' 
      });
    }

    // Decline reschedule using database function
    const { data: success, error: declineError } = await supabaseAdmin
      .rpc('decline_reschedule_request', {
        p_request_id: requestId
      });

    if (declineError || !success) {
      throw declineError || new Error('Failed to decline request');
    }

    res.json({
      success: true,
      message: 'Reschedule request declined',
      requestId
    });
  } catch (error: any) {
    console.error('Error declining reschedule:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reschedule/request/:requestId
 * Get reschedule request details
 */
router.get('/request/:requestId', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;

    const { data: request, error } = await supabaseAdmin
      .from('reschedule_requests')
      .select(`
        *,
        tokens!original_token_id(
          token_label,
          services(id, name)
        ),
        users!citizen_id(id, email, name)
      `)
      .eq('id', requestId)
      .single();

    if (error || !request) {
      console.error('Error fetching reschedule request:', error);
      return res.status(404).json({ error: 'Reschedule request not found' });
    }

    // If accepted, fetch new token details separately
    if (request.new_token_id) {
      const { data: newToken } = await supabaseAdmin
        .from('tokens')
        .select('token_label, queue_position, status')
        .eq('id', request.new_token_id)
        .single();
      
      if (newToken) {
        request.new_token = newToken;
      }
    }

    res.json(request);
  } catch (error: any) {
    console.error('Error fetching reschedule request:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reschedule/user/:userId
 * Get all reschedule requests for a user
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { data: requests, error } = await supabaseAdmin
      .from('reschedule_requests')
      .select(`
        *,
        tokens!original_token_id(
          token_label,
          services(name)
        )
      `)
      .eq('citizen_id', userId)
      .order('requested_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(requests || []);
  } catch (error: any) {
    console.error('Error fetching user reschedule requests:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reschedule/pending
 * Get all pending reschedule requests (admin/staff only)
 */
router.get('/pending', async (req: Request, res: Response) => {
  try {
    const { data: requests, error } = await supabaseAdmin
      .from('reschedule_requests')
      .select(`
        *,
        tokens!original_token_id(
          *,
          services(id, name)
        ),
        users(id, email, phone, name)
      `)
      .eq('request_status', 'pending')
      .order('requested_at', { ascending: true });

    if (error) {
      throw error;
    }

    res.json(requests || []);
  } catch (error: any) {
    console.error('Error fetching pending reschedule requests:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
