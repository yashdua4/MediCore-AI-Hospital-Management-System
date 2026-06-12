import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

// Access environmental host or default to current origin (works with Vite proxy)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Add access token to requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercept responses to handle 401 token renewals
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!error.response) {
      // Server is unreachable, trigger simulated mock response for demo
      return Promise.reject(error);
    }

    // Handle 401 errors
    if (error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Try hitting real endpoint
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const newAccessToken = response.data.accessToken;
        useAuthStore.getState().updateAccessToken(newAccessToken);

        processQueue(null, newAccessToken);
        isRefreshing = false;

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Fallback simulation in dev mode if auth routes are not found (404) or failed
        const isDemo = import.meta.env.DEV || (axios.isAxiosError(refreshError) && refreshError.response?.status === 404);
        if (isDemo && useAuthStore.getState().isAuthenticated) {
          console.warn('API refresh endpoint returned error. Simulating token renewal for demo...');
          const simulatedToken = 'mock_access_token_' + Date.now();
          useAuthStore.getState().updateAccessToken(simulatedToken);
          processQueue(null, simulatedToken);
          isRefreshing = false;

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${simulatedToken}`;
          }
          return apiClient(originalRequest);
        }

        processQueue(new Error('Session refresh failed'), null);
        isRefreshing = false;
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
