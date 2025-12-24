/**
 * Queue Routes
 * Handles citizen-facing queue operations
 */

import { Router, Request, Response } from 'express';
import { queueEngine } from '../services/queueEngine';
import { Priority, TokenStatus } from '../models/queue.model';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

/**
 * POST /api/queue/join
 * Join a queue and get a token
 */
router.post('/join', async (req: Request, res: Response) => {
  try {
    const { userId, serviceId, priority, userInfo } = req.body;

    if (!userId || !serviceId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const token = await queueEngine.createToken({
      userId,
      serviceId,
      priority: priority || Priority.NORMAL,
      userInfo
    });

    res.status(201).json({
      success: true,
      token,
      message: 'Token created successfully'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/queue/token/:tokenId
 * Get token details
 */
router.get('/token/:tokenId', async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;
    console.log('🔍 Looking for token:', tokenId);

    // Check if it's a token label (A001 format OR TKN-XXX-YYY format) or UUID
    const isSimpleTokenLabel = /^[A-Z]\d+$/.test(tokenId);
    const isComplexTokenLabel = /^TKN-[A-Z0-9]+-[A-Z0-9]+$/.test(tokenId);
    const isTokenLabel = isSimpleTokenLabel || isComplexTokenLabel;
    
    console.log('📌 Token type:', isTokenLabel ? 'label' : 'UUID');
    
    let query = supabaseAdmin
      .from('tokens')
      .select(`
        *,
        services(id, name),
        counters(id, counter_number)
      `);

    if (isTokenLabel) {
      query = query.eq('token_label', tokenId);
    } else {
      query = query.eq('id', tokenId);
    }

    const { data: token, error } = await query.single();

    if (error || !token) {
      console.log('❌ Token not found:', error?.message || 'No data');
      return res.status(404).json({ error: 'Token not found' });
    }

    console.log('✅ Token found:', token.token_label);
    res.json(token);
  } catch (error: any) {
    console.error('💥 Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/queue/service/:serviceId
 * Get queue status for a service
 */
router.get('/service/:serviceId', async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;

    const { data: tokens, error } = await supabaseAdmin
      .from('tokens')
      .select('*')
      .eq('service_id', serviceId)
      .in('status', [TokenStatus.WAITING, TokenStatus.CALLED, TokenStatus.SERVING])
      .order('queue_position', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const stats = await queueEngine.getQueueStats(serviceId);

    res.json({
      tokens: tokens || [],
      stats
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/queue/stats/:serviceId
 * Get queue statistics
 */
router.get('/stats/:serviceId', async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;
    const stats = await queueEngine.getQueueStats(serviceId);
    res.json({ stats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/queue/cancel/:tokenId
 * Cancel a token
 */
router.post('/cancel/:tokenId', async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;
    const { userId } = req.body;

    // Verify token belongs to user
    const { data: token } = await supabaseAdmin
      .from('tokens')
      .select('*')
      .eq('id', tokenId)
      .eq('user_id', userId)
      .single();

    if (!token) {
      return res.status(404).json({ error: 'Token not found or unauthorized' });
    }

    if (token.status === TokenStatus.COMPLETED || token.status === TokenStatus.CANCELLED) {
      return res.status(400).json({ error: 'Token already finalized' });
    }

    const updatedToken = await queueEngine.updateTokenStatus({
      tokenId,
      status: TokenStatus.CANCELLED,
      notes: 'Cancelled by user'
    });

    res.json({
      success: true,
      token: updatedToken,
      message: 'Token cancelled successfully'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/queue/services
 * Get all active services
 */
router.get('/services', async (req: Request, res: Response) => {
  try {
    const { data: services, error } = await supabaseAdmin
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ services: services || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/queue/user/:userId/tokens
 * Get user's tokens (current and historical)
 */
router.get('/user/:userId/tokens', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { status, limit = 10 } = req.query;

    let query = supabaseAdmin
      .from('tokens')
      .select(`
        *,
        service:services(name),
        counter:counters(counter_number)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (status) {
      query = query.eq('status', status);
    }

    const { data: tokens, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ tokens: tokens || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
