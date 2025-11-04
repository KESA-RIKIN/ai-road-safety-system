/**
 * API Service
 * Handles all API communications with the backend
 */

import axios from 'axios';
import { StorageService } from './StorageService';

class ApiService {
  constructor() {
    this.baseURL = 'http://localhost:3000/api'; // Change to your backend URL
    this.client = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Create axios instance
      this.client = axios.create({
        baseURL: this.baseURL,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Add request interceptor
      this.client.interceptors.request.use(
        async (config) => {
          // Add auth token if available
          const token = await StorageService.getAuthToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          return config;
        },
        (error) => {
          return Promise.reject(error);
        }
      );

      // Add response interceptor
      this.client.interceptors.response.use(
        (response) => {
          return response;
        },
        async (error) => {
          if (error.response?.status === 401) {
            // Handle unauthorized access
            await this.handleUnauthorized();
          }
          return Promise.reject(error);
        }
      );

      this.isInitialized = true;
      console.log('API Service initialized successfully');

    } catch (error) {
      console.error('API Service initialization failed:', error);
      throw error;
    }
  }

  async handleUnauthorized() {
    try {
      // Clear stored auth token
      await StorageService.removeAuthToken();
      
      // You might want to redirect to login screen here
      console.log('User session expired, please login again');
      
    } catch (error) {
      console.error('Failed to handle unauthorized access:', error);
    }
  }

  isReady() {
    return this.isInitialized && this.client !== null;
  }

  // Hazard API methods
  async getHazards(params = {}) {
    try {
      const response = await this.client.get('/hazards', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get hazards:', error);
      throw error;
    }
  }

  async getHazardById(id) {
    try {
      const response = await this.client.get(`/hazards/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get hazard by ID:', error);
      throw error;
    }
  }

  async reportHazard(hazardData) {
    try {
      const response = await this.client.post('/hazards', hazardData);
      return response.data;
    } catch (error) {
      console.error('Failed to report hazard:', error);
      throw error;
    }
  }

  async updateHazard(id, updateData) {
    try {
      const response = await this.client.put(`/hazards/${id}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Failed to update hazard:', error);
      throw error;
    }
  }

  async addHazardFeedback(id, feedback) {
    try {
      const response = await this.client.post(`/hazards/${id}/feedback`, feedback);
      return response.data;
    } catch (error) {
      console.error('Failed to add hazard feedback:', error);
      throw error;
    }
  }

  async voteOnHazard(id, vote) {
    try {
      const response = await this.client.post(`/hazards/${id}/vote`, { vote });
      return response.data;
    } catch (error) {
      console.error('Failed to vote on hazard:', error);
      throw error;
    }
  }

  async getHazardStats(params = {}) {
    try {
      const response = await this.client.get('/hazards/stats/summary', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get hazard stats:', error);
      throw error;
    }
  }

  // Alert API methods
  async getAlerts(params = {}) {
    try {
      const response = await this.client.get('/alerts', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get alerts:', error);
      throw error;
    }
  }

  async getAlertById(id) {
    try {
      const response = await this.client.get(`/alerts/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get alert by ID:', error);
      throw error;
    }
  }

  async createAlert(alertData) {
    try {
      const response = await this.client.post('/alerts', alertData);
      return response.data;
    } catch (error) {
      console.error('Failed to create alert:', error);
      throw error;
    }
  }

  async acknowledgeAlert(id, action = 'none') {
    try {
      const response = await this.client.post(`/alerts/${id}/acknowledge`, { action });
      return response.data;
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      throw error;
    }
  }

  async dismissAlert(id) {
    try {
      const response = await this.client.post(`/alerts/${id}/dismiss`);
      return response.data;
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
      throw error;
    }
  }

  async getNearbyAlerts(lat, lng, radius = 0.5) {
    try {
      const response = await this.client.get('/alerts/nearby', {
        params: { lat, lng, radius }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get nearby alerts:', error);
      throw error;
    }
  }

  async testVoiceAlert(message, language = 'en', voice = 'default') {
    try {
      const response = await this.client.post('/alerts/test-voice', {
        message, language, voice
      });
      return response.data;
    } catch (error) {
      console.error('Failed to test voice alert:', error);
      throw error;
    }
  }

  async getAlertStats(params = {}) {
    try {
      const response = await this.client.get('/alerts/stats', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get alert stats:', error);
      throw error;
    }
  }

  // Map API methods
  async getMapHazards(params = {}) {
    try {
      const response = await this.client.get('/maps/hazards', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get map hazards:', error);
      throw error;
    }
  }

  async getHeatmapData(params = {}) {
    try {
      const response = await this.client.get('/maps/heatmap', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get heatmap data:', error);
      throw error;
    }
  }

  async getRoute(params = {}) {
    try {
      const response = await this.client.get('/maps/route', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get route:', error);
      throw error;
    }
  }

  async getNearbyPlaces(params = {}) {
    try {
      const response = await this.client.get('/maps/places', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get nearby places:', error);
      throw error;
    }
  }

  async geocodeAddress(address) {
    try {
      const response = await this.client.get('/maps/geocode', {
        params: { address }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to geocode address:', error);
      throw error;
    }
  }

  async reverseGeocode(lat, lng) {
    try {
      const response = await this.client.get('/maps/reverse-geocode', {
        params: { lat, lng }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to reverse geocode:', error);
      throw error;
    }
  }

  // Ticket API methods
  async getTickets(params = {}) {
    try {
      const response = await this.client.get('/tickets', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get tickets:', error);
      throw error;
    }
  }

  async getTicketById(id) {
    try {
      const response = await this.client.get(`/tickets/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get ticket by ID:', error);
      throw error;
    }
  }

  async createTicket(ticketData) {
    try {
      const response = await this.client.post('/tickets', ticketData);
      return response.data;
    } catch (error) {
      console.error('Failed to create ticket:', error);
      throw error;
    }
  }

  async createTicketFromHazard(hazardId, additionalData = {}) {
    try {
      const response = await this.client.post(`/tickets/from-hazard/${hazardId}`, additionalData);
      return response.data;
    } catch (error) {
      console.error('Failed to create ticket from hazard:', error);
      throw error;
    }
  }

  async updateTicketStatus(id, status, comment = '') {
    try {
      const response = await this.client.post(`/tickets/${id}/update-status`, {
        status, comment
      });
      return response.data;
    } catch (error) {
      console.error('Failed to update ticket status:', error);
      throw error;
    }
  }

  async addTicketFeedback(id, rating, comment = '') {
    try {
      const response = await this.client.post(`/tickets/${id}/feedback`, {
        rating, comment
      });
      return response.data;
    } catch (error) {
      console.error('Failed to add ticket feedback:', error);
      throw error;
    }
  }

  async getTicketStats(params = {}) {
    try {
      const response = await this.client.get('/tickets/stats/summary', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get ticket stats:', error);
      throw error;
    }
  }

  // User API methods
  async login(email, password) {
    try {
      const response = await this.client.post('/users/login', { email, password });
      return response.data;
    } catch (error) {
      console.error('Failed to login:', error);
      throw error;
    }
  }

  async register(userData) {
    try {
      const response = await this.client.post('/users/register', userData);
      return response.data;
    } catch (error) {
      console.error('Failed to register:', error);
      throw error;
    }
  }

  async getUserProfile() {
    try {
      const response = await this.client.get('/users/profile');
      return response.data;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw error;
    }
  }

  async updateUserProfile(profileData) {
    try {
      const response = await this.client.put('/users/profile', profileData);
      return response.data;
    } catch (error) {
      console.error('Failed to update user profile:', error);
      throw error;
    }
  }

  async updateUserPreferences(preferences) {
    try {
      const response = await this.client.put('/users/preferences', { preferences });
      return response.data;
    } catch (error) {
      console.error('Failed to update user preferences:', error);
      throw error;
    }
  }

  async registerDeviceToken(token, platform, appVersion) {
    try {
      const response = await this.client.post('/users/device-token', {
        token, platform, appVersion
      });
      return response.data;
    } catch (error) {
      console.error('Failed to register device token:', error);
      throw error;
    }
  }

  async getUserActivity(params = {}) {
    try {
      const response = await this.client.get('/users/activity', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get user activity:', error);
      throw error;
    }
  }

  async getUserStats(params = {}) {
    try {
      const response = await this.client.get('/users/stats', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get user stats:', error);
      throw error;
    }
  }

  async submitFeedback(feedbackData) {
    try {
      const response = await this.client.post('/users/feedback', feedbackData);
      return response.data;
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  // Generic request method
  async request(method, url, data = null, params = null) {
    try {
      const config = {
        method,
        url,
        params
      };

      if (data) {
        config.data = data;
      }

      const response = await this.client.request(config);
      return response.data;
    } catch (error) {
      console.error(`API request failed: ${method} ${url}`, error);
      throw error;
    }
  }
}

// Create singleton instance
const apiService = new ApiService();

export { ApiService };
export default apiService;
