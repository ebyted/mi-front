import React from "react";
import { useNavigate } from "react-router-dom";

const modules = [
  { name: "Iniciar sesión", path: "/login", icon: "🔑" },
  { name: "Usuarios", path: "/users", icon: "👤" },
  { name: "Product Center", path: "/product-center", icon: "🧩" },
  { name: "Roles", path: "/roles", icon: "🛡️" },
  { name: "Negocios", path: "/business", icon: "🏢" },
  { name: "Productos", path: "/products", icon: "📦" },
  { name: "Almacenes", path: "/warehouses", icon: "🏬" },
  { name: "Proveedores", path: "/suppliers", icon: "🚚" },
  { name: "Órdenes de Compra", path: "/purchase-orders", icon: "📝" },
  { name: "Movimientos de Inventario", path: "/inventory-movements", icon: "🔄" },
  { name: "Clientes", path: "/customers", icon: "🧑‍💼" },
  { name: "Ventas", path: "/sales-orders", icon: "💰" },
  { name: "Cotizaciones", path: "/quotations", icon: "📄" },
  { name: "Auditoría", path: "/audit-log", icon: "📋" },
  { name: "Tasas de Cambio", path: "/exchange-rates", icon: "💱" },
];

export default function MainMenu() {
  const navigate = useNavigate();
  return (
    <div className="container-fluid min-vh-100 d-flex flex-column justify-content-center align-items-center bg-light" style={{background: 'linear-gradient(135deg,#e3f2fd 60%,#f8fafc 100%)'}}>
      <h1 className="display-4 fw-bold mb-5 text-primary text-center">Menú Principal</h1>
      <div className="row w-100 justify-content-center g-4" style={{maxWidth: '1100px'}}>
        {modules.map((mod) => (
          <div className="col-12 col-sm-6 col-md-4" key={mod.path}>
            <button
              className="card w-100 p-4 border-0 shadow-lg d-flex flex-column align-items-center justify-content-center bg-white hover-shadow"
              style={{borderRadius: '1.2rem', transition: 'box-shadow 0.2s'}}
              onClick={() => navigate(mod.path)}
            >
              <span className="fs-1 mb-2">{mod.icon}</span>
              <span className="fs-5 fw-semibold text-dark text-center">{mod.name}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
