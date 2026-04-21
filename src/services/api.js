import axios from 'axios';

// Try multiple possible backend URLs
const BACKEND_URLS = [
  'http://localhost:5001/api',
  'http://localhost:5002/api',
  'http://localhost:5003/api',
  'http://127.0.0.1:5001/api'
];

let API_BASE_URL = 'http://localhost:5001/api'; // Default

// Function to find working backend
const findWorkingBackend = async () => {
  console.log('🔍 Scanning for backend server...');
  
  for (const url of BACKEND_URLS) {
    try {
      console.log(`   Testing ${url}/health...`);
      const response = await axios.get(`${url}/health`, { 
        timeout: 2000,
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.data) {
        console.log(`✅ Found backend at: ${url}`);
        return url;
      }
    } catch (error) {
      console.log(`   ❌ ${url} not responding`);
    }
  }
  
  console.log('⚠️ No backend found, using default');
  return 'http://localhost:5001/api';
};

// Initialize API
let API;

const initAPI = async () => {
  API_BASE_URL = await findWorkingBackend();
  
  API = axios.create({
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
};

// Initialize immediately
initAPI();

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