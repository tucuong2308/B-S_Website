/**
 * Custom Hooks for API calls
 * Reusable hooks để gọi API một cách dễ dàng
 */

import { useState, useCallback, useEffect } from 'react';
import { apiClient, ApiResponse } from './api-client';

export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute?: () => Promise<void>;
}

/**
 * Hook để fetch dữ liệu từ API
 */
export function useFetch<T = any>(endpoint: string, deps: any[] = []) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const response = await apiClient.get<T>(endpoint);
      if (response.success) {
        setState({ data: response.data ?? null, loading: false, error: null });
      } else {
        setState({
          data: null,
          loading: false,
          error: response.error || 'Unknown error',
        });
      }
    } catch (error: any) {
      setState({
        data: null,
        loading: false,
        error: error.message || 'Failed to fetch',
      });
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();
  }, deps.length > 0 ? [endpoint, ...deps] : [endpoint]);

  return { ...state, refetch: fetchData };
}

/**
 * Hook để POST dữ liệu
 */
export function usePost<T = any>(endpoint: string) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (payload: any) => {
      setState({ data: null, loading: true, error: null });
      try {
        const response = await apiClient.post<T>(endpoint, payload);
        if (response.success) {
          setState({ data: response.data ?? null, loading: false, error: null });
        } else {
          setState({
            data: null,
            loading: false,
            error: response.error || 'Unknown error',
          });
        }
      } catch (error: any) {
        setState({
          data: null,
          loading: false,
          error: error.message || 'Failed to post',
        });
      }
    },
    [endpoint]
  );

  return { ...state, execute };
}

/**
 * Hook để PUT dữ liệu
 */
export function usePut<T = any>(endpoint: string) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (payload: any) => {
      setState({ data: null, loading: true, error: null });
      try {
        const response = await apiClient.put<T>(endpoint, payload);
        if (response.success) {
          setState({ data: response.data ?? null, loading: false, error: null });
        } else {
          setState({
            data: null,
            loading: false,
            error: response.error || 'Unknown error',
          });
        }
      } catch (error: any) {
        setState({
          data: null,
          loading: false,
          error: error.message || 'Failed to update',
        });
      }
    },
    [endpoint]
  );

  return { ...state, execute };
}

/**
 * Hook để DELETE dữ liệu
 */
export function useDelete<T = any>(endpoint: string) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const response = await apiClient.delete<T>(endpoint);
      if (response.success) {
        setState({ data: response.data ?? null, loading: false, error: null });
      } else {
        setState({
          data: null,
          loading: false,
          error: response.error || 'Unknown error',
        });
      }
    } catch (error: any) {
      setState({
        data: null,
        loading: false,
        error: error.message || 'Failed to delete',
      });
    }
  }, [endpoint]);

  return { ...state, execute };
}
