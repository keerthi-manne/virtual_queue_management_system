import { createClient } from '@supabase/supabase-js';

// Environment variables should be loaded by index.ts before this imports
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Log warning if not configured (but don't throw to allow module to load)
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Warning: Supabase environment variables not configured');
}

// Client for regular operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for service role operations
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey
);
