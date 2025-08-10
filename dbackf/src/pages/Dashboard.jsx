import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppNavbar from '../components/AppNavbar';
import useDocumentTitle from '../hooks/useDocumentTitle';

function Dashboard() {
  // Hook para cambiar el título de la pestaña
  useDocumentTitle('Dashboard - Maestro Inventario');
  
  const [totals, setTotals] = useState({ users: 0, products: 0, warehouses: 0 });

  useEffect(() => {
    Promise.all([
      fetch('/api/users/').then(res => res.json()),
      fetch('/api/products/').then(res => res.json()),
      fetch('/api/warehouses/').then(res => res.json()),
    ]).then(([users, products, warehouses]) => {
      setTotals({
        users: users.length,
        products: products.length,
        warehouses: warehouses.length,
      });
    }).catch(() => {
      setTotals({ users: 0, products: 0, warehouses: 0 });
    });
  }, []);

  return (
    <>
      <AppNavbar />
      <div className="container py-5">
        <div className="text-center mb-5">
          <h1 className="display-3 fw-bold text-gradient mb-2" style={{background: 'linear-gradient(90deg,#007bff,#00c6ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>Menú principal</h1>
          <p className="lead text-secondary">Bienvenido al sistema de inventario. Selecciona una opción:</p>
        </div>
        <div className="row mb-4 justify-content-center">
          <div className="col-md-3 mb-3">
            <div className="card border-0 shadow-lg text-center bg-gradient-primary" style={{background: 'linear-gradient(135deg,#007bff 60%,#00c6ff 100%)', color: '#fff'}}>
              <div className="card-body">
                <span className="display-3">👤</span>
                <h5 className="card-title mt-2">Usuarios</h5>
                <p className="card-text fs-2 fw-bold">{totals.users}</p>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="card border-0 shadow-lg text-center bg-gradient-success" style={{background: 'linear-gradient(135deg,#28a745 60%,#00c6ff 100%)', color: '#fff'}}>
              <div className="card-body">
                <span className="display-3">📦</span>
                <h5 className="card-title mt-2">Productos</h5>
                <p className="card-text fs-2 fw-bold">{totals.products}</p>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="card border-0 shadow-lg text-center bg-gradient-warning" style={{background: 'linear-gradient(135deg,#ffc107 60%,#00c6ff 100%)', color: '#fff'}}>
              <div className="card-body">
                <span className="display-3">🏬</span>
                <h5 className="card-title mt-2">Almacenes</h5>
                <p className="card-text fs-2 fw-bold">{totals.warehouses}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="row g-4 mt-4">
          { [
            { to: '/users', icon: '👤', label: 'Usuarios', color: 'primary' },
            { to: '/products', icon: '📦', label: 'Productos', color: 'success' },
            { to: '/warehouses', icon: '🏬', label: 'Almacenes', color: 'warning' },
            { to: '/categories', icon: '🗂️', label: 'Categorías', color: 'info' },
            { to: '/brands', icon: '🏷️', label: 'Marcas', color: 'secondary' },
            { to: '/purchase-orders', icon: '📝', label: 'Órdenes de compra', color: 'primary' },
            { to: '/quotations', icon: '💬', label: 'Cotizaciones', color: 'info' },
            { to: '/sales-orders', icon: '🛒', label: 'Pedidos', color: 'success' },
            { to: '/inventory-movements', icon: '🔄', label: 'Movimientos de almacén', color: 'warning' },
            { to: '/exchange-rates', icon: '💱', label: 'Tipo de cambio', color: 'secondary' },
            { to: '/store', icon: '🛍️', label: 'Tienda', color: 'primary' },
            { to: '/tijuana-store', icon: '🏪', label: 'Tienda TIJUANA', color: 'success' },
            { to: '/enhanced-store', icon: '⭐', label: 'Tienda Premium', color: 'warning' },
          ].map((item, idx) => (
            <div className="col-12 col-sm-6 col-md-4 col-lg-3" key={item.to}>
              <Link to={item.to} className={`card border-0 shadow-lg text-center h-100 py-4 px-2 bg-white hover-shadow position-relative menu-card menu-card-${item.color}`}
                style={{transition: 'transform .2s', borderRadius: '1.5rem'}}>
                <span className="display-4 mb-2">{item.icon}</span>
                <span className="fw-semibold fs-5 mb-1 d-block">{item.label}</span>
                <span className="position-absolute top-0 end-0 m-2 badge bg-gradient" style={{background: 'linear-gradient(90deg,#007bff,#00c6ff)', color: '#fff', fontSize: '0.8rem', padding: '0.5em 1em', borderRadius: '1em'}}>{item.label}</span>
              </Link>
            </div>
          ))}
        </div>
        <style>{`
          .menu-card:hover {
            transform: translateY(-8px) scale(1.03);
            box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          }
          .bg-gradient-primary { background: linear-gradient(135deg,#007bff 60%,#00c6ff 100%) !important; }
          .bg-gradient-success { background: linear-gradient(135deg,#28a745 60%,#00c6ff 100%) !important; }
          .bg-gradient-warning { background: linear-gradient(135deg,#ffc107 60%,#00c6ff 100%) !important; }
          .bg-gradient-info { background: linear-gradient(135deg,#17a2b8 60%,#00c6ff 100%) !important; }
          .bg-gradient-secondary { background: linear-gradient(135deg,#6c757d 60%,#00c6ff 100%) !important; }
        `}</style>
      </div>
    </>
  );
}

export default Dashboard;
