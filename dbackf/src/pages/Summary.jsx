import React, { useState, useEffect } from 'react';
import useDocumentTitle from '../hooks/useDocumentTitle';
import api from '../services/api';

function Summary() {
  useDocumentTitle('Resumen - Maestro Inventario');

  // Estados principales
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState({
    zeroStock: { count: 0, products: [] },
    lowStock: { count: 0, products: [] },
    pendingOrders: { count: 0, orders: [] },
    inactiveProducts: { count: 0, products: [] }
  });
  const [todayOperations, setTodayOperations] = useState({
    purchaseOrders: { created: 0, received: 0, pending: 0 },
    salesOrders: { new: 0, processing: 0, dispatched: 0 },
    movements: { entries: 0, exits: 0, adjustments: 0, transfers: 0 }
  });
  const [recentData, setRecentData] = useState({
    latestMovements: [],
    activePurchaseOrders: [],
    criticalProducts: []
  });
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Auto-refresh cada 5 minutos
  useEffect(() => {
    loadSummaryData();
    const interval = setInterval(loadSummaryData, 5 * 60 * 1000); // 5 minutos
    return () => clearInterval(interval);
  }, []);

  const loadSummaryData = async () => {
    try {
      setLoading(true);
      
      // Cargar datos reales del backend
      const response = await api.get('/dashboard/summary/');
      const data = response.data;
      
      setAlerts(data.alerts);
      setTodayOperations(data.todayOperations);
      setRecentData(data.recentData);
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading summary data:', error);
      // Fallback a datos simulados si falla el API
      await simulateApiCall();
    } finally {
      setLoading(false);
    }
  };

  // Función temporal para simular datos hasta crear los endpoints reales
  const simulateApiCall = async () => {
    return new Promise(resolve => {
      setTimeout(() => {
        setAlerts({
          zeroStock: { 
            count: 23, 
            products: [
              { id: 1, name: 'Producto A', sku: 'SKU001', current_stock: 0, minimum_stock: 10 },
              { id: 2, name: 'Producto B', sku: 'SKU002', current_stock: 0, minimum_stock: 5 },
              { id: 3, name: 'Producto C', sku: 'SKU003', current_stock: 0, minimum_stock: 15 }
            ]
          },
          lowStock: { 
            count: 156, 
            products: [
              { id: 4, name: 'Producto D', sku: 'SKU004', current_stock: 2, minimum_stock: 10 },
              { id: 5, name: 'Producto E', sku: 'SKU005', current_stock: 3, minimum_stock: 8 }
            ]
          },
          pendingOrders: { count: 12, orders: [] },
          inactiveProducts: { count: 45, products: [] }
        });

        setTodayOperations({
          purchaseOrders: { created: 5, received: 3, pending: 12 },
          salesOrders: { new: 23, processing: 8, dispatched: 15 },
          movements: { entries: 145, exits: 89, adjustments: 4, transfers: 2 }
        });

        setRecentData({
          latestMovements: [
            { id: 1, date: '2025-11-04', product: 'Producto A', type: 'Entrada', quantity: 50, user: 'Admin' },
            { id: 2, date: '2025-11-04', product: 'Producto B', type: 'Salida', quantity: -25, user: 'Vendedor1' },
            { id: 3, date: '2025-11-04', product: 'Producto C', type: 'Ajuste', quantity: 10, user: 'Admin' }
          ],
          activePurchaseOrders: [],
          criticalProducts: []
        });

        resolve();
      }, 1000);
    });
  };

  // Componente de Alerta
  const AlertCard = ({ icon, count, title, severity, actionText, onAction }) => (
    <div className={`col-md-3 col-sm-6 mb-3`}>
      <div className={`card border-${severity} h-100`}>
        <div className="card-body text-center">
          <div className={`text-${severity} mb-2`}>
            <i className={`${icon} fs-1`}></i>
          </div>
          <h4 className={`text-${severity} mb-1`}>{count}</h4>
          <p className="card-text small mb-2">{title}</p>
          {onAction && (
            <button 
              className={`btn btn-sm btn-outline-${severity}`}
              onClick={onAction}
            >
              {actionText}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Componente de Resumen del Día
  const TodayOperations = () => (
    <div className="card mb-4">
      <div className="card-header">
        <h5 className="mb-0">
          <i className="bi bi-calendar-today me-2"></i>
          Resumen del Día - {new Date().toLocaleDateString('es-ES')}
        </h5>
      </div>
      <div className="card-body">
        <div className="row g-4">
          <div className="col-md-4">
            <h6 className="text-primary">
              <i className="bi bi-cart-plus me-2"></i>
              Órdenes de Compra
            </h6>
            <ul className="list-unstyled">
              <li>• Creadas hoy: <strong>{todayOperations.purchaseOrders.created}</strong></li>
              <li>• Recibidas hoy: <strong>{todayOperations.purchaseOrders.received}</strong></li>
              <li>• Pendientes: <strong className="text-warning">{todayOperations.purchaseOrders.pending}</strong></li>
            </ul>
          </div>
          <div className="col-md-4">
            <h6 className="text-success">
              <i className="bi bi-receipt me-2"></i>
              Pedidos de Venta
            </h6>
            <ul className="list-unstyled">
              <li>• Nuevos hoy: <strong>{todayOperations.salesOrders.new}</strong></li>
              <li>• En proceso: <strong className="text-info">{todayOperations.salesOrders.processing}</strong></li>
              <li>• Despachados hoy: <strong>{todayOperations.salesOrders.dispatched}</strong></li>
            </ul>
          </div>
          <div className="col-md-4">
            <h6 className="text-info">
              <i className="bi bi-arrow-left-right me-2"></i>
              Movimientos de Inventario
            </h6>
            <ul className="list-unstyled">
              <li>• Entradas hoy: <strong className="text-success">+{todayOperations.movements.entries}</strong></li>
              <li>• Salidas hoy: <strong className="text-danger">-{todayOperations.movements.exits}</strong></li>
              <li>• Ajustes hoy: <strong>{todayOperations.movements.adjustments}</strong></li>
              <li>• Transferencias hoy: <strong>{todayOperations.movements.transfers}</strong></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  // Componente de Productos Críticos
  const CriticalProductsTable = ({ products, title, severity }) => (
    <div className="card">
      <div className="card-header d-flex justify-content-between">
        <h6 className="mb-0">
          <span className={`text-${severity}`}>●</span> {title}
        </h6>
        <span className={`badge bg-${severity}`}>{products.length}</span>
      </div>
      <div className="table-responsive">
        <table className="table table-hover mb-0 table-sm">
          <thead className="table-light">
            <tr>
              <th>Producto</th>
              <th>SKU</th>
              <th>Stock Actual</th>
              <th>Stock Mínimo</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {products.slice(0, 5).map(product => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td><code>{product.sku}</code></td>
                <td>
                  <span className={`badge ${product.current_stock === 0 ? 'bg-danger' : 'bg-warning'}`}>
                    {product.current_stock}
                  </span>
                </td>
                <td>{product.minimum_stock}</td>
                <td>
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => window.location.href = `/purchase-orders`}
                    title="Crear orden de compra"
                  >
                    <i className="bi bi-cart-plus"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length > 5 && (
          <div className="card-footer text-center">
            <button 
              className="btn btn-sm btn-outline-primary"
              onClick={() => window.location.href = '/products?filter=critical'}
            >
              Ver todos los {products.length} productos
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Componente de Movimientos Recientes
  const RecentMovementsTable = () => (
    <div className="card">
      <div className="card-header">
        <h6 className="mb-0">
          <i className="bi bi-clock-history me-2"></i>
          Últimos Movimientos
        </h6>
      </div>
      <div className="table-responsive">
        <table className="table table-hover mb-0 table-sm">
          <thead className="table-light">
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Tipo</th>
              <th>Cantidad</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            {recentData.latestMovements.map(movement => (
              <tr key={movement.id}>
                <td>{new Date(movement.date).toLocaleDateString('es-ES')}</td>
                <td>{movement.product}</td>
                <td>
                  <span className={`badge ${
                    movement.type === 'Entrada' ? 'bg-success' : 
                    movement.type === 'Salida' ? 'bg-danger' : 'bg-info'
                  }`}>
                    {movement.type}
                  </span>
                </td>
                <td className={
                  movement.quantity > 0 ? 'text-success' : 
                  movement.quantity < 0 ? 'text-danger' : ''
                }>
                  {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                </td>
                <td>{movement.user}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="container-fluid mt-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando resumen...</span>
          </div>
          <p className="mt-2 text-secondary">Cargando información del resumen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header con botón de refresh */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="bi bi-clipboard-data me-2"></i>
          Resumen Gerencial
        </h2>
        <div className="d-flex align-items-center gap-3">
          <small className="text-muted">
            Última actualización: {lastUpdated.toLocaleTimeString('es-ES')}
          </small>
          <button 
            className="btn btn-outline-primary btn-sm"
            onClick={loadSummaryData}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Actualizar
          </button>
        </div>
      </div>

      {/* Alertas Críticas */}
      <div className="row mb-4">
        <AlertCard 
          icon="bi bi-exclamation-triangle-fill"
          count={alerts.zeroStock.count}
          title="Productos sin Stock"
          severity="danger"
          actionText="Ver productos"
          onAction={async () => {
            try {
              const response = await api.get('/dashboard/products/zero-stock/');
              console.log('Productos sin stock:', response.data);
              // Aquí puedes abrir un modal o navegar a una página específica
            } catch (error) {
              console.error('Error:', error);
            }
          }}
        />
        <AlertCard 
          icon="bi bi-exclamation-circle-fill"
          count={alerts.lowStock.count}
          title="Stock Bajo Mínimo"
          severity="warning"
          actionText="Ver productos"
          onAction={async () => {
            try {
              const response = await api.get('/dashboard/products/low-stock/');
              console.log('Productos con stock bajo:', response.data);
              // Aquí puedes abrir un modal o navegar a una página específica
            } catch (error) {
              console.error('Error:', error);
            }
          }}
        />
        <AlertCard 
          icon="bi bi-clock-fill"
          count={alerts.pendingOrders.count}
          title="Órdenes Pendientes"
          severity="info"
          actionText="Ver órdenes"
          onAction={async () => {
            try {
              const response = await api.get('/dashboard/orders/pending/');
              console.log('Órdenes pendientes:', response.data);
              // Aquí puedes abrir un modal o navegar a una página específica
            } catch (error) {
              console.error('Error:', error);
            }
          }}
        />
        <AlertCard 
          icon="bi bi-pause-circle-fill"
          count={alerts.inactiveProducts.count}
          title="Productos Inactivos"
          severity="secondary"
          actionText="Ver productos"
          onAction={() => window.location.href = '/products?filter=inactive'}
        />
      </div>

      {/* Resumen del Día */}
      <TodayOperations />

      {/* Tablas de Control */}
      <div className="row mb-4">
        <div className="col-lg-6 mb-3">
          <CriticalProductsTable 
            products={alerts.zeroStock.products}
            title="Productos Sin Stock"
            severity="danger"
          />
        </div>
        <div className="col-lg-6 mb-3">
          <RecentMovementsTable />
        </div>
      </div>

      {/* Segunda fila de tablas si hay productos con stock bajo */}
      {alerts.lowStock.products.length > 0 && (
        <div className="row">
          <div className="col-12">
            <CriticalProductsTable 
              products={alerts.lowStock.products}
              title="Productos con Stock Bajo"
              severity="warning"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Summary;