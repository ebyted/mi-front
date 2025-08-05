import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

function DebugAuth() {
  const { user, isAuthenticated, logout } = useContext(AuthContext);
  const [testResult, setTestResult] = useState('');
  const [loading, setLoading] = useState(false);

  const checkAuthStatus = () => {
    const token = localStorage.getItem('token');
    const refresh = localStorage.getItem('refresh');
    const userStored = localStorage.getItem('user');
    
    return {
      hasToken: !!token,
      hasRefresh: !!refresh,
      hasUser: !!userStored,
      token: token ? token.substring(0, 20) + '...' : null,
      user: userStored ? JSON.parse(userStored) : null,
      isAuthenticatedResult: isAuthenticated()
    };
  };

  const testApiCall = async () => {
    setLoading(true);
    setTestResult('');
    
    try {
      const response = await api.get('users/');
      setTestResult(`✅ API Call exitosa: ${response.data.length} usuarios encontrados`);
    } catch (error) {
      setTestResult(`❌ API Call falló: ${error.response?.status} - ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testLoginCall = async () => {
    setLoading(true);
    setTestResult('');
    
    try {
      // Intentar con credenciales demo
      const response = await api.post('token/', { 
        email: 'demo@demo.com', 
        password: 'demo123' 
      });
      setTestResult(`✅ Login test exitoso: Token recibido`);
    } catch (error) {
      try {
        // Intentar con username
        const response2 = await api.post('token/', { 
          username: 'demo@demo.com', 
          password: 'demo123' 
        });
        setTestResult(`✅ Login test exitoso (username): Token recibido`);
      } catch (error2) {
        setTestResult(`❌ Login test falló: ${error.response?.status} - ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const authStatus = checkAuthStatus();

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <h2>🔧 Debug de Autenticación</h2>
          <p className="text-muted">Esta página ayuda a diagnosticar problemas de autenticación</p>
        </div>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5>Estado de Autenticación</h5>
            </div>
            <div className="card-body">
              <table className="table table-sm">
                <tbody>
                  <tr>
                    <td><strong>Tiene Token:</strong></td>
                    <td>{authStatus.hasToken ? '✅ Sí' : '❌ No'}</td>
                  </tr>
                  <tr>
                    <td><strong>Tiene Refresh:</strong></td>
                    <td>{authStatus.hasRefresh ? '✅ Sí' : '❌ No'}</td>
                  </tr>
                  <tr>
                    <td><strong>Tiene Usuario:</strong></td>
                    <td>{authStatus.hasUser ? '✅ Sí' : '❌ No'}</td>
                  </tr>
                  <tr>
                    <td><strong>isAuthenticated():</strong></td>
                    <td>{authStatus.isAuthenticatedResult ? '✅ Verdadero' : '❌ Falso'}</td>
                  </tr>
                </tbody>
              </table>

              {authStatus.token && (
                <div className="mt-3">
                  <small><strong>Token:</strong> {authStatus.token}</small>
                </div>
              )}

              {authStatus.user && (
                <div className="mt-3">
                  <small><strong>Usuario:</strong> {JSON.stringify(authStatus.user, null, 2)}</small>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5>Pruebas de Conexión</h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <button 
                  className="btn btn-primary" 
                  onClick={testApiCall}
                  disabled={loading}
                >
                  {loading ? 'Probando...' : 'Probar API Call (users/)'}
                </button>
                
                <button 
                  className="btn btn-secondary" 
                  onClick={testLoginCall}
                  disabled={loading}
                >
                  {loading ? 'Probando...' : 'Probar Login (demo@demo.com)'}
                </button>

                <button 
                  className="btn btn-danger" 
                  onClick={logout}
                >
                  Limpiar Autenticación
                </button>
              </div>

              {testResult && (
                <div className="mt-3">
                  <div className={`alert ${testResult.includes('✅') ? 'alert-success' : 'alert-danger'}`}>
                    {testResult}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5>Credenciales Sugeridas</h5>
            </div>
            <div className="card-body">
              <p>Basado en la lista de usuarios del sistema, prueba estas credenciales:</p>
              <ul>
                <li><strong>demo@demo.com</strong> - Password: demo123 (supuesto)</li>
                <li><strong>admin@admin.com</strong> - Password: admin123 (supuesto)</li>
                <li><strong>test@test.com</strong> - Password: test123 (supuesto)</li>
                <li><strong>ebyted@gmail.com</strong> - Password: (pregunta al administrador)</li>
              </ul>
              <p className="text-muted">
                <small>Nota: Si ninguna funciona, contacta al administrador del sistema para obtener credenciales válidas.</small>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DebugAuth;
