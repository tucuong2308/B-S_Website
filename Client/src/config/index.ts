/**
 * Configuration exports
 * Central point for importing all config-related functionality
 */

export { BACKEND_CONFIG, isBackendConfigured } from './backend.config';
export { API_ENDPOINTS, getEndpointUrl } from './endpoints';
export { apiClient, type RequestConfig, type ApiResponse } from './api-client';
export * from './hooks';
