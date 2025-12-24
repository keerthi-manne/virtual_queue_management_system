/**
 * Admin Routes
 * Handles administrative operations
 */

import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { queueEngine } from '../services/queueEngine';
import { v4 as uuidv4 } from 'uuid';
import { TokenStatus } from '../models/queue.model';

const router = Router();

/**
 * GET /api/admin/dashboard
 * Get dashboard overview with statistics
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const today = new Date().setHours(0, 0, 0, 0);

    // Get today's token counts
    const { data: todayTokens } = await supabaseAdmin
      .from('tokens')
      .select('status')
      .gte('created_at', new Date(today).toISOString());

    const stats = {
      totalToday: todayTokens?.length || 0,
      completed: todayTokens?.filter(t => t.status === TokenStatus.COMPLETED).length || 0,
      waiting: todayTokens?.filter(t => t.status === TokenStatus.WAITING).length || 0,
      serving: todayTokens?.filter(t => t.status === TokenStatus.SERVING).length || 0,
      noShow: todayTokens?.filter(t => t.status === TokenStatus.NO_SHOW).length || 0
    };

    // Get active services count
    const { count: activeServices } = await supabaseAdmin
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get active counters count
    const { count: activeCounters } = await supabaseAdmin
      .from('counters')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    res.json({
      stats,
      activeServices: activeServices || 0,
      activeCounters: activeCounters || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/services
 * Create a new service
 */
router.post('/services', async (req: Request, res: Response) => {
  try {
    const { name, description, averageServiceTime } = req.body;

    if (!name || !averageServiceTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: service, error } = await supabaseAdmin
      .from('services')
      .insert({
        id: uuidv4(),
        name,
        description,
        average_service_time: averageServiceTime,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error || !service) {
      return res.status(500).json({ error: 'Failed to create service' });
    }

    res.status(201).json({
      success: true,
      service,
      message: 'Service created successfully'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/admin/services/:serviceId
 * Update a service
 */
router.put('/services/:serviceId', async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;
    const { name, description, averageServiceTime, isActive } = req.body;

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (averageServiceTime !== undefined) updateData.average_service_time = averageServiceTime;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data: service, error } = await supabaseAdmin
      .from('services')
      .update(updateData)
      .eq('id', serviceId)
      .select()
      .single();

    if (error || !service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({
      success: true,
      service,
      message: 'Service updated successfully'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/services
 * Get all services
 */
router.get('/services', async (req: Request, res: Response) => {
  try {
    const { data: services, error } = await supabaseAdmin
      .from('services')
      .select('*')
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
 * POST /api/admin/counters
 * Create a new counter
 */
router.post('/counters', async (req: Request, res: Response) => {
  try {
    const { counterNumber, serviceId } = req.body;

    if (!counterNumber || !serviceId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: counter, error } = await supabaseAdmin
      .from('counters')
      .insert({
        id: uuidv4(),
        counter_number: counterNumber,
        service_id: serviceId,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error || !counter) {
      return res.status(500).json({ error: 'Failed to create counter' });
    }

    res.status(201).json({
      success: true,
      counter,
      message: 'Counter created successfully'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/admin/counters/:counterId
 * Update a counter
 */
router.put('/counters/:counterId', async (req: Request, res: Response) => {
  try {
    const { counterId } = req.params;
    const { counterNumber, serviceId, isActive } = req.body;

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (counterNumber !== undefined) updateData.counter_number = counterNumber;
    if (serviceId !== undefined) updateData.service_id = serviceId;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data: counter, error } = await supabaseAdmin
      .from('counters')
      .update(updateData)
      .eq('id', counterId)
      .select()
      .single();

    if (error || !counter) {
      return res.status(404).json({ error: 'Counter not found' });
    }

    res.json({
      success: true,
      counter,
      message: 'Counter updated successfully'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/counters
 * Get all counters
 */
router.get('/counters', async (req: Request, res: Response) => {
  try {
    const { data: counters, error } = await supabaseAdmin
      .from('counters')
      .select(`
        *,
        service:services(*)
      `)
      .order('counter_number', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ counters: counters || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/analytics
 * Get analytics data
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, serviceId } = req.query;

    let query = supabaseAdmin
      .from('tokens')
      .select('*');

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    if (serviceId) {
      query = query.eq('service_id', serviceId);
    }

    const { data: tokens, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Calculate analytics
    const completedTokens = tokens?.filter(t => 
      t.status === TokenStatus.COMPLETED && t.created_at && t.completed_at
    ) || [];

    const analytics = {
      totalTokens: tokens?.length || 0,
      completed: completedTokens.length,
      noShow: tokens?.filter(t => t.status === TokenStatus.NO_SHOW).length || 0,
      cancelled: tokens?.filter(t => t.status === TokenStatus.CANCELLED).length || 0,
      averageWaitTime: 0,
      averageServiceTime: 0,
      peakHours: [] as any[]
    };

    // Calculate average wait time (created to called)
    if (completedTokens.length > 0) {
      const totalWaitTime = completedTokens.reduce((sum, token) => {
        const wait = new Date(token.called_at!).getTime() - new Date(token.created_at).getTime();
        return sum + wait;
      }, 0);
      analytics.averageWaitTime = Math.round(totalWaitTime / completedTokens.length / 60000);

      // Calculate average service time (called to completed)
      const totalServiceTime = completedTokens.reduce((sum, token) => {
        const service = new Date(token.completed_at!).getTime() - new Date(token.called_at!).getTime();
        return sum + service;
      }, 0);
      analytics.averageServiceTime = Math.round(totalServiceTime / completedTokens.length / 60000);
    }

    // Calculate peak hours
    const hourCounts: Record<number, number> = {};
    tokens?.forEach(token => {
      const hour = new Date(token.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    analytics.peakHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json({ analytics });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/reports/service/:serviceId
 * Get detailed report for a service
 */
router.get('/reports/service/:serviceId', async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;
    const { date } = req.query;

    const targetDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999)).toISOString();

    const { data: tokens, error } = await supabaseAdmin
      .from('tokens')
      .select('*')
      .eq('service_id', serviceId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const stats = await queueEngine.getQueueStats(serviceId);

    res.json({
      date: targetDate.toISOString().split('T')[0],
      tokens: tokens || [],
      stats
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
