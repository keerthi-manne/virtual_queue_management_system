/**
 * API Service
 * Handles all HTTP requests to the backend API
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - redirect to login
          localStorage.removeItem('access_token');
          window.location.href = '/auth';
        }
        return Promise.reject(error);
      }
    );
  }

  // Queue APIs
  async joinQueue(data: {
    userId: string;
    serviceId: string;
    priority?: string;
    userInfo?: any;
  }) {
    const response = await this.client.post('/queue/join', data);
    return response.data;
  }

  async getToken(tokenId: string) {
    const response = await this.client.get(`/queue/token/${tokenId}`);
    return response.data;
  }

  async getServiceQueue(serviceId: string) {
    const response = await this.client.get(`/queue/service/${serviceId}`);
    return response.data;
  }

  async getQueueStats(serviceId: string) {
    const response = await this.client.get(`/queue/stats/${serviceId}`);
    return response.data;
  }

  async cancelToken(tokenId: string, userId: string) {
    const response = await this.client.post(`/queue/cancel/${tokenId}`, { userId });
    return response.data;
  }

  async getServices() {
    const response = await this.client.get('/queue/services');
    return response.data;
  }

  async getUserTokens(userId: string, status?: string, limit?: number) {
    const response = await this.client.get(`/queue/user/${userId}/tokens`, {
      params: { status, limit },
    });
    return response.data;
  }

  async getTokenByNumber(tokenNumber: string) {
    const response = await this.client.get(`/queue/token/${tokenNumber}`);
    return response.data;
  }

  // Staff APIs
  async callNextToken(counterId: string, staffId: string) {
    const response = await this.client.post('/staff/call-next', {
      counterId,
      staffId,
    });
    return response.data;
  }

  async serveToken(tokenId: string, staffId: string, counterId: string) {
    const response = await this.client.post(`/staff/token/${tokenId}/serve`, {
      staffId,
      counterId,
    });
    return response.data;
  }

  async completeToken(tokenId: string, staffId: string, notes?: string) {
    const response = await this.client.post(`/staff/token/${tokenId}/complete`, {
      staffId,
      notes,
    });
    return response.data;
  }

  async markNoShow(tokenId: string, staffId: string, notes?: string) {
    const response = await this.client.post(`/staff/token/${tokenId}/no-show`, {
      staffId,
      notes,
    });
    return response.data;
  }

  async transferToken(tokenId: string, newCounterId: string, staffId: string) {
    const response = await this.client.post(`/staff/token/${tokenId}/transfer`, {
      newCounterId,
      staffId,
    });
    return response.data;
  }

  async getCurrentToken(counterId: string) {
    const response = await this.client.get(`/staff/counter/${counterId}/current`);
    return response.data;
  }

  async getCounterHistory(counterId: string, limit?: number) {
    const response = await this.client.get(`/staff/counter/${counterId}/history`, {
      params: { limit },
    });
    return response.data;
  }

  async getCounters(serviceId?: string) {
    const response = await this.client.get('/staff/counters', {
      params: { serviceId },
    });
    return response.data;
  }

  async updateCounterStatus(counterId: string, isActive: boolean, staffId?: string) {
    const response = await this.client.put(`/staff/counter/${counterId}/status`, {
      isActive,
      staffId,
    });
    return response.data;
  }

  // Admin APIs
  async getDashboard() {
    const response = await this.client.get('/admin/dashboard');
    return response.data;
  }

  async createService(data: {
    name: string;
    description?: string;
    averageServiceTime: number;
  }) {
    const response = await this.client.post('/admin/services', data);
    return response.data;
  }

  async updateService(
    serviceId: string,
    data: {
      name?: string;
      description?: string;
      averageServiceTime?: number;
      isActive?: boolean;
    }
  ) {
    const response = await this.client.put(`/admin/services/${serviceId}`, data);
    return response.data;
  }

  async getAllServices() {
    const response = await this.client.get('/admin/services');
    return response.data;
  }

  async createCounter(data: { counterNumber: string; serviceId: string }) {
    const response = await this.client.post('/admin/counters', data);
    return response.data;
  }

  async updateCounter(
    counterId: string,
    data: {
      counterNumber?: string;
      serviceId?: string;
      isActive?: boolean;
    }
  ) {
    const response = await this.client.put(`/admin/counters/${counterId}`, data);
    return response.data;
  }

  async getAllCounters() {
    const response = await this.client.get('/admin/counters');
    return response.data;
  }

  async getAnalytics(params?: {
    startDate?: string;
    endDate?: string;
    serviceId?: string;
  }) {
    const response = await this.client.get('/admin/analytics', { params });
    return response.data;
  }

  async getServiceReport(serviceId: string, date?: string) {
    const response = await this.client.get(`/admin/reports/service/${serviceId}`, {
      params: { date },
    });
    return response.data;
  }

  // Auth APIs
  async register(data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role?: string;
  }) {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    if (response.data.session?.access_token) {
      localStorage.setItem('access_token', response.data.session.access_token);
    }
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  async updateProfile(data: { name?: string; phone?: string }) {
    const response = await this.client.put('/auth/profile', data);
    return response.data;
  }

  async logout() {
    const response = await this.client.post('/auth/logout');
    localStorage.removeItem('access_token');
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;
