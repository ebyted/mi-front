import React from 'react';

function ElegantLayout({ title, children }) {
  return (
    <div className="dashboard-bg p-4 animate__animated animate__fadeIn" style={{ minHeight: '100vh', borderRadius: '24px', boxShadow: '0 2px 24px rgba(0,0,0,0.07)' }}>
      <header className="d-flex justify-content-between align-items-center mb-4 animate__animated animate__fadeInDown">
        <h1 className="fw-bold display-5 d-flex align-items-center">
          <span className="me-3"><i className="fas fa-cube fa-2x text-primary animate__animated animate__bounceIn"></i></span>
          {title}
        </h1>
        <div>
          {/* Puedes agregar badges, usuario, etc. aquí */}
        </div>
      </header>
      <main className="main-content">
        {children}
      </main>
      <footer className="dashboard-footer mt-4 py-3 text-center animate__animated animate__fadeInUp" style={{ background: 'linear-gradient(90deg, #f8fafc 80%, #e3f2fd 100%)', borderRadius: '0 0 24px 24px', boxShadow: '0 -2px 18px rgba(0,0,0,0.07)' }}>
        <div className="container">
          <span className="text-muted">
            <i className="fas fa-cube text-primary me-2"></i>
            Maestro Inventario &copy; {new Date().getFullYear()} &mdash; Todos los derechos reservados
          </span>
        </div>
      </footer>
    </div>
  );
}

export default ElegantLayout;
