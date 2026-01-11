/**
 * Socket.IO Service - Real-time Updates
 * Manages WebSocket connections and broadcasts queue updates
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { supabaseAdmin } from '../config/supabase';

let io: SocketIOServer;

/**
 * Initialize Socket.IO service
 */
export function initSocketService(socketIO: SocketIOServer): void {
  io = socketIO;

  io.on('connection', (socket: Socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    // Join service-specific room
    socket.on('join-service', (serviceId: string) => {
      socket.join(`service:${serviceId}`);
      console.log(`Client ${socket.id} joined service room: ${serviceId}`);
    });

    // Leave service room
    socket.on('leave-service', (serviceId: string) => {
      socket.leave(`service:${serviceId}`);
      console.log(`Client ${socket.id} left service room: ${serviceId}`);
    });

    // Join token-specific room (for tracking individual tokens)
    socket.on('track-token', (tokenId: string) => {
      socket.join(`token:${tokenId}`);
      console.log(`Client ${socket.id} tracking token: ${tokenId}`);
    });

    // Stop tracking token
    socket.on('untrack-token', (tokenId: string) => {
      socket.leave(`token:${tokenId}`);
      console.log(`Client ${socket.id} stopped tracking token: ${tokenId}`);
    });

    // Join counter room (for staff)
    socket.on('join-counter', (counterId: string) => {
      socket.join(`counter:${counterId}`);
      console.log(`Client ${socket.id} joined counter room: ${counterId}`);
    });

    // Heartbeat
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });
}

/**
 * Notify all clients subscribed to a service about queue updates
 */
export function notifyQueueUpdate(serviceId: string, data?: any): void {
  if (!io) return;
  
  io.to(`service:${serviceId}`).emit('queue-update', {
    serviceId,
    timestamp: new Date().toISOString(),
    ...data
  });
}

/**
 * Notify clients tracking a specific token
 */
export function notifyTokenUpdate(tokenId: string, tokenData: any): void {
  if (!io) return;
  
  io.to(`token:${tokenId}`).emit('token-update', {
    tokenId,
    token: tokenData,
    timestamp: new Date().toISOString()
  });
}

/**
 * Notify counter staff about new token assignment
 */
export function notifyCounterUpdate(counterId: string, data: any): void {
  if (!io) return;
  
  io.to(`counter:${counterId}`).emit('counter-update', {
    counterId,
    timestamp: new Date().toISOString(),
    ...data
  });
}

/**
 * Broadcast announcement to all connected clients
 */
export function broadcastAnnouncement(message: string, type: 'info' | 'warning' | 'success' = 'info'): void {
  if (!io) return;
  
  io.emit('announcement', {
    message,
    type,
    timestamp: new Date().toISOString()
  });
}

/**
 * Send notification to specific user
 */
export function notifyUser(userId: string, notification: any): void {
  if (!io) return;
  
  io.to(`user:${userId}`).emit('notification', {
    ...notification,
    timestamp: new Date().toISOString()
  });
}

export { io };
