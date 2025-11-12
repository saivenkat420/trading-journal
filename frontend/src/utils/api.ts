// API client
import axios from 'axios';

// Normalize API base URL:
// - Prefer VITE_API_URL from env
// - Trim trailing slashes
// - Ensure it ends with "/api"
function resolveApiBaseUrl(): string {
  const raw = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';
  let url = String(raw).trim();
  // Remove trailing slashes
  url = url.replace(/\/+$/, '');
  // Append /api if missing
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
}

export const API_BASE_URL = resolveApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // If FormData, remove Content-Type header to let Axios set it with boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  
  return config;
});

// Handle 401 errors (unauthorized) - redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      // Redirect to login if not already there
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Trades
export const tradesApi = {
  getAll: (params?: any) => api.get('/trades', { params }),
  getById: (id: string) => api.get(`/trades/${id}`),
  // Axios automatically handles FormData and sets Content-Type with boundary
  create: (data: any) => api.post('/trades', data),
  update: (id: string, data: any) => api.put(`/trades/${id}`, data),
  delete: (id: string) => api.delete(`/trades/${id}`)
};

// Accounts
export const accountsApi = {
  getAll: () => api.get('/accounts'),
  getById: (id: string) => api.get(`/accounts/${id}`),
  create: (data: any) => api.post('/accounts', data),
  update: (id: string, data: any) => api.put(`/accounts/${id}`, data),
  delete: (id: string) => api.delete(`/accounts/${id}`)
};

// Strategies
export const strategiesApi = {
  getAll: () => api.get('/strategies'),
  getById: (id: string) => api.get(`/strategies/${id}`),
  create: (data: any) => api.post('/strategies', data),
  update: (id: string, data: any) => api.put(`/strategies/${id}`, data),
  delete: (id: string) => api.delete(`/strategies/${id}`)
};

// Tags
export const tagsApi = {
  getAll: () => api.get('/tags'),
  create: (data: any) => api.post('/tags', data)
};

// Trading Rules
export const tradingRulesApi = {
  getAll: (params?: any) => api.get('/trading-rules', { params }),
  create: (data: any) => api.post('/trading-rules', data),
  update: (id: string, data: any) => api.put(`/trading-rules/${id}`, data)
};

// Analysis
export const analysisApi = {
  getAll: (params?: any) => api.get('/analysis', { params }),
  getById: (id: string) => api.get(`/analysis/${id}`),
  create: (data: any) =>
    api.post('/analysis', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
    }),
  update: (id: string, data: any) =>
    api.put(`/analysis/${id}`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
    })
};

// Goals
export const goalsApi = {
  getAll: (params?: any) => api.get('/goals', { params }),
  getById: (id: string) => api.get(`/goals/${id}`),
  create: (data: any) => api.post('/goals', data),
  update: (id: string, data: any) => api.put(`/goals/${id}`, data),
  delete: (id: string) => api.delete(`/goals/${id}`)
};

// Settings
export const settingsApi = {
  getAll: () => api.get('/settings'),
  getByKey: (key: string) => api.get(`/settings/${key}`),
  update: (key: string, value: string) => api.put(`/settings/${key}`, { value })
};

// Analytics
export const analyticsApi = {
  getDashboard: (params?: any) => api.get('/analytics/dashboard', { params }),
  getInsights: (params?: any) => api.get('/analytics/insights', { params })
};

// Authentication
export const authApi = {
  register: (email: string, password: string, username?: string, first_name?: string, last_name?: string) =>
    api.post('/auth/register', { email, password, username, first_name, last_name }),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me')
};

// Users
export const usersApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (data: any) => api.put('/users/me', data),
  changePassword: (current_password: string, new_password: string) =>
    api.put('/users/me/password', { current_password, new_password })
};

// Files
export const filesApi = {
  upload: (formData: FormData) => api.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id: string) => api.delete(`/files/${id}`)
};

export default api;

