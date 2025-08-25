
import axios from 'axios';

// Usar variable de entorno para la URL del API
// El API root muestra que los endpoints no llevan /api/ en producción
// Usar variable de entorno tal cual, sin agregar /api/ si ya está presente
let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8030/';
if (API_URL.endsWith('/api/')) {
  API_URL = API_URL.replace(/\/api\/?$/, '/');
}
console.log('API URL configurada:', API_URL); // Para debug

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
      localStorage.removeItem('refresh');
      localStorage.removeItem('user');
      // Opcional: window.location.href = '/login';
      return Promise.reject(new Error('Token expirado'));
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de respuesta para manejar errores 401
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Token inválido o expirado
      localStorage.removeItem('token');
      localStorage.removeItem('refresh');
      localStorage.removeItem('user');
      
      // Solo redirigir si no estamos ya en login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export { api };
export default api;
