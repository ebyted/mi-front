
import axios from 'axios';

// Usar variable de entorno para la URL del API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8030';

console.log('API URL configurada:', API_URL); // Para debug

const api = axios.create({
  baseURL: API_URL,
});

// Función para verificar si el token JWT está expirado
function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // exp está en segundos desde epoch
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    if (isTokenExpired(token)) {
      // Opcional: puedes mostrar un mensaje o redirigir al login
      alert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      localStorage.removeItem('token');
      // Opcional: window.location.href = '/login';
      return Promise.reject(new Error('Token expirado'));
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
