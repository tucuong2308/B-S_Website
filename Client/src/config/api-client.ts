/**
 * API Client
 * Quản lý HTTP requests đến backend với error handling, retry logic, etc.
 */

import { BACKEND_CONFIG } from './backend.config';
import { API_ENDPOINTS } from './endpoints';

export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status?: number;
}

class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private defaultHeaders: Record<string, string>;

  constructor() {
    this.baseUrl = BACKEND_CONFIG.BASE_URL;
    this.timeout = BACKEND_CONFIG.TIMEOUT;
    this.defaultHeaders = BACKEND_CONFIG.DEFAULT_HEADERS;
  }

  /**
   * Thực hiện request với retry logic
   */
  private async requestWithRetry(
    url: string,
    config: RequestConfig,
    attempt: number = 1
  ): Promise<Response> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...config,
        headers: {
          ...this.defaultHeaders,
          ...config.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(0);

      // Retry logic
      const maxRetries = config.retries ?? BACKEND_CONFIG.RETRY.maxAttempts;
      if (
        BACKEND_CONFIG.RETRY.enabled &&
        attempt < maxRetries &&
        (error.name === 'AbortError' || error.message?.includes('network'))
      ) {
        await new Promise((resolve) =>
          setTimeout(resolve, BACKEND_CONFIG.RETRY.delayMs * attempt)
        );
        return this.requestWithRetry(url, config, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Generic request method
   */
  async request<T = any>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const method = config.method || 'GET';

    try {
      const response = await this.requestWithRetry(url, { ...config, method });

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      let data: any;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        return {
          success: false,
          error: data?.error || data?.message || `HTTP ${response.status}`,
          message: data?.message,
          status: response.status,
        };
      }

      return {
        success: true,
        data: data?.data || data,
        message: data?.message,
        status: response.status,
      };
    } catch (error: any) {
      console.error(`API Error [${method} ${endpoint}]:`, error);

      const isFailedToFetch = error?.message === 'Failed to fetch';
      const networkErrorMessage = isFailedToFetch
        ? `Khong the ket noi toi backend ${this.baseUrl}. Kiem tra server/CORS hoac cap nhat VITE_API_BASE_URL neu URL backend da doi.`
        : error.message || 'Network error';

      return {
        success: false,
        error: networkErrorMessage,
        status: 0,
      };
    }
  }

  /**
   * GET request
   */
  get<T = any>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  /**
   * POST request
   */
  post<T = any>(
    endpoint: string,
    body?: any,
    headers?: Record<string, string>
  ) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      headers,
    });
  }

  /**
   * PUT request
   */
  put<T = any>(
    endpoint: string,
    body?: any,
    headers?: Record<string, string>
  ) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers,
    });
  }

  /**
   * DELETE request
   */
  delete<T = any>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }

  /**
   * PATCH request
   */
  patch<T = any>(
    endpoint: string,
    body?: any,
    headers?: Record<string, string>
  ) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers,
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class for testing
export default ApiClient;
