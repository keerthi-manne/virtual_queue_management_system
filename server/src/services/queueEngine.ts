/**
 * Queue Engine - Core Business Logic
 * Handles multi-service queues, priority ordering, and token management
 */

import { supabaseAdmin } from '../config/supabase';
import { 
  Token, 
  TokenStatus, 
  Priority, 
  CreateTokenRequest, 
  CallNextTokenRequest,
  UpdateTokenStatusRequest,
  QueueStats
} from '../models/queue.model';
import { v4 as uuidv4 } from 'uuid';
import { notifyQueueUpdate, notifyTokenUpdate } from './socketService';
import { predictWaitTime } from './mlService';
import { notificationService } from './notification.service';

/**
 * Priority weights for queue ordering
 * Higher weight = higher priority
 */
const PRIORITY_WEIGHTS = {
  [Priority.EMERGENCY]: 1000,
  [Priority.DISABLED]: 100,
  [Priority.SENIOR]: 50,
  [Priority.NORMAL]: 1
};

/**
 * No-show timeout in minutes
 */
const NO_SHOW_TIMEOUT_MINUTES = 5;

export class QueueEngine {
  /**
   * Generate unique token number
   * Format: S{serviceId}-{sequence}
   */
  private async generateTokenLabel(serviceId: string): Promise<string> {
    const { data: service } = await supabaseAdmin
      .from('services')
      .select('name')
      .eq('id', serviceId)
      .single();

    // Get the highest token number for this service (not just today's)
    const { data: latestToken } = await supabaseAdmin
      .from('tokens')
      .select('token_label')
      .eq('service_id', serviceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let sequence = 1;
    if (latestToken?.token_label) {
      // Extract number from token_label (e.g., "DRI-0001" -> 1)
      const match = latestToken.token_label.match(/(\d+)$/);
      if (match) {
        sequence = parseInt(match[1], 10) + 1;
      }
    }

    const serviceCode = service?.name.substring(0, 3).toUpperCase() || 'SRV';
    
    return `${serviceCode}-${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Calculate queue position based on priority and arrival time
   */
  private calculateQueuePosition(priority: Priority, createdAt: Date, existingTokens: Token[]): number {
    const priorityWeight = PRIORITY_WEIGHTS[priority];
    const createdTime = createdAt.getTime();

    // Count tokens that should be ahead of this one
    let position = 1;
    
    for (const token of existingTokens) {
      const tokenWeight = PRIORITY_WEIGHTS[token.priority];
      const tokenTime = new Date(token.created_at).getTime();

      // Token is ahead if:
      // 1. Higher priority, OR
      // 2. Same priority but created earlier
      if (tokenWeight > priorityWeight || 
          (tokenWeight === priorityWeight && tokenTime < createdTime)) {
        position++;
      }
    }

    return position;
  }

  /**
   * Create a new token and add to queue
   */
  async createToken(request: CreateTokenRequest): Promise<Token> {
    try {
      console.log('📝 Creating token with request:', {
        userId: request.userId,
        serviceId: request.serviceId,
        priority: request.priority
      });

      // Check if user already has an active token for this service
      const { data: existingActiveToken } = await supabaseAdmin
        .from('tokens')
        .select('*')
        .eq('citizen_id', request.userId)
        .eq('service_id', request.serviceId)
        .in('status', ['waiting', 'called', 'serving'])
        .single();

      if (existingActiveToken) {
        console.log('⚠️ User already has active token:', existingActiveToken.token_label);
        throw new Error(`You already have an active token (${existingActiveToken.token_label}) for this service. Please wait for your turn or complete your current token.`);
      }

      // Verify service exists
      const { data: service, error: serviceError } = await supabaseAdmin
        .from('services')
        .select('*')
        .eq('id', request.serviceId)
        .single();

      if (serviceError) {
        console.error('❌ Service query error:', serviceError);
        throw new Error(`Service lookup failed: ${serviceError.message}`);
      }

      if (!service) {
        console.error('❌ Service not found for ID:', request.serviceId);
        throw new Error('Service not found');
      }

      console.log('✅ Service found:', service.name);

      // Get existing waiting tokens for this service
      const { data: existingTokens } = await supabaseAdmin
        .from('tokens')
        .select('*')
        .eq('service_id', request.serviceId)
        .in('status', [TokenStatus.WAITING, TokenStatus.CALLED]);

      const tokenLabel = await this.generateTokenLabel(request.serviceId);
      const createdAt = new Date();
      const queuePosition = this.calculateQueuePosition(
        request.priority || Priority.NORMAL,
        createdAt,
        existingTokens || []
      );

      // Get estimated wait time from ML service or fallback calculation
      let estimatedWaitTime = 0;
      try {
        estimatedWaitTime = await predictWaitTime(request.serviceId, queuePosition);
      } catch (error) {
        // Fallback: simple calculation based on service handle time
        estimatedWaitTime = (service.average_service_time || service.base_handle_time || 10) * queuePosition;
      }

      // Insert token
      const tokenData = {
        id: uuidv4(),
        token_label: tokenLabel,
        citizen_id: request.userId,
        citizen_name: request.userInfo?.name || 'Anonymous',
        citizen_phone: request.userInfo?.phone || null,
        service_id: request.serviceId,
        status: TokenStatus.WAITING,
        priority: request.priority || Priority.NORMAL,
        position_in_queue: queuePosition,
        estimated_wait_minutes: Math.round(estimatedWaitTime),
        joined_at: createdAt.toISOString()
      };

      console.log('📤 Inserting token:', tokenData);

      const { data: token, error: tokenError } = await supabaseAdmin
        .from('tokens')
        .insert(tokenData)
        .select()
        .single();

      if (tokenError) {
        console.error('❌ Token insert error:', tokenError);
        throw new Error(`Failed to create token: ${tokenError.message}`);
      }

      if (!token) {
        console.error('❌ No token returned after insert');
        throw new Error('Failed to create token: No data returned');
      }

      console.log('✅ Token created successfully:', token.id);

      // Calculate and add estimated wait time to response
      const avgServiceTime = service.average_service_time || service.base_handle_time || 10;
      const waitTime = avgServiceTime * queuePosition;
      token.estimated_wait_time = waitTime;
      console.log(`📊 Estimated wait time calculated: ${waitTime} minutes (${avgServiceTime} min/token × ${queuePosition} position)`);

      // Log event
      await this.logQueueEvent({
        token_id: token.id,
        event_type: 'token_created',
        new_status: TokenStatus.WAITING,
        timestamp: new Date().toISOString()
      });

      // Update queue positions for other tokens
      await this.recalculateQueuePositions(request.serviceId);

      // Notify via Socket.IO
      notifyQueueUpdate(request.serviceId);
      notifyTokenUpdate(token.id, token);

      // Send token creation notification
      try {
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('id', request.userId)
          .single();

        if (user) {
          await notificationService.notifyTokenCreated(user.id, token.id, {
            tokenLabel: token.token_label,
            position: queuePosition,
            estimatedWait: waitTime,
            serviceName: service.name,
            officeName: 'Main Municipal Office'
          });
        }
      } catch (notifError) {
        console.error('Failed to send token creation notification:', notifError);
      }

      return token;
    } catch (error) {
      console.error('Error creating token:', error);
      throw error;
    }
  }

  /**
   * Call next token in queue for a specific counter
   */
  async callNextToken(request: CallNextTokenRequest): Promise<Token | null> {
    try {
      // Get counter details
      const { data: counter, error: counterError } = await supabaseAdmin
        .from('counters')
        .select('*, service:services(*)')
        .eq('id', request.counterId)
        .eq('is_active', true)
        .single();

      if (counterError || !counter) {
        throw new Error('Counter not found or inactive');
      }

      // Get next waiting token for this service (highest priority first)
      const { data: nextToken, error: tokenError } = await supabaseAdmin
        .from('tokens')
        .select('*')
        .eq('service_id', counter.service_id)
        .eq('status', TokenStatus.WAITING)
        .order('queue_position', { ascending: true })
        .limit(1)
        .single();

      if (tokenError || !nextToken) {
        return null; // No tokens waiting
      }

      // Update token status
      const { data: updatedToken, error: updateError } = await supabaseAdmin
        .from('tokens')
        .update({
          status: TokenStatus.CALLED,
          counter_id: request.counterId,
          called_at: new Date().toISOString()
        })
        .eq('id', nextToken.id)
        .select()
        .single();

      if (updateError || !updatedToken) {
        throw new Error('Failed to update token');
      }

      // Update counter
      await supabaseAdmin
        .from('counters')
        .update({
          current_token_id: updatedToken.id,
          staff_id: request.staffId
        })
        .eq('id', request.counterId);

      // Log event
      await this.logQueueEvent({
        token_id: updatedToken.id,
        event_type: 'token_called',
        old_status: TokenStatus.WAITING,
        new_status: TokenStatus.CALLED,
        staff_id: request.staffId,
        counter_id: request.counterId,
        timestamp: new Date().toISOString()
      });

      // Start no-show timer
      this.startNoShowTimer(updatedToken.id);

      // Notify via Socket.IO
      notifyQueueUpdate(counter.service_id);
      notifyTokenUpdate(updatedToken.id, updatedToken);

      // Send notification to user (email + SMS + WhatsApp)
      try {
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('id', updatedToken.citizen_id)
          .single();

        if (user) {
          await notificationService.notifyYourTurn(user.id, updatedToken.id, {
            tokenLabel: updatedToken.token_label,
            counterNumber: counter.counter_number || 'N/A',
            serviceName: counter.service?.name || 'Service',
            officeName: 'Main Municipal Office'
          });
        }
      } catch (notifError) {
        console.error('Failed to send token called notification:', notifError);
      }

      return updatedToken;
    } catch (error) {
      console.error('Error calling next token:', error);
      throw error;
    }
  }

  /**
   * Update token status (serving, completed, no-show, etc.)
   */
  async updateTokenStatus(request: UpdateTokenStatusRequest): Promise<Token> {
    try {
      const { data: currentToken } = await supabaseAdmin
        .from('tokens')
        .select('*')
        .eq('id', request.tokenId)
        .single();

      if (!currentToken) {
        throw new Error('Token not found');
      }

      const updateData: any = {
        status: request.status,
        notes: request.notes
      };

      // Set timestamps based on status
      if (request.status === TokenStatus.SERVING) {
        updateData.serving_at = new Date().toISOString();
      } else if (request.status === TokenStatus.COMPLETED) {
        updateData.completed_at = new Date().toISOString();
        
        // Clear counter assignment
        if (currentToken.counter_id) {
          await supabaseAdmin
            .from('counters')
            .update({ current_token_id: null })
            .eq('id', currentToken.counter_id);
        }
      } else if (request.status === TokenStatus.NO_SHOW) {
        updateData.completed_at = new Date().toISOString();
        
        // Clear counter assignment
        if (currentToken.counter_id) {
          await supabaseAdmin
            .from('counters')
            .update({ current_token_id: null })
            .eq('id', currentToken.counter_id);
        }
      }

      if (request.counterId) {
        updateData.counter_id = request.counterId;
      }

      const { data: updatedToken, error } = await supabaseAdmin
        .from('tokens')
        .update(updateData)
        .eq('id', request.tokenId)
        .select()
        .single();

      if (error || !updatedToken) {
        throw new Error('Failed to update token status');
      }

      // Log event
      await this.logQueueEvent({
        token_id: request.tokenId,
        event_type: 'status_updated',
        old_status: currentToken.status,
        new_status: request.status,
        staff_id: request.staffId,
        counter_id: request.counterId,
        timestamp: new Date().toISOString()
      });

      // Recalculate queue positions
      await this.recalculateQueuePositions(currentToken.service_id);

      // Notify via Socket.IO
      notifyQueueUpdate(currentToken.service_id);
      notifyTokenUpdate(updatedToken.id, updatedToken);

      return updatedToken;
    } catch (error) {
      console.error('Error updating token status:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics for a service
   */
  async getQueueStats(serviceId: string): Promise<QueueStats> {
    try {
      // Get token counts by status
      const { data: tokens } = await supabaseAdmin
        .from('tokens')
        .select('*')
        .eq('service_id', serviceId)
        .gte('created_at', new Date().setHours(0, 0, 0, 0));

      const totalWaiting = tokens?.filter(t => t.status === TokenStatus.WAITING).length || 0;
      const totalServing = tokens?.filter(t => t.status === TokenStatus.SERVING).length || 0;
      const totalCompleted = tokens?.filter(t => t.status === TokenStatus.COMPLETED).length || 0;

      // Calculate average wait time from completed tokens
      const completedTokens = tokens?.filter(t => 
        t.status === TokenStatus.COMPLETED && t.called_at && t.completed_at
      ) || [];

      let averageWaitTime = 0;
      if (completedTokens.length > 0) {
        const totalWaitTime = completedTokens.reduce((sum, token) => {
          const waitTime = new Date(token.called_at!).getTime() - new Date(token.created_at).getTime();
          return sum + waitTime;
        }, 0);
        averageWaitTime = Math.round(totalWaitTime / completedTokens.length / 60000); // Convert to minutes
      }

      // Get active counters
      const { data: counters } = await supabaseAdmin
        .from('counters')
        .select('id')
        .eq('service_id', serviceId)
        .eq('is_active', true);

      const activeCounters = counters?.length || 0;

      // Estimate wait time for new token
      const { data: service } = await supabaseAdmin
        .from('services')
        .select('average_service_time')
        .eq('id', serviceId)
        .single();

      const avgServiceTime = service?.average_service_time || 10;
      const estimatedWaitTime = activeCounters > 0 
        ? Math.ceil((totalWaiting * avgServiceTime) / activeCounters)
        : totalWaiting * avgServiceTime;

      return {
        serviceId,
        totalWaiting,
        totalServing,
        totalCompleted,
        averageWaitTime,
        activeCounters,
        estimatedWaitTime
      };
    } catch (error) {
      console.error('Error getting queue stats:', error);
      throw error;
    }
  }

  /**
   * Recalculate queue positions for all waiting tokens
   */
  private async recalculateQueuePositions(serviceId: string): Promise<void> {
    try {
      const { data: waitingTokens } = await supabaseAdmin
        .from('tokens')
        .select('*')
        .eq('service_id', serviceId)
        .eq('status', TokenStatus.WAITING)
        .order('created_at', { ascending: true });

      if (!waitingTokens || waitingTokens.length === 0) return;

      // Sort by priority weight and creation time
      const sortedTokens = waitingTokens.sort((a, b) => {
        const aWeight = PRIORITY_WEIGHTS[a.priority as Priority];
        const bWeight = PRIORITY_WEIGHTS[b.priority as Priority];
        
        if (aWeight !== bWeight) {
          return bWeight - aWeight; // Higher priority first
        }
        
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      // Update positions
      for (let i = 0; i < sortedTokens.length; i++) {
        await supabaseAdmin
          .from('tokens')
          .update({ queue_position: i + 1 })
          .eq('id', sortedTokens[i].id);
      }
    } catch (error) {
      console.error('Error recalculating queue positions:', error);
    }
  }

  /**
   * Start no-show timer for a called token
   */
  private startNoShowTimer(tokenId: string): void {
    setTimeout(async () => {
      try {
        const { data: token } = await supabaseAdmin
          .from('tokens')
          .select('*')
          .eq('id', tokenId)
          .single();

        // If still in CALLED status after timeout, mark as no-show
        if (token && token.status === TokenStatus.CALLED) {
          await this.updateTokenStatus({
            tokenId,
            status: TokenStatus.NO_SHOW,
            notes: 'Automatic no-show after timeout'
          });
        }
      } catch (error) {
        console.error('Error in no-show timer:', error);
      }
    }, NO_SHOW_TIMEOUT_MINUTES * 60 * 1000);
  }

  /**
   * Log queue event for analytics
   */
  private async logQueueEvent(event: any): Promise<void> {
    try {
      await supabaseAdmin
        .from('queue_events')
        .insert({
          id: uuidv4(),
          ...event
        });
    } catch (error) {
      console.error('Error logging queue event:', error);
    }
  }

  /**
   * Transfer token to another counter
   */
  async transferToken(tokenId: string, newCounterId: string, staffId: string): Promise<Token> {
    try {
      const { data: token } = await supabaseAdmin
        .from('tokens')
        .select('*')
        .eq('id', tokenId)
        .single();

      if (!token) {
        throw new Error('Token not found');
      }

      // Clear old counter
      if (token.counter_id) {
        await supabaseAdmin
          .from('counters')
          .update({ current_token_id: null })
          .eq('id', token.counter_id);
      }

      // Update token with new counter
      const { data: updatedToken, error } = await supabaseAdmin
        .from('tokens')
        .update({
          counter_id: newCounterId,
          status: TokenStatus.CALLED
        })
        .eq('id', tokenId)
        .select()
        .single();

      if (error || !updatedToken) {
        throw new Error('Failed to transfer token');
      }

      // Update new counter
      await supabaseAdmin
        .from('counters')
        .update({
          current_token_id: tokenId,
          staff_id: staffId
        })
        .eq('id', newCounterId);

      // Log event
      await this.logQueueEvent({
        token_id: tokenId,
        event_type: 'token_transferred',
        staff_id: staffId,
        counter_id: newCounterId,
        timestamp: new Date().toISOString(),
        metadata: { old_counter_id: token.counter_id }
      });

      // Notify via Socket.IO
      notifyQueueUpdate(token.service_id);
      notifyTokenUpdate(tokenId, updatedToken);

      return updatedToken;
    } catch (error) {
      console.error('Error transferring token:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const queueEngine = new QueueEngine();
