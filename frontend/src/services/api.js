// frontend/src/services/api.js

import axios from 'axios';

// The backend runs on port 8000 by default.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  /**
   * Smart Donor Matching
   * POST /api/match
   */
  matchDonors: async (bloodGroup) => {
    const response = await apiClient.post('/api/match', { blood_group: bloodGroup });
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
};

export default api;
