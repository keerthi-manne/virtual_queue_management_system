import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { User, UserRole } from '@/types/database';

export function useUserRole() {
  const { user: authUser, loading: authLoading } = useAuth();
  const [userRecord, setUserRecord] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserRecord = useCallback(async () => {
    if (!authUser) {
      setUserRecord(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      if (error) throw error;
      setUserRecord(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user record');
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    if (!authLoading) {
      fetchUserRecord();
    }
  }, [authLoading, fetchUserRecord]);

  const isRole = (role: UserRole) => userRecord?.role === role;

  return {
    userRecord,
    loading: authLoading || loading,
    error,
    isUser: isRole('USER'),
    isStaff: isRole('STAFF'),
    isAdmin: isRole('ADMIN'),
    role: userRecord?.role || null,
    refetch: fetchUserRecord,
  };
}

export function useRequireRole(requiredRole: UserRole | UserRole[]) {
  const { userRecord, loading, error, role } = useUserRole();
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  const hasAccess = role ? roles.includes(role) : false;

  return {
    userRecord,
    loading,
    error,
    hasAccess,
    role,
  };
}
