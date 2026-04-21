import axios from 'axios';

// Get API URL from env var or fallback to current window host
const getBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  
  // Fallback for network access during development
  const hostname = window.location.hostname;
  return hostname !== 'localhost' 
    ? `http://${hostname}:5001/api` 
    : 'http://localhost:5001/api';
};

const API_BASE_URL = getBaseUrl();
console.log(`🌐 System API: ${API_BASE_URL}`);

// Initialize API
const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

// Request interceptor
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      console.error('❌ Network Error - Cannot reach backend');
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const login = async (credentials) => {
  if (!API) await initAPI();
  return API.post('/auth/login', credentials);
};

export const changePassword = async ({ currentPassword, newPassword }) => {
  if (!API) await initAPI();
  return API.post('/auth/change-password', { currentPassword, newPassword });
};

export const adminResetPassword = async (userId, newPassword) => {
  if (!API) await initAPI();
  return API.post(`/auth/reset-password/${userId}`, { newPassword });
};

export const testConnection = async () => {
  for (const url of BACKEND_URLS) {
    try {
      const response = await axios.get(`${url}/health`, { timeout: 2000 });
      return { success: true, url, data: response.data };
    } catch (error) {
      continue;
    }
  }
  return { success: false, error: 'No backend found' };
};

export default API;