import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/staff-requests
 * Create a new staff request to serve a specific user
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { staffId, tokenId, counterId, reason } = req.body;

    if (!staffId || !tokenId) {
      return res.status(400).json({ error: 'staffId and tokenId are required' });
    }

    // Verify token exists and is in WAITING status
    const { data: token, error: tokenError } = await supabaseAdmin
      .from('tokens')
      .select('*, services(name)')
      .eq('id', tokenId)
      .single();

    if (tokenError || !token) {
      return res.status(404).json({ error: 'Token not found' });
    }

    if (token.status !== 'WAITING') {
      return res.status(400).json({ error: 'Token is not in WAITING status' });
    }

    // Create the request
    const { data: request, error: requestError } = await supabaseAdmin
      .from('staff_requests')
      .insert({
        staff_id: staffId,
        token_id: tokenId,
        counter_id: counterId || null,
        reason: reason || null,
        status: 'PENDING'
      })
      .select(`
        *,
        tokens(
          token_label,
          citizen_name,
          citizen_phone,
          priority,
          services(name)
        )
      `)
      .single();

    if (requestError) {
      console.error('Error creating request:', requestError);
      return res.status(500).json({ error: 'Failed to create request' });
    }

    console.log('✅ Staff request created:', request.id);
    res.json(request);
  } catch (error: any) {
    console.error('Error in staff request creation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/staff-requests
 * Get all pending requests (admin) or staff's own requests
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { staffId, status } = req.query;

    let query = supabaseAdmin
      .from('staff_requests')
      .select(`
        *,
        staff:users!staff_requests_staff_id_fkey(id, name, email),
        tokens(
          id,
          token_label,
          citizen_name,
          citizen_phone,
          priority,
          status,
          services(name)
        )
      `)
      .order('created_at', { ascending: false });

    if (staffId) {
      query = query.eq('staff_id', staffId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('Error fetching requests:', error);
      return res.status(500).json({ error: 'Failed to fetch requests' });
    }

    res.json(requests);
  } catch (error: any) {
    console.error('Error fetching staff requests:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/staff-requests/:id/approve
 * Approve a staff request and assign user to counter
 */
router.patch('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { adminId, counterId, notes } = req.body;

    // Get the request
    const { data: request, error: requestError } = await supabaseAdmin
      .from('staff_requests')
      .select(`
        *,
        tokens(*),
        staff:users!staff_requests_staff_id_fkey(name)
      `)
      .eq('id', id)
      .single();

    if (requestError || !request) {
      console.error('Request not found:', requestError);
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    // Use counter from request, or provided counterId, or fail
    const assignedCounterId = counterId || request.counter_id;

    if (!assignedCounterId) {
      console.error('No counter specified in request');
      return res.status(400).json({ error: 'No counter specified for this request' });
    }

    // Update request status
    const { error: updateError } = await supabaseAdmin
      .from('staff_requests')
      .update({
        status: 'APPROVED',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        admin_notes: notes
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating request:', updateError);
      return res.status(500).json({ error: 'Failed to approve request' });
    }

    // Assign token to counter and call it
    const { error: tokenError } = await supabaseAdmin
      .from('tokens')
      .update({
        counter_id: assignedCounterId,
        status: 'CALLED',
        called_at: new Date().toISOString()
      })
      .eq('id', request.token_id);

    if (tokenError) {
      console.error('Error updating token:', tokenError);
      return res.status(500).json({ error: 'Failed to assign token' });
    }

    // Send notifications (integrate with notification system)
    try {
      await fetch(`${process.env.CLIENT_URL?.replace(/:\d+$/, ':5000')}/api/notifications/token-called`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId: request.token_id,
          counterId: assignedCounterId
        })
      });
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }

    console.log('✅ Request approved:', id);
    res.json({ success: true, message: 'Request approved and user assigned to counter' });
  } catch (error: any) {
    console.error('Error approving request:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/staff-requests/:id/reject
 * Reject a staff request
 */
router.patch('/:id/reject', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { adminId, notes } = req.body;

    const { error } = await supabaseAdmin
      .from('staff_requests')
      .update({
        status: 'REJECTED',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        admin_notes: notes
      })
      .eq('id', id)
      .eq('status', 'PENDING');

    if (error) {
      console.error('Error rejecting request:', error);
      return res.status(500).json({ error: 'Failed to reject request' });
    }

    console.log('❌ Request rejected:', id);
    res.json({ success: true, message: 'Request rejected' });
  } catch (error: any) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
