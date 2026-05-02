/**
 * Backend Configuration
 * Quản lý cấu hình kết nối với backend API
 */

export const BACKEND_CONFIG = {
  // Base URL cho backend. Co the override qua VITE_API_BASE_URL de tranh hardcode tunnel tam thoi.
  BASE_URL:
    import.meta.env.VITE_API_BASE_URL?.trim() ||
    'https://cleverish-kiera-commonplacely.ngrok-free.dev/',
  
  // Timeout cho requests (ms)
  TIMEOUT: 30000,
  
  // Retry configuration
  RETRY: {
    enabled: true,
    maxAttempts: 3,
    delayMs: 1000,
  },
  
  // Headers mặc định
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
} as const;

// Validate backend URL
export const isBackendConfigured = (): boolean => {
  return BACKEND_CONFIG.BASE_URL.length > 0 && !BACKEND_CONFIG.BASE_URL.includes('YOUR_');
};
