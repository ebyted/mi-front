import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const menuItems = [
  { name: "Dashboard", path: "/dashboard", icon: "bi-speedometer2" },
  { name: "Usuarios", path: "/users", icon: "bi-people" },
  { name: "Productos", path: "/products", icon: "bi-box-seam" },
  { name: "Almacenes", path: "/warehouses", icon: "bi-building" },
  { name: "Inventario General", path: "/inventory-overview", icon: "bi-clipboard-data" },
  { name: "Órdenes de Compra", path: "/purchase-orders", icon: "bi-cart-plus" },
  { name: "Cotizaciones", path: "/quotations", icon: "bi-calculator" },
  { name: "Ventas", path: "/sales-orders", icon: "bi-receipt" },
  { name: "Detalles de Ventas", path: "/sales-order-details", icon: "bi-list-check" },
  { name: "Clientes", path: "/customers", icon: "bi-person-badge" },
  { name: "Proveedores", path: "/suppliers", icon: "bi-truck" },
  { name: "Movimientos", path: "/inventory-movements", icon: "bi-arrow-left-right" },
  { name: "Categorías", path: "/categories", icon: "bi-tags" },
  { name: "Marcas", path: "/brands", icon: "bi-star" },
  { name: "Tasas de Cambio", path: "/exchange-rates", icon: "bi-currency-exchange" },
  { name: "Investigación de Producto", path: "/product-investigation", icon: "bi-search" },
  { name: "Tienda Tijuana", path: "/enhanced-store", icon: "bi-shop" },
];


export default function Sidebar({ onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const active = menuItems.find(item => item.path === location.pathname);

  return (
    <aside
      className="position-fixed top-0 start-0 h-100 shadow-lg d-flex flex-column p-4"
      style={{
        width: '260px',
        zIndex: 1040,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        borderRight: '1px solid #e0e7ef',
        overflowY: 'auto',
        minHeight: '100vh',
        maxHeight: '100vh',
        transition: 'width 0.2s',
      }}
    >
      <div className="mb-4 text-center">
        <div className="mx-auto mb-2" style={{ width: 64, height: 64 }}>
          <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center" style={{ width: 64, height: 64 }}>
            <span className="fw-bold fs-2 text-primary">{user?.name ? user.name[0].toUpperCase() : "U"}</span>
          </div>
        </div>
        <div className="fw-bold fs-5 text-primary mb-1" style={{ letterSpacing: 1 }}>{user?.name || "Usuario"}</div>
        <div className="text-secondary small mb-2">{user?.email || "Sin email"}</div>
        <hr className="my-3" />
      </div>
      <h2 className="fs-4 fw-bold mb-3 text-primary text-center d-flex align-items-center justify-content-center gap-2" style={{fontSize:'1.2rem'}}>
        {active && <i className={`bi ${active.icon}`}></i>}
        <span>{active ? active.name : "Menú"}</span>
      </h2>
      <nav className="nav flex-column gap-1 flex-grow-1">
        {menuItems.map(item => (
          <button
            key={item.path}
            onClick={() => {
              navigate(item.path);
              if (onClose) onClose();
            }}
            className={`btn text-start mb-1 fw-semibold d-flex align-items-center gap-2 ${location.pathname === item.path ? "btn-primary text-white shadow-sm" : "btn-light text-dark"}`}
            style={{
              borderRadius: '0.7rem',
              fontSize: '1.05rem',
              transition: 'all 0.2s',
              boxShadow: location.pathname === item.path ? '0 2px 8px rgba(0,0,0,0.07)' : 'none',
              minWidth: '100%',
              whiteSpace: 'nowrap',
              padding: '0.6rem 0.75rem',
            }}
            onMouseEnter={e => e.currentTarget.classList.add('shadow-sm')}
            onMouseLeave={e => e.currentTarget.classList.remove('shadow-sm')}
          >
            <i className={`bi ${item.icon}`} style={{ fontSize: '1.1rem', minWidth: '1.2rem' }}></i>
            <span>{item.name}</span>
          </button>
        ))}
      </nav>
      <div className="mt-auto">
        <button
          className="btn btn-info btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
          style={{
            borderRadius: '0.7rem',
            fontWeight: 600,
            fontSize: '1.05rem',
            letterSpacing: 1,
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
            marginBottom: '8px',
          }}
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          <span className="bi bi-box-arrow-right"></span>
          <span>Cerrar sesión</span>
        </button>
      </div>
      {/* Responsive: ocultar en pantallas pequeñas si es necesario */}
      <style>{`
        @media (max-width: 600px) {
          aside.position-fixed {
            width: 100vw !important;
            min-width: 0;
            max-width: 100vw;
            left: 0;
            top: 0;
            border-radius: 0;
            box-shadow: none;
          }
        }
      `}</style>
    </aside>
  );
}