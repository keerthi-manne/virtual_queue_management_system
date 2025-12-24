export type Priority = 'NORMAL' | 'SENIOR' | 'DISABLED' | 'EMERGENCY';
export type TokenStatus = 'WAITING' | 'CALLED' | 'COMPLETED' | 'NO_SHOW';
export type UserRole = 'USER' | 'STAFF' | 'ADMIN';

export interface Office {
  id: string;
  name: string;
  address?: string;
  created_at: string;
}

export interface Service {
  id: string;
  office_id: string;
  name: string;
  description?: string;
  base_handle_time: number;
  created_at: string;
}

export interface Counter {
  id: string;
  office_id: string;
  service_id?: string;
  name: string;
  is_active: boolean;
  current_operator_id?: string;
  created_at: string;
}

export interface Token {
  id: string;
  token_label: string;
  service_id: string;
  citizen_id?: string;
  citizen_name: string;
  citizen_phone?: string;
  priority: Priority;
  status: TokenStatus;
  counter_id?: string;
  joined_at: string;
  called_at?: string;
  completed_at?: string;
  estimated_wait_minutes?: number;
  position_in_queue?: number;
}

export interface User {
  id: string;
  auth_user_id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  office_id?: string;
  created_at: string;
}

export interface MetricsCache {
  id: string;
  office_id: string;
  date: string;
  total_tokens: number;
  completed_tokens: number;
  avg_wait_time: number;
  avg_handle_time: number;
  peak_hour: number;
  tokens_by_service: Record<string, number>;
  tokens_by_priority: Record<string, number>;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      offices: {
        Row: Office;
        Insert: Partial<Office> & { name: string };
        Update: Partial<Office>;
      };
      services: {
        Row: Service;
        Insert: Partial<Service> & { office_id: string; name: string; base_handle_time: number };
        Update: Partial<Service>;
      };
      counters: {
        Row: Counter;
        Insert: Partial<Counter> & { office_id: string; name: string };
        Update: Partial<Counter>;
      };
      tokens: {
        Row: Token;
        Insert: Partial<Token> & { token_label: string; service_id: string; citizen_name: string; priority: Priority; status: TokenStatus; joined_at: string };
        Update: Partial<Token>;
      };
      users: {
        Row: User;
        Insert: Partial<User> & { email: string; name: string; role: 'admin' | 'operator' | 'citizen' };
        Update: Partial<User>;
      };
      metrics_cache: {
        Row: MetricsCache;
        Insert: Partial<MetricsCache> & { office_id: string; date: string };
        Update: Partial<MetricsCache>;
      };
    };
  };
}
