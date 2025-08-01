import api from './api';

export async function login(email, password) {
  try {
    const response = await api.post('token/', { email, password });
    localStorage.setItem('token', response.data.access);
    localStorage.setItem('refresh', response.data.refresh);
    return { success: true };
  } catch (error) {
    return { success: false, message: error.response?.data?.detail || 'Error de autenticación' };
  }
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh');
}

export function isAuthenticated() {
  return !!localStorage.getItem('token');
}
