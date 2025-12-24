import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Office, Service, Token, Counter, MetricsCache } from '@/types/database';

const REFRESH_INTERVAL = 5000; // 5 seconds

export function useOffices() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOffices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('offices')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setOffices(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch offices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOffices();
  }, [fetchOffices]);

  return { offices, loading, error, refetch: fetchOffices };
}

export function useServices(officeId?: string) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    if (!officeId) {
      setServices([]);
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('office_id', officeId)
        .order('name');
      
      if (error) throw error;
      setServices(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch services');
    } finally {
      setLoading(false);
    }
  }, [officeId]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return { services, loading, error, refetch: fetchServices };
}

export function useTokens(serviceId?: string, status?: string) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    try {
      let query = supabase
        .from('tokens')
        .select(`
          *,
          counters(id, counter_number, office_id, service_id)
        `);
      
      if (serviceId) {
        query = query.eq('service_id', serviceId);
      }
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query.order('joined_at', { ascending: true });
      
      if (error) throw error;
      setTokens(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tokens');
    } finally {
      setLoading(false);
    }
  }, [serviceId, status]);

  useEffect(() => {
    fetchTokens();
    const interval = setInterval(fetchTokens, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchTokens]);

  return { tokens, loading, error, refetch: fetchTokens };
}

export function useToken(tokenId?: string) {
  const [token, setToken] = useState<Token | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = useCallback(async () => {
    if (!tokenId) {
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tokens')
        .select('*')
        .eq('id', tokenId)
        .maybeSingle();
      
      if (error) throw error;
      setToken(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch token');
    } finally {
      setLoading(false);
    }
  }, [tokenId]);

  useEffect(() => {
    fetchToken();
    const interval = setInterval(fetchToken, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchToken]);

  return { token, loading, error, refetch: fetchToken };
}

export function useCounters(officeId?: string) {
  const [counters, setCounters] = useState<Counter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCounters = useCallback(async () => {
    try {
      let query = supabase.from('counters').select('*');
      
      if (officeId) {
        query = query.eq('office_id', officeId);
      }
      
      const { data, error } = await query.order('counter_number');
      
      if (error) throw error;
      setCounters(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch counters');
    } finally {
      setLoading(false);
    }
  }, [officeId]);

  useEffect(() => {
    fetchCounters();
    const interval = setInterval(fetchCounters, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchCounters]);

  return { counters, loading, error, refetch: fetchCounters };
}

export function useMetrics(officeId?: string, date?: string) {
  const [metrics, setMetrics] = useState<MetricsCache | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      let query = supabase.from('metrics_cache').select('*');
      
      if (officeId) {
        query = query.eq('office_id', officeId);
      }
      
      if (date) {
        query = query.eq('date', date);
      }
      
      const { data, error } = await query.order('date', { ascending: false }).limit(1).maybeSingle();
      
      if (error) throw error;
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  }, [officeId, date]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, REFRESH_INTERVAL * 2);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  return { metrics, loading, error, refetch: fetchMetrics };
}

// Priority order for sorting
const PRIORITY_ORDER: Record<string, number> = {
  EMERGENCY: 0,
  DISABLED: 1,
  SENIOR: 2,
  NORMAL: 3,
};

export function sortTokensByPriority(tokens: Token[]): Token[] {
  return [...tokens].sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
  });
}
