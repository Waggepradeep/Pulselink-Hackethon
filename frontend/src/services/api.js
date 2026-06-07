// frontend/src/services/api.js

import axios from 'axios';

// The backend runs on port 8000 by default.
const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true'
  },
});

export const api = {
  /**
   * Smart Donor Matching
   * POST /api/match
   */
  matchDonors: async (bloodGroup, latitude = null, longitude = null, urgency = null) => {
    const response = await apiClient.post('/api/match', { 
      blood_group: bloodGroup,
      latitude,
      longitude,
      urgency
    });
    return response.data;
  },

  /**
   * AI Outreach Assistant
   * POST /api/outreach
   */
  generateOutreach: async (userId) => {
    const response = await apiClient.post('/api/outreach', { user_id: userId });
    return response.data;
  },

  /**
   * Admin Analytics Dashboard
   * GET /api/stats
   */
  getStats: async () => {
    const response = await apiClient.get('/api/stats');
    return response.data;
  },

  /**
   * Donor Registration
   * POST /api/donors/register
   */
  registerDonor: async (donorData) => {
    const response = await apiClient.post('/api/donors/register', donorData);
    return response.data;
  },

  /**
   * Blood Request Creation
   * POST /api/requests/create
   */
  createBloodRequest: async (requestData) => {
    const response = await apiClient.post('/api/requests/create', requestData);
    return response.data;
  },

  /**
   * Donor Opt-Out (Pause Donations)
   * POST /api/donors/opt-out
   */
  optOutDonor: async (userId, reason = '') => {
    const response = await apiClient.post('/api/donors/opt-out', { user_id: userId, reason });
    return response.data;
  },

  /**
   * Bulk Outreach
   * POST /api/outreach/bulk
   */
  bulkOutreach: async (userIds) => {
    const response = await apiClient.post('/api/outreach/bulk', { user_ids: userIds });
    return response.data;
  },

  /**
   * Update Donor Location
   * POST /api/donors/update-location
   */
  updateDonorLocation: async (userId, city, state) => {
    const response = await apiClient.post('/api/donors/update-location', { user_id: userId, city, state });
    return response.data;
  },

  /**
   * Get all blood requests
   * GET /api/requests
   */
  getRequests: async () => {
    const response = await apiClient.get('/api/requests');
    return response.data;
  },

  /**
   * Update outreach response
   * PATCH /api/outreach/response
   */
  updateOutreachResponse: async (requestId, donorId, response) => {
    const response_data = await apiClient.patch('/api/outreach/response', {
      request_id: requestId,
      donor_id: donorId,
      response
    });
    return response_data.data;
  },

  /**
   * Escalate request
   * POST /api/requests/escalate
   */
  escalateRequest: async (requestId) => {
    const response = await apiClient.post('/api/requests/escalate', {
      request_id: requestId
    });
    return response.data;
  },
};

export default api;
