import api from './api';

export async function login(email, password) {
  try {
    console.log('🔐 Intentando login con:', { email, password: '***' });
    
    // Intentar con email primero
    let response;
    try {
      response = await api.post('token/', { email, password });
    } catch (emailError) {
      console.log('❌ Login con email falló, intentando con username:', emailError.message);
      // Si falla, intentar con username
      response = await api.post('token/', { username: email, password });
    }
    
    console.log('✅ Login exitoso, guardando tokens...');
    localStorage.setItem('token', response.data.access);
    localStorage.setItem('refresh', response.data.refresh);
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Error en login:', error);
    
    let errorMessage = 'Error de autenticación';
    if (error.response?.status === 401) {
      errorMessage = 'Credenciales incorrectas';
    } else if (error.response?.status === 400) {
      errorMessage = 'Datos de login inválidos';
    } else if (error.code === 'NETWORK_ERROR' || !error.response) {
      errorMessage = 'Error de conexión. Verifica tu conexión a internet.';
    } else {
      errorMessage = error.response?.data?.detail || error.message || 'Error desconocido';
    }
    
    return { success: false, message: errorMessage };
  }
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh');
}

export function isAuthenticated() {
  return !!localStorage.getItem('token');
}
