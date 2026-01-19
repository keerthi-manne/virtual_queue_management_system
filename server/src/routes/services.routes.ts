import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

/**
 * GET /api/services
 * Get all services
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data: services, error } = await supabaseAdmin
      .from('services')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching services:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(services || []);
  } catch (error: any) {
    console.error('Error in /api/services:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
