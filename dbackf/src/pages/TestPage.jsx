import React from 'react';

function TestPage() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>¡React funciona correctamente!</h1>
      <p>Si ves este mensaje, el frontend está cargando bien.</p>
      <p>Timestamp: {new Date().toISOString()}</p>
      <div style={{ marginTop: '20px' }}>
        <a href="/login" style={{ color: 'blue', textDecoration: 'underline' }}>Ir a Login</a>
        {' | '}
        <a href="/store" style={{ color: 'blue', textDecoration: 'underline' }}>Ir a Tienda</a>
      </div>
    </div>
  );
}

export default TestPage;
