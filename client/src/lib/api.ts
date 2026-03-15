import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('netza_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('netza_token');
      localStorage.removeItem('netza_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
