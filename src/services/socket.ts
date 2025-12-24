/**
 * Socket.IO Client Service
 * Manages real-time WebSocket connections with the backend
 */

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  // Queue-specific methods
  joinService(serviceId: string): void {
    this.socket?.emit('join-service', serviceId);
  }

  leaveService(serviceId: string): void {
    this.socket?.emit('leave-service', serviceId);
  }

  trackToken(tokenId: string): void {
    this.socket?.emit('track-token', tokenId);
  }

  untrackToken(tokenId: string): void {
    this.socket?.emit('untrack-token', tokenId);
  }

  joinCounter(counterId: string): void {
    this.socket?.emit('join-counter', counterId);
  }

  // Event listeners
  onQueueUpdate(callback: (data: any) => void): void {
    this.socket?.on('queue-update', callback);
  }

  onTokenUpdate(callback: (data: any) => void): void {
    this.socket?.on('token-update', callback);
  }

  onCounterUpdate(callback: (data: any) => void): void {
    this.socket?.on('counter-update', callback);
  }

  onAnnouncement(callback: (data: any) => void): void {
    this.socket?.on('announcement', callback);
  }

  onNotification(callback: (data: any) => void): void {
    this.socket?.on('notification', callback);
  }

  // Remove event listeners
  offQueueUpdate(callback: (data: any) => void): void {
    this.socket?.off('queue-update', callback);
  }

  offTokenUpdate(callback: (data: any) => void): void {
    this.socket?.off('token-update', callback);
  }

  offCounterUpdate(callback: (data: any) => void): void {
    this.socket?.off('counter-update', callback);
  }

  offAnnouncement(callback: (data: any) => void): void {
    this.socket?.off('announcement', callback);
  }

  offNotification(callback: (data: any) => void): void {
    this.socket?.off('notification', callback);
  }
}

export const socketService = new SocketService();
export default socketService;
