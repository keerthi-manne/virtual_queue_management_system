/**
 * Notification Service
 * Handles sending notifications via multiple channels
 */

import { Token, TokenStatus } from '../models/queue.model';
import { supabaseAdmin } from '../config/supabase';
import { notifyUser } from './socketService';

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  data?: any;
}

/**
 * Send notification to user via Socket.IO and database
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  try {
    // Store in database for persistence
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: payload.userId,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        data: payload.data,
        is_read: false,
        created_at: new Date().toISOString()
      });

    // Send real-time notification via Socket.IO
    notifyUser(payload.userId, payload);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

/**
 * Notify user about token status change
 */
export async function notifyTokenStatusChange(token: Token, oldStatus: TokenStatus): Promise<void> {
  const messages: Record<TokenStatus, string> = {
    [TokenStatus.WAITING]: 'Your token is in the queue',
    [TokenStatus.CALLED]: '🔔 Your token is being called! Please proceed to the counter.',
    [TokenStatus.SERVING]: 'Your service is in progress',
    [TokenStatus.COMPLETED]: '✅ Your service has been completed. Thank you!',
    [TokenStatus.NO_SHOW]: 'Your token was marked as no-show',
    [TokenStatus.CANCELLED]: 'Your token has been cancelled'
  };

  await sendNotification({
    userId: token.user_id,
    title: `Token ${token.token_label}`,
    message: messages[token.status],
    type: token.status === TokenStatus.CALLED ? 'warning' : 'info',
    data: {
      tokenId: token.id,
      status: token.status,
      counterId: token.counter_id
    }
  });
}

/**
 * Send reminder notification when token is approaching
 */
export async function sendApproachingReminder(token: Token, positionsAway: number): Promise<void> {
  await sendNotification({
    userId: token.user_id,
    title: `Token ${token.token_label}`,
    message: `Your turn is approaching! ${positionsAway} token(s) ahead.`,
    type: 'info',
    data: {
      tokenId: token.id,
      positionsAway
    }
  });
}

/**
 * Bulk notify users about service disruption
 */
export async function notifyServiceDisruption(
  serviceId: string,
  message: string
): Promise<void> {
  try {
    const { data: affectedTokens } = await supabaseAdmin
      .from('tokens')
      .select('user_id, token_label')
      .eq('service_id', serviceId)
      .in('status', [TokenStatus.WAITING, TokenStatus.CALLED]);

    if (affectedTokens) {
      for (const token of affectedTokens) {
        await sendNotification({
          userId: token.user_id,
          title: 'Service Update',
          message,
          type: 'warning',
          data: { serviceId }
        });
      }
    }
  } catch (error) {
    console.error('Error notifying service disruption:', error);
  }
}
