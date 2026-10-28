import axios from 'axios';

// Create an Axios instance with base URL from env
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Crucial: automatically sends and receives cookies
});

let isRefreshing = false;

interface FailedRequest {
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}

let failedQueue: FailedRequest[] = [];

const processQueue = (error: any) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Add a response interceptor to handle token refresh automatically
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If currently refreshing, queue this request
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return axiosClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Use standard axios to hit the refresh endpoint
        // Because withCredentials is true, the refresh cookie is sent automatically.
        await axios.post(
          `${axiosClient.defaults.baseURL}/api/auth/refresh`,
          {},
          {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true,
          }
        );

        // Process all queued requests (they will automatically pick up the new cookies)
        processQueue(null);

        // Retry the original request
        return axiosClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // Refresh failed (e.g. refresh token expired or missing), force logout
        window.location.href = '/?error=SessionExpired';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
