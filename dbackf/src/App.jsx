
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
import QuotationsNew from './pages/QuotationsNew';
import SalesOrders from './pages/SalesOrders';
import SalesOrderDetails from './pages/SalesOrderDetails';
import InventoryMovements from './pages/InventoryMovements';
import Categories from './pages/Categories';
import Brands from './pages/Brands';
import ExchangeRates from './pages/ExchangeRates';
import Customers from './pages/Customers';
import TestCustomers from './pages/TestCustomers';
import Suppliers from './pages/Suppliers';
import EnhancedTijuanaStore from './pages/EnhancedTijuanaStore.jsx';
import ProductInvestigation from './pages/ProductInvestigation.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { isAuthenticated, isLoading } = useAuth();

  // Mostrar loading mientras se verifica la autenticación
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

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
    <Router>
      <Routes>
        {/* Ruta raíz redirige según autenticación */}
        <Route path="/" element={
          isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        } />
        
        {/* Login - solo accesible si NO está autenticado */}
        <Route path="/login" element={
          isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Login />
        } />
        
        {/* Rutas protegidas */}
        <Route path="/dashboard" element={renderWithSidebar(Dashboard)} />
        <Route path="/users" element={renderWithSidebar(Users)} />
        <Route path="/products" element={renderWithSidebar(Products)} />
        <Route path="/warehouses" element={renderWithSidebar(Warehouses)} />
        <Route path="/purchase-orders" element={renderWithSidebar(PurchaseOrders)} />
        <Route path="/quotations" element={renderWithSidebar(QuotationsNew)} />
        <Route path="/sales-orders" element={renderWithSidebar(SalesOrders)} />
        <Route path="/sales-order-details" element={renderWithSidebar(SalesOrderDetails)} />
        <Route path="/inventory-movements" element={renderWithSidebar(InventoryMovements)} />
        <Route path="/categories" element={renderWithSidebar(Categories)} />
        <Route path="/brands" element={renderWithSidebar(Brands)} />
        <Route path="/exchange-rates" element={renderWithSidebar(ExchangeRates)} />
        <Route path="/customers" element={renderWithSidebar(Customers)} />
        <Route path="/suppliers" element={renderWithSidebar(Suppliers)} />
        <Route path="/test-customers" element={renderWithSidebar(TestCustomers)} />
        <Route path="/enhanced-store" element={renderWithSidebar(() => <EnhancedTijuanaStore user={null} />)} />
        <Route path="/product-investigation" element={renderWithSidebar(ProductInvestigation)} />
        
        {/* Cualquier otra ruta redirige según autenticación */}
        <Route path="*" element={
          isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        } />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
