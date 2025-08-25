import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as apiLogin } from '../services/auth';
import { useAuth } from '../context/AuthContext.jsx';
import useDocumentTitle from '../hooks/useDocumentTitle';

function Login() {
  // Hook para cambiar el título de la pestaña
  useDocumentTitle('Iniciar Sesión - Maestro Inventario');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const result = await apiLogin(email, password);
      if (result.success) {
        // Verificar que el token se haya guardado correctamente
        const token = localStorage.getItem('token');
        if (token) {
          // Obtener información del usuario desde el token o hacer una llamada a la API
          const userData = { 
            name: email.split('@')[0], 
            email,
            authenticated: true 
          };
          login(userData);
          navigate('/dashboard');
        } else {
          setError('Error: No se pudo obtener el token de autenticación');
        }
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('Error en login:', error);
      setError('Error de conexión. Verifica tu conexión a internet.');
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center min-vh-100"
      style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)',
        minHeight: '100vh',
        width: '100vw',
      }}
    >
      <form
        className="bg-white p-5 rounded shadow w-100"
        style={{ maxWidth: 600 }}
        onSubmit={handleSubmit}
      >
        <div className="text-center mb-4">
          <img src={require('../assets/logo_sancho.png')} alt="Logo Sancho" style={{ height: 64, marginBottom: 12 }} />
        </div>
        <h2 className="mb-4 text-center">Iniciar sesión</h2>
        <div className="mb-3">
          <input type="email" className="form-control" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="mb-3">
          <input type="password" className="form-control" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        <button type="submit" className="btn btn-primary w-100">Entrar</button>
      </form>
    </div>
  );
}

export default Login;
