import axios from 'axios';
import API_BASE_URL from '../config/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login if 401 and NOT on login endpoint
    if (error.response?.status === 401 && !error.config?.url?.includes('/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth services
export const authService = {
  login: async (username, password) => {
    const response = await api.post('/login', { username, password });
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/logout');
    return response.data;
  },
};

// Category services
export const categoryService = {
  getAll: async () => {
    const response = await api.get('/categories');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/categories', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/categories/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  },
};

// Food services
export const foodService = {
  getAll: async (params = {}) => {
    const response = await api.get('/foods', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/foods/${id}`);
    return response.data;
  },
  create: async (data) => {
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };
    const response = await api.post('/foods', data, config);
    return response.data;
  },
  update: async (id, data) => {
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };
    // Use HTTP PUT to match backend route and support multipart/form-data
    const response = await api.put(`/foods/${id}`, data, config);
    return response.data;
  },
  delete: async (id, force = false) => {
    const response = await api.delete(`/foods/${id}`, {
      params: { force: force ? 'true' : 'false' }
    });
    return response.data;
  },
  checkDeleteImpact: async (id) => {
    // Check if food can be deleted (will return warning if has transactions)
    try {
      const response = await api.delete(`/foods/${id}`, {
        params: { force: 'false' }
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 409 && error.response?.data?.requiresConfirmation) {
        return error.response.data;
      }
      throw error;
    }
  },
};

// Transaction services
export const transactionService = {
  getAll: async (params = {}) => {
    const response = await api.get('/transactions', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/transactions/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/transactions', data);
    return response.data;
  },
  getHistory: async (params = {}) => {
    const response = await api.get('/transactions/history', { params });
    return response.data;
  },
};

// Dashboard services
export const dashboardService = {
  getSummary: async () => {
    const response = await api.get('/dashboard/summary');
    return response.data;
  },
  getTopFoods: async () => {
    const response = await api.get('/dashboard/top-foods');
    return response.data;
  },
};

export default api;
