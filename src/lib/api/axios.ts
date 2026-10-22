import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('welinc_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 401 from the login call means a wrong password, not an expired session:
    // let the form show it instead of reloading the page.
    const isLoginRequest = error.config?.url === '/auth/login';
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('welinc_token');
      localStorage.removeItem('welinc_user');
      localStorage.removeItem('welinc-auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

