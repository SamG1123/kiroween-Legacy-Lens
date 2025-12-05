import axios, { AxiosError } from 'axios';
import { parseError } from '../utils/errorHandling';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add any auth tokens here if needed
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for centralized error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // Parse and log the error
    const appError = parseError(error);
    console.error('API Error:', {
      type: appError.type,
      message: appError.message,
      statusCode: appError.statusCode,
      url: error.config?.url,
      method: error.config?.method,
    });

    // Handle specific error cases globally if needed
    if (appError.statusCode === 401) {
      // Handle unauthorized - could redirect to login
      // window.location.href = '/login';
    }

    // Reject with the original error so components can handle it
    return Promise.reject(error);
  }
);

export default apiClient;
