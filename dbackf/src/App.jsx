
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainMenu from './components/MainMenu';
import Sidebar from './pages/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Users from './pages/Users';
import Products from './pages/Products';
import Warehouses from './pages/Warehouses';
import PurchaseOrders from './pages/PurchaseOrders';
import Quotations from './pages/Quotations';
import SalesOrders from './pages/SalesOrders';
import InventoryMovements from './pages/InventoryMovements';
import InventoryMovementsSimple from './pages/InventoryMovementsSimple';
import Categories from './pages/Categories';
import Brands from './pages/Brands';
import ExchangeRates from './pages/ExchangeRates';
import ModernShop from './pages/ModernShop.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { AuthContext } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Helper para renderizar rutas protegidas con sidebar
  const renderWithSidebar = (Component) => (
    <ProtectedRoute>
      {sidebarOpen && <Sidebar onClose={() => setSidebarOpen(false)} />}
      {/* Botón para abrir el sidebar en móvil */}
      {!sidebarOpen && (
        <button
          className="btn btn-primary position-fixed"
          style={{ top: 16, left: 16, zIndex: 2000 }}
          onClick={() => setSidebarOpen(true)}
        >
          <span className="bi bi-list"></span>
        </button>
      )}
      <div className="flex-1" style={{ marginLeft: sidebarOpen ? 260 : 0, transition: 'margin-left 0.2s', padding: '2rem' }}>
        <Component />
      </div>
    </ProtectedRoute>
  );

  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={renderWithSidebar(Dashboard)} />
            <Route path="/users" element={renderWithSidebar(Users)} />
            <Route path="/products" element={renderWithSidebar(Products)} />
            <Route path="/warehouses" element={renderWithSidebar(Warehouses)} />
            <Route path="/purchase-orders" element={renderWithSidebar(PurchaseOrders)} />
            <Route path="/quotations" element={renderWithSidebar(Quotations)} />
            <Route path="/sales-orders" element={renderWithSidebar(SalesOrders)} />
            <Route path="/inventory-movements" element={renderWithSidebar(InventoryMovements)} />
            <Route path="/inventory-movements-simple" element={renderWithSidebar(InventoryMovementsSimple)} />
            <Route path="/categories" element={renderWithSidebar(Categories)} />
            <Route path="/brands" element={renderWithSidebar(Brands)} />
            <Route path="/exchange-rates" element={renderWithSidebar(ExchangeRates)} />
            <Route path="/store" element={renderWithSidebar(() => <ModernShop user={null} />)} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
