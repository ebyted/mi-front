import React, { useEffect, useState } from 'react';
import api from '../services/api';

function SalesOrderDetails() {
  const [orderDetails, setOrderDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [salesOrders, setSalesOrders] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar datos en paralelo
      const [detailsRes, ordersRes, productsRes] = await Promise.all([
        api.get('sales-order-items/'),
        api.get('sales-orders/'),
        api.get('products/')
      ]);

      // Procesar datos
      const detailsData = Array.isArray(detailsRes.data) ? detailsRes.data : (detailsRes.data.results || []);
      const ordersData = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data.results || []);
      const productsData = Array.isArray(productsRes.data) ? productsRes.data : (productsRes.data.results || []);

      // Enriquecer detalles con información de pedidos y productos
      const enrichedDetails = detailsData.map(detail => {
        const order = ordersData.find(o => o.id === detail.sales_order);
        const product = productsData.find(p => p.id === detail.product_variant);
        
        return {
          ...detail,
          order_info: order || { id: detail.sales_order, customer: { name: 'Desconocido' } },
          product_info: product || { id: detail.product_variant, name: 'Producto desconocido' }
        };
      });

      setOrderDetails(enrichedDetails);
      setSalesOrders(ordersData);
      setProducts(productsData);

    } catch (err) {
      console.error('Error loading data:', err);
      setError('No se pudo cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar detalles
  const filteredDetails = orderDetails.filter(detail => {
    const matchesSearch = search === '' || 
      detail.product_info?.name?.toLowerCase().includes(search.toLowerCase()) ||
      detail.order_info?.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      detail.order_info?.id?.toString().includes(search);
    
    const matchesOrder = orderFilter === '' || detail.sales_order?.toString() === orderFilter;
    const matchesProduct = productFilter === '' || detail.product_variant?.toString() === productFilter;
    
    return matchesSearch && matchesOrder && matchesProduct;
  });

  // Estadísticas
  const stats = {
    totalDetails: orderDetails.length,
    totalQuantity: orderDetails.reduce((sum, d) => sum + (parseFloat(d.quantity) || 0), 0),
    totalValue: orderDetails.reduce((sum, d) => sum + (parseFloat(d.total_price) || 0), 0),
    avgUnitPrice: orderDetails.length > 0 ? 
      orderDetails.reduce((sum, d) => sum + (parseFloat(d.unit_price) || 0), 0) / orderDetails.length : 0
  };

  return (
    <div className="container py-5">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="display-5 text-info">
          <i className="bi bi-list-ul me-2"></i>Detalles de Pedidos
        </h2>
        <button className="btn btn-outline-secondary" onClick={loadData}>
          <i className="bi bi-arrow-clockwise me-2"></i>Actualizar
        </button>
      </div>

      {/* Estadísticas */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card bg-info text-white">
            <div className="card-body">
              <h5 className="card-title">Total Items</h5>
              <h2 className="mb-0">{stats.totalDetails}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-success text-white">
            <div className="card-body">
              <h5 className="card-title">Cantidad Total</h5>
              <h2 className="mb-0">{stats.totalQuantity.toFixed(0)}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <h5 className="card-title">Valor Total</h5>
              <h2 className="mb-0">${stats.totalValue.toFixed(2)}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-warning text-white">
            <div className="card-body">
              <h5 className="card-title">Precio Promedio</h5>
              <h2 className="mb-0">${stats.avgUnitPrice.toFixed(2)}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card shadow mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <input
                type="text"
                className="form-control"
                placeholder="🔍 Buscar por producto, cliente o ID de pedido..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={orderFilter}
                onChange={(e) => setOrderFilter(e.target.value)}
              >
                <option value="">Todos los pedidos</option>
                {salesOrders.map(order => (
                  <option key={order.id} value={order.id}>
                    Pedido #{order.id} - {order.customer?.name || 'Sin cliente'}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
              >
                <option value="">Todos los productos</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <button 
                className="btn btn-outline-secondary w-100"
                onClick={() => {setSearch(''); setOrderFilter(''); setProductFilter('');}}
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de detalles */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-info" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-2 text-secondary">Cargando detalles...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger text-center">{error}</div>
      ) : (
        <div className="card shadow">
          <div className="card-header bg-light">
            <h5 className="mb-0">
              Lista de Detalles de Pedidos
              <span className="badge bg-info ms-2">{filteredDetails.length}</span>
              {orderDetails.length > 0 && (
                <small className="text-muted ms-2">
                  (Total: {orderDetails.length})
                </small>
              )}
            </h5>
          </div>
          <div className="card-body p-0">
            {filteredDetails.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-inbox display-1 text-muted"></i>
                <p className="text-muted mt-3">
                  {orderDetails.length === 0 ? 'No hay detalles de pedidos' : 'No hay detalles que coincidan con los filtros'}
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-info">
                    <tr>
                      <th>ID Detalle</th>
                      <th>Pedido</th>
                      <th>Cliente</th>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Precio Unit.</th>
                      <th>Total</th>
                      <th>Estado Pedido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDetails.map(detail => (
                      <tr key={detail.id}>
                        <td className="fw-bold">#{detail.id}</td>
                        <td>
                          <span className="badge bg-primary">#{detail.sales_order}</span>
                        </td>
                        <td>
                          <div>
                            <div className="fw-semibold">{detail.order_info?.customer?.name || 'Sin cliente'}</div>
                            <small className="text-muted">{detail.order_info?.customer?.email}</small>
                          </div>
                        </td>
                        <td>
                          <div>
                            <div className="fw-semibold">{detail.product_info?.name || 'Producto desconocido'}</div>
                            <small className="text-muted">ID: {detail.product_variant}</small>
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark">{detail.quantity}</span>
                        </td>
                        <td>${parseFloat(detail.unit_price || 0).toFixed(2)}</td>
                        <td className="fw-bold text-success">
                          ${parseFloat(detail.total_price || 0).toFixed(2)}
                        </td>
                        <td>
                          <span className={`badge bg-${
                            detail.order_info?.status === 'Completado' ? 'success' :
                            detail.order_info?.status === 'Pendiente' ? 'warning' :
                            detail.order_info?.status === 'Procesado' ? 'info' :
                            detail.order_info?.status === 'Enviado' ? 'primary' : 'secondary'
                          }`}>
                            {detail.order_info?.status || 'Sin estado'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesOrderDetails;
