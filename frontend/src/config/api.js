// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/login',
  LOGOUT: '/logout',
  ME: '/me',
  
  // Categories
  CATEGORIES: '/categories',
  
  // Foods
  FOODS: '/foods',
  
  // Transactions
  TRANSACTIONS: '/transactions',
  
  // Dashboard
  DASHBOARD: '/dashboard'
};

export default API_BASE_URL;
