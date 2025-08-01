import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as apiLogin } from '../services/auth';
import { AuthContext } from '../context/AuthContext.jsx';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await apiLogin(email, password);
    if (result.success) {
      // Simula usuario, normalmente vendría del backend
      login({ name: email.split('@')[0], email });
      navigate('/dashboard');
    } else {
      setError(result.message);
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
