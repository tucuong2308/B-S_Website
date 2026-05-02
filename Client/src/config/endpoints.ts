/**
 * API Endpoints Configuration
 * Tập trung quản lý tất cả các endpoint của backend
 */

export const API_ENDPOINTS = {
  // Projects
  PROJECTS: {
    LIST: '/projects',
    DETAIL: (id: string) => `/projects/${id}`,
    CREATE: '/projects',
    UPDATE: (id: string) => `/projects/${id}`,
    DELETE: (id: string) => `/projects/${id}`,
    SEARCH: '/projects/search',
    FILTER: '/projects/filter',
  },

  // Homes
  HOMES: {
    NEARBY_AVERAGE_PRICE_PER_M2_BY_ADDRESS:
      'api/v1/price/by-address',
  },

  // Choropleth Map
  MAP: {
    PROVINCES: '/api/v1/map/provinces',
    DISTRICTS: (province_name: string) => `/api/v1/map/districts?province_name=${encodeURIComponent(province_name)}`,
    WARDS: (district_name: string) => `/api/v1/map/wards?district_name=${encodeURIComponent(district_name)}`,
    DETAIL: (name: string) => `/api/v1/map/detail?name=${encodeURIComponent(name)}`,
  },

  // Property Valuation
  VALUATION: {
    CALCULATE: '/valuation/calculate',
    HISTORY: '/valuation/history',
    ESTIMATE: '/valuation/estimate',
  },

  // Real Estate Agents
  AGENTS: {
    LIST: '/agents',
    DETAIL: (id: string) => `/agents/${id}`,
  },

  // Market Data
  MARKET: {
    TRENDS: '/market/trends',
    STATS: '/market/stats',
    PRICES: '/market/prices',
  },

  // User
  USER: {
    PROFILE: '/user/profile',
    SETTINGS: '/user/settings',
    SAVED_PROJECTS: '/user/saved-projects',
  },

  // Auth (if needed in future)
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
  },
} as const;

// Helper function để lấy full URL
export const getEndpointUrl = (endpoint: string): string => {
  const { BACKEND_CONFIG } = require('./backend.config');
  return `${BACKEND_CONFIG.BASE_URL}${endpoint}`;
};

