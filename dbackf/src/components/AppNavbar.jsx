import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const navItems = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Usuarios', path: '/users' },
  { name: 'Productos', path: '/products' },
  { name: 'Almacenes', path: '/warehouses' },
  { name: 'Órdenes de Compra', path: '/purchase-orders' },
  { name: 'Cotizaciones', path: '/quotations' },
  { name: 'Ventas', path: '/sales-orders' },
  { name: 'Movimientos', path: '/inventory-movements' },
  { name: 'Categorías', path: '/categories' },
  { name: 'Marcas', path: '/brands' },
  { name: 'Tasas de Cambio', path: '/exchange-rates' },
  { name: 'Tienda', path: '/store' },
];

export default function AppNavbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <nav className="navbar navbar-expand-lg bg-white shadow-lg mb-4" style={{ borderRadius: '0 0 24px 24px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
      <div className="container-fluid py-2 px-4">
        <Link className="navbar-brand fw-bold text-primary fs-3" to="/dashboard" style={{ letterSpacing: '1px' }}>
          <i className="bi bi-box-seam me-2"></i>Maestro Inventario
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNavbar" aria-controls="mainNavbar" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="mainNavbar">
          <ul className="navbar-nav mx-auto mb-2 mb-lg-0 gap-1">
            {navItems.map(item => (
              <li className="nav-item" key={item.path}>
                <Link
                  className={`nav-link px-3 py-2 rounded-3${location.pathname === item.path ? ' active fw-bold text-white bg-primary shadow-sm' : ' text-dark'}`}
                  style={{ fontSize: '1.05rem', transition: 'all 0.2s' }}
                  to={item.path}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
          <div className="d-flex align-items-center gap-3 ms-lg-4">
            {user && (
              <span className="text-secondary small d-flex align-items-center">
                <i className="bi bi-person-circle me-2 fs-5"></i>
                <span className="fw-semibold">{user.email}</span>
              </span>
            )}
            {user && (
              <button className="btn btn-primary btn-sm px-3 shadow-sm" style={{ borderRadius: '8px' }} onClick={logout}>
                <i className="bi bi-box-arrow-right me-1"></i> Cerrar sesión
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
