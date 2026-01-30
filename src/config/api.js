// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/login`,
  LOGOUT: `${API_BASE_URL}/logout`,
  
  // Users
  USERS: `${API_BASE_URL}/users`,
  
  // Categories
  CATEGORIES: `${API_BASE_URL}/categories`,
  
  // Foods
  FOODS: `${API_BASE_URL}/foods`,
  
  // Transactions
  TRANSACTIONS: `${API_BASE_URL}/transactions`,
  TRANSACTION_DETAILS: `${API_BASE_URL}/transaction-details`,
  
  // Dashboard
  DASHBOARD_SUMMARY: `${API_BASE_URL}/dashboard/summary`,
  TOP_FOODS: `${API_BASE_URL}/dashboard/top-foods`,
  HISTORY_TRANSACTIONS: `${API_BASE_URL}/history/transactions`,
};

export default API_BASE_URL;
