/**
 * Staff Routes
 * Handles counter staff operations
 */

import { Router, Request, Response } from 'express';
import { queueEngine } from '../services/queueEngine';
import { TokenStatus } from '../models/queue.model';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

/**
 * POST /api/staff/call-next
 * Call next token in queue
 */
router.post('/call-next', async (req: Request, res: Response) => {
  try {
    const { counterId, staffId } = req.body;

    if (!counterId || !staffId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify staff has access to this counter
    const { data: counter } = await supabaseAdmin
      .from('counters')
      .select('*')
      .eq('id', counterId)
      .single();

    if (!counter) {
      return res.status(404).json({ error: 'Counter not found' });
    }

    const token = await queueEngine.callNextToken({
      counterId,
      staffId
    });

    if (!token) {
      return res.json({
        success: true,
        token: null,
        message: 'No tokens in queue'
      });
    }

    res.json({
      success: true,
      token,
      message: 'Token called successfully'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/staff/token/:tokenId/serve
 * Mark token as being served
 */
router.post('/token/:tokenId/serve', async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;
    const { staffId, counterId } = req.body;

    const token = await queueEngine.updateTokenStatus({
      tokenId,
      status: TokenStatus.SERVING,
      staffId,
      counterId
    });

    res.json({
      success: true,
      token,
      message: 'Token marked as serving'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/staff/token/:tokenId/complete
 * Mark token as completed
 */
router.post('/token/:tokenId/complete', async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;
    const { staffId, notes } = req.body;

    const token = await queueEngine.updateTokenStatus({
      tokenId,
      status: TokenStatus.COMPLETED,
      staffId,
      notes
    });

    res.json({
      success: true,
      token,
      message: 'Token completed successfully'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/staff/token/:tokenId/no-show
 * Mark token as no-show
 */
router.post('/token/:tokenId/no-show', async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;
    const { staffId, notes } = req.body;

    const token = await queueEngine.updateTokenStatus({
      tokenId,
      status: TokenStatus.NO_SHOW,
      staffId,
      notes: notes || 'Marked as no-show by staff'
    });

    res.json({
      success: true,
      token,
      message: 'Token marked as no-show'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/staff/token/:tokenId/transfer
 * Transfer token to another counter
 */
router.post('/token/:tokenId/transfer', async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;
    const { newCounterId, staffId } = req.body;

    if (!newCounterId || !staffId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const token = await queueEngine.transferToken(tokenId, newCounterId, staffId);

    res.json({
      success: true,
      token,
      message: 'Token transferred successfully'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/staff/counter/:counterId/current
 * Get current token being served at counter
 */
router.get('/counter/:counterId/current', async (req: Request, res: Response) => {
  try {
    const { counterId } = req.params;

    const { data: counter, error } = await supabaseAdmin
      .from('counters')
      .select(`
        *,
        current_token:tokens(*)
      `)
      .eq('id', counterId)
      .single();

    if (error || !counter) {
      return res.status(404).json({ error: 'Counter not found' });
    }

    res.json({ counter });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/staff/counter/:counterId/history
 * Get service history for a counter
 */
router.get('/counter/:counterId/history', async (req: Request, res: Response) => {
  try {
    const { counterId } = req.params;
    const { limit = 20 } = req.query;

    const { data: tokens, error } = await supabaseAdmin
      .from('tokens')
      .select(`
        *,
        service:services(name)
      `)
      .eq('counter_id', counterId)
      .in('status', [TokenStatus.COMPLETED, TokenStatus.NO_SHOW])
      .order('completed_at', { ascending: false })
      .limit(Number(limit));

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ tokens: tokens || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/staff/counters
 * Get all counters with their current status
 */
router.get('/counters', async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.query;

    let query = supabaseAdmin
      .from('counters')
      .select(`
        *,
        service:services(*),
        current_token:tokens(*),
        staff:users(name, email)
      `)
      .eq('is_active', true);

    if (serviceId) {
      query = query.eq('service_id', serviceId);
    }

    const { data: counters, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ counters: counters || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/staff/counter/:counterId/status
 * Update counter active status
 */
router.put('/counter/:counterId/status', async (req: Request, res: Response) => {
  try {
    const { counterId } = req.params;
    const { isActive, staffId } = req.body;

    const { data: counter, error } = await supabaseAdmin
      .from('counters')
      .update({
        is_active: isActive,
        staff_id: isActive ? staffId : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', counterId)
      .select()
      .single();

    if (error || !counter) {
      return res.status(404).json({ error: 'Counter not found' });
    }

    res.json({
      success: true,
      counter,
      message: `Counter ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
