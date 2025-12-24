/**
 * Queue Data Models
 * Defines TypeScript interfaces for queue management system
 */

export enum TokenStatus {
  WAITING = 'waiting',
  CALLED = 'called',
  SERVING = 'serving',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
  CANCELLED = 'cancelled'
}

export enum Priority {
  NORMAL = 'normal',
  SENIOR = 'senior',
  DISABLED = 'disabled',
  EMERGENCY = 'emergency'
}

export enum UserRole {
  USER = 'USER',
  STAFF = 'STAFF',
  ADMIN = 'ADMIN'
}

export interface Token {
  id: string;
  token_label: string;
  user_id: string;
  service_id: string;
  counter_id?: string;
  status: TokenStatus;
  priority: Priority;
  queue_position: number;
  estimated_wait_time?: number;
  created_at: string;
  called_at?: string;
  serving_at?: string;
  completed_at?: string;
  notes?: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  average_service_time: number; // in minutes
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Counter {
  id: string;
  counter_number: string;
  service_id: string;
  staff_id?: string;
  is_active: boolean;
  current_token_id?: string;
  created_at: string;
  updated_at: string;
}

export interface QueueEvent {
  id: string;
  token_id: string;
  event_type: string;
  old_status?: TokenStatus;
  new_status?: TokenStatus;
  staff_id?: string;
  counter_id?: string;
  timestamp: string;
  metadata?: any;
}

export interface QueueStats {
  serviceId: string;
  totalWaiting: number;
  totalServing: number;
  totalCompleted: number;
  averageWaitTime: number;
  activeCounters: number;
  estimatedWaitTime: number;
}

export interface CreateTokenRequest {
  userId: string;
  serviceId: string;
  priority?: Priority;
  userInfo?: {
    name: string;
    phone?: string;
    email?: string;
  };
}

export interface CallNextTokenRequest {
  counterId: string;
  staffId: string;
}

export interface UpdateTokenStatusRequest {
  tokenId: string;
  status: TokenStatus;
  counterId?: string;
  staffId?: string;
  notes?: string;
}
