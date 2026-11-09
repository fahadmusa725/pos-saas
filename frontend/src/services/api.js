import axios from 'axios';

// In production builds, VITE_API_URL must be set. Fail loudly if missing.
const apiUrl = import.meta.env.VITE_API_URL;
if (!apiUrl && import.meta.env.PROD) {
  throw new Error('VITE_API_URL is not set. Set it in your production environment before building.');
}

const api = axios.create({
  baseURL: apiUrl || 'http://localhost:5000/api',
});

// Har request mein token automatically attach karo
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;