
import axios from 'axios';

// Determine base URL: use relative path in browser/dev to leverage Next.js rewrites and avoid CORS
const envBase = process.env.NEXT_PUBLIC_API_BASE_URL;
const isBrowser = typeof window !== 'undefined';
// If running in the browser and no explicit non-local base is provided, use relative path so Next rewrites apply
const shouldUseRelative = isBrowser && (!envBase || envBase.startsWith('http://localhost') || envBase.startsWith('https://localhost'));
const resolvedBase = shouldUseRelative ? '' : (envBase || 'https://eckss0cw0ggco0okoocc4wo4.194.164.151.15.sslip.io');

const axiosInstance = axios.create({
  baseURL: `${resolvedBase}/api/v1`, // relative in dev/browser to hit Next rewrites, absolute otherwise
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  },
});

// Add auth token dynamically with validation
axiosInstance.interceptors.request.use(
  async (config) => {
    if (typeof window !== 'undefined') {
      // Import userStore dynamically to avoid circular dependencies
      try {
        const { useUserStore } = await import('@/store/useUserStore');
        const validToken = useUserStore.getState().validateAndGetToken();
        
        if (validToken) {
          config.headers.Authorization = `Bearer ${validToken}`;
        } else {
          // Fallback if store hasn't hydrated yet
          const lsToken = localStorage.getItem('token');
          if (lsToken) {
            config.headers.Authorization = `Bearer ${lsToken}`;
          }
        }
      } catch {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    }

    // For FormData requests, handle Content-Type properly
    if (config.data instanceof FormData) {
      // If Content-Type is explicitly set to 'multipart/form-data', let it stay
      // Otherwise, remove any default Content-Type to let browser set it automatically
      if (config.headers['Content-Type'] !== 'multipart/form-data') {
        delete config.headers['Content-Type'];
      }
    }

    // Remove pragma header to avoid CORS issues (not allowed by backend)
    if (config.headers['pragma']) {
      delete config.headers['pragma'];
    }
    if (config.headers['Pragma']) {
      delete config.headers['Pragma'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for better error logging
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorInfo = {
      url: error?.config?.url || 'unknown',
      method: error?.config?.method?.toUpperCase() || 'unknown',
      status: error?.response?.status || 'no status',
      statusText: error?.response?.statusText || 'no status text',
      message: error?.message || 'no message',
      code: error?.code || 'no code',
      hasResponse: !!error?.response,
      hasConfig: !!error?.config,
      errorType: error?.name || 'unknown error type',
      data: undefined as unknown
    };

    // Only include response data if it exists and is not too large
    if (error?.response?.data) {
      try {
        const dataStr = JSON.stringify(error.response.data);
        if (dataStr.length < 1000) {
          errorInfo.data = error.response.data;
        } else {
          errorInfo.data = 'Response data too large to log';
        }
      } catch {
        errorInfo.data = 'Unable to stringify response data';
      }
    }

    
    // // Handle authentication errors
    // if (error.response?.status === 401) {
    // }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;
