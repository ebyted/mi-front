import React, { useEffect, useState } from 'react';
import api from '../services/api';

function SalesOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ customer: '', order_date: '', status: '', total_amount: '' });
  const [formError, setFormError] = useState('');
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [details, setDetails] = useState([{ product: '', quantity: '', price: '' }]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [ordersRes, productsRes, customersRes] = await Promise.all([
          api.get('sales-orders/'), // Cargar pedidos normalmente
          api.get('products/'),
          api.get('customers/')
        ]);
        
        // Manejar datos que pueden venir como array directo o con paginación
        const ordersData = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data.results || []);
        const productsData = Array.isArray(productsRes.data) ? productsRes.data : (productsRes.data.results || []);
        const customersData = Array.isArray(customersRes.data) ? customersRes.data : (customersRes.data.results || []);
        
        console.log('Orders loaded:', ordersData); // Debug
        console.log('First order structure:', ordersData[0]); // Debug estructura
        
        // Debug: Verificar si items_detail está llegando
        if (ordersData.length > 0) {
          console.log('Order has items_detail?', 'items_detail' in ordersData[0]);
          console.log('Order items_detail:', ordersData[0].items_detail);
          console.log('Order items (normal):', ordersData[0].items);
        }
        
        console.log('Products loaded:', productsData); // Debug
        console.log('Customers loaded:', customersData); // Debug
        
        // Enriquecer pedidos con información del cliente
        const ordersWithRelations = ordersData.map((order) => {
          // Si el customer es un ID, buscar el objeto completo
          if (order.customer && typeof order.customer === 'number') {
            const customer = customersData.find(c => c.id === order.customer);
            order.customer = customer || { id: order.customer, name: 'Cliente desconocido' };
          }
          
          // Usar items_detail si está disponible, sino mantener items como está
          if (order.items_detail) {
            order.items = order.items_detail;
          } else if (!order.items) {
            order.items = [];
          }
          
          return order;
        });
        
        console.log('Orders with relations:', ordersWithRelations); // Debug
        
        setOrders(ordersWithRelations);
        setProducts(productsData);
        setCustomers(customersData);
      } catch (err) {
        console.error('Error loading data:', err); // Debug
        setOrders([]);
        setProducts([]);
        setCustomers([]);
        setError('No se pudo cargar los datos.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDetailChange = (idx, e) => {
    const newDetails = [...details];
    newDetails[idx][e.target.name] = e.target.value;
    
    // Auto-calcular precio si es un producto seleccionado
    if (e.target.name === 'product' && e.target.value) {
      const selectedProduct = products.find(p => p.id == e.target.value);
      if (selectedProduct && selectedProduct.price) {
        newDetails[idx]['price'] = selectedProduct.price;
      }
    }
    
    setDetails(newDetails);
    calculateTotal(newDetails);
  };

  const addDetail = () => {
    setDetails([...details, { product: '', quantity: '', price: '' }]);
  };

  const removeDetail = idx => {
    const newDetails = details.filter((_, i) => i !== idx);
    setDetails(newDetails);
    calculateTotal(newDetails);
  };

  const calculateTotal = (detailsArray = details) => {
    const total = detailsArray.reduce((sum, detail) => {
      const quantity = parseFloat(detail.quantity) || 0;
      const price = parseFloat(detail.price) || 0;
      return sum + (quantity * price);
    }, 0);
    setFormData(prev => ({ ...prev, total_amount: total.toFixed(2) }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    
    // Validaciones
    if (!formData.customer || !formData.order_date || !formData.status || details.some(d => !d.product || !d.quantity || !d.price)) {
      setFormError('Todos los campos y detalles son obligatorios.');
      setSaving(false);
      return;
    }

      try {
        // Preparar datos para enviar
        const orderData = {
          customer: parseInt(formData.customer),
          order_date: formData.order_date,
          status: formData.status,
          total_amount: parseFloat(formData.total_amount),
          items: details.map(detail => ({
            product: parseInt(detail.product),
            quantity: parseFloat(detail.quantity),
            price: parseFloat(detail.price)
          }))
        };

        if (editingOrder) {
          // Actualizar pedido existente
          await api.put(`sales-orders/${editingOrder.id}/`, orderData);
        } else {
          // Crear nuevo pedido
          await api.post('sales-orders/', orderData);
        }
        
        // Refrescar lista de pedidos
        const ordersRes = await api.get('sales-orders/');
        const refreshedOrders = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data.results || []);
        
        // Enriquecer con datos de clientes
        const enrichedOrders = refreshedOrders.map(order => {
          if (order.customer && typeof order.customer === 'number') {
            const customer = customers.find(c => c.id === order.customer);
            order.customer = customer || { id: order.customer, name: 'Cliente desconocido' };
          }
          
          // Usar items_detail si está disponible, sino mantener items como está
          if (order.items_detail) {
            order.items = order.items_detail;
          } else if (!order.items) {
            order.items = [];
          }
          
          return order;
        });
        
        console.log('Orders refreshed:', enrichedOrders); // Debug
        setOrders(enrichedOrders);
        
        // Limpiar formulario
        setShowForm(false);
        setEditingOrder(null);
        setFormData({ customer: '', order_date: '', status: '', total_amount: '' });
        setDetails([{ product: '', quantity: '', price: '' }]);    } catch (error) {
      console.error('Error creating order:', error);
      if (error.response?.data) {
        const errorMsg = typeof error.response.data === 'string' 
          ? error.response.data 
          : Object.values(error.response.data).flat().join(', ');
        setFormError(`Error al crear pedido: ${errorMsg}`);
      } else {
        setFormError('Error al crear pedido. Verifique los datos.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Funciones para las acciones
  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  const handleEditOrder = (order) => {
    setEditingOrder(order);
    setFormData({
      customer: order.customer?.id || '',
      order_date: order.order_date || '',
      status: order.status || '',
      total_amount: order.total_amount || ''
    });
    setDetails(order.items?.map(item => ({
      product: item.product?.id || item.product || '',
      quantity: item.quantity || '',
      price: item.price || ''
    })) || [{ product: '', quantity: '', price: '' }]);
    setShowForm(true);
  };

  const handleDeleteOrder = async (orderId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este pedido?')) {
      try {
        await api.delete(`sales-orders/${orderId}/`);
        // Recargar pedidos
        const ordersRes = await api.get('sales-orders/');
        const refreshedOrders = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data.results || []);
        
        // Enriquecer con datos de clientes
        const enrichedOrders = refreshedOrders.map(order => {
          if (order.customer && typeof order.customer === 'number') {
            const customer = customers.find(c => c.id === order.customer);
            order.customer = customer || { id: order.customer, name: 'Cliente desconocido' };
          }
          
          // Usar items_detail si está disponible, sino mantener items como está
          if (order.items_detail) {
            order.items = order.items_detail;
          } else if (!order.items) {
            order.items = [];
          }
          
          return order;
        });
        
        setOrders(enrichedOrders);
      } catch (error) {
        console.error('Error deleting order:', error);
        alert('Error al eliminar el pedido');
      }
    }
  };

  // Filtrar pedidos con manejo seguro de datos
  const filteredOrders = orders.filter(order => {
    if (!order) return false;
    
    const customerName = order.customer?.name || '';
    const orderId = order.id?.toString() || '';
    const orderStatus = order.status || '';
    
    const matchesSearch = searchTerm === '' || 
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orderId.includes(searchTerm);
    const matchesStatus = statusFilter === '' || orderStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Estadísticas con manejo seguro de datos
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o?.status === 'Pendiente').length,
    completed: orders.filter(o => o?.status === 'Completado').length,
    totalAmount: orders.reduce((sum, o) => sum + (parseFloat(o?.total_amount) || 0), 0)
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'Pendiente': return 'bg-warning';
      case 'Procesado': return 'bg-info'; 
      case 'Enviado': return 'bg-primary';
      case 'Completado': return 'bg-success';
      default: return 'bg-secondary';
    }
  };

  return (
    <div className="container py-5">
      {/* Header con estadísticas */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="display-5 text-primary">📋 Pedidos de Venta</h2>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <i className="bi bi-plus-circle me-2"></i>Nuevo pedido
            </button>
            <button className="btn btn-outline-secondary ms-2" onClick={() => window.location.reload()}>
              <i className="bi bi-arrow-clockwise me-2"></i>Refrescar
            </button>
          </div>
        </div>
      </div>

      {/* Estadísticas Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <h5 className="card-title">Total Pedidos</h5>
              <h2 className="mb-0">{stats.total}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-warning text-white">
            <div className="card-body">
              <h5 className="card-title">Pendientes</h5>
              <h2 className="mb-0">{stats.pending}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-success text-white">
            <div className="card-body">
              <h5 className="card-title">Completados</h5>
              <h2 className="mb-0">{stats.completed}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-info text-white">
            <div className="card-body">
              <h5 className="card-title">Total Ventas</h5>
              <h2 className="mb-0">${stats.totalAmount.toFixed(2)}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card shadow mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <input
                type="text"
                className="form-control"
                placeholder="🔍 Buscar por cliente o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Todos los estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Procesado">Procesado</option>
                <option value="Enviado">Enviado</option>
                <option value="Completado">Completado</option>
              </select>
            </div>
            <div className="col-md-3">
              <button 
                className="btn btn-outline-secondary w-100"
                onClick={() => {setSearchTerm(''); setStatusFilter('');}}
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Tabla de pedidos */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-2 text-secondary">Cargando pedidos...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger text-center">{error}</div>
      ) : (
        <div className="card shadow mb-4">
          <div className="card-header bg-light">
            <h5 className="mb-0">
              Lista de Pedidos 
              <span className="badge bg-primary ms-2">{filteredOrders.length}</span>
              {orders.length > 0 && (
                <small className="text-muted ms-2">
                  (Total cargados: {orders.length})
                </small>
              )}
            </h5>
          </div>
          <div className="card-body p-0">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-inbox display-1 text-muted"></i>
                {orders.length === 0 ? (
                  <div>
                    <p className="text-muted mt-3">No hay pedidos registrados</p>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                      <i className="bi bi-plus-circle me-2"></i>Crear primer pedido
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-muted mt-3">No hay pedidos que coincidan con los filtros</p>
                    <p className="text-muted">Total de pedidos: {orders.length}</p>
                    <button 
                      className="btn btn-outline-primary" 
                      onClick={() => {setSearchTerm(''); setStatusFilter('');}}
                    >
                      Limpiar filtros
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-primary">
                    <tr>
                      <th>#ID</th>
                      <th>Cliente</th>
                      <th>Fecha</th>
                      <th>Estado</th>
                      <th>Total</th>
                      <th>Items</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(order => (
                      <tr key={order.id}>
                        <td className="fw-bold">#{order.id}</td>
                        <td>
                          <div>
                            <div className="fw-semibold">{order.customer?.name || 'Cliente desconocido'}</div>
                            <small className="text-muted">{order.customer?.email}</small>
                          </div>
                        </td>
                        <td>
                          {new Date(order.order_date).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="fw-bold text-success">
                          ${parseFloat(order.total_amount || 0).toFixed(2)}
                        </td>
                        <td>
                          <span className="badge bg-light text-dark">
                            {order.items?.length || 0} items
                            {(!order.items || order.items.length === 0) && (
                              <small className="text-muted d-block">Sin items</small>
                            )}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group" role="group">
                            <button 
                              className="btn btn-sm btn-outline-primary" 
                              title="Ver detalles"
                              onClick={() => handleViewDetails(order)}
                            >
                              <i className="bi bi-eye"></i>
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-secondary" 
                              title="Editar"
                              onClick={() => handleEditOrder(order)}
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-danger" 
                              title="Eliminar"
                              onClick={() => handleDeleteOrder(order.id)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
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
      {/* Modal de formulario */}
      {showForm && (
        <div className="modal fade show d-block" tabIndex="-1" style={{background: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className={`bi ${editingOrder ? 'bi-pencil' : 'bi-plus-circle'} me-2`}></i>
                  {editingOrder ? `Editar Pedido #${editingOrder.id}` : 'Crear Nuevo Pedido'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => {
                  setShowForm(false);
                  setEditingOrder(null);
                  setFormData({ customer: '', order_date: '', status: '', total_amount: '' });
                  setDetails([{ product: '', quantity: '', price: '' }]);
                }}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    {/* Cliente */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Cliente *</label>
                      <select 
                        name="customer" 
                        className="form-select" 
                        value={formData.customer} 
                        onChange={handleChange} 
                        required
                      >
                        <option value="">Seleccionar cliente...</option>
                        {customers
                          .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                          .map(customer => (
                            <option key={customer.id} value={customer.id}>
                              {customer.name} - {customer.code}
                            </option>
                          ))}
                      </select>
                    </div>
                    
                    {/* Fecha */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Fecha del pedido *</label>
                      <input 
                        name="order_date" 
                        type="datetime-local" 
                        className="form-control" 
                        value={formData.order_date} 
                        onChange={handleChange} 
                        required 
                      />
                    </div>
                    
                    {/* Estado */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Estado *</label>
                      <select 
                        name="status" 
                        className="form-select" 
                        value={formData.status} 
                        onChange={handleChange} 
                        required
                      >
                        <option value="">Seleccionar estado...</option>
                        <option value="Pendiente">🟡 Pendiente</option>
                        <option value="Procesado">🔵 Procesado</option>
                        <option value="Enviado">🟠 Enviado</option>
                        <option value="Completado">🟢 Completado</option>
                      </select>
                    </div>
                    
                    {/* Total (calculado automáticamente) */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Total</label>
                      <input 
                        name="total_amount" 
                        type="number" 
                        className="form-control bg-light" 
                        placeholder="Se calcula automáticamente" 
                        value={formData.total_amount} 
                        readOnly
                        min="0" 
                        step="0.01" 
                      />
                    </div>
                  </div>
                  
                  <hr className="my-4" />
                  
                  {/* Sección de productos */}
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">
                      <i className="bi bi-bag me-2"></i>Detalle de artículos
                    </h5>
                    <button type="button" className="btn btn-outline-primary btn-sm" onClick={addDetail}>
                      <i className="bi bi-plus me-1"></i>Agregar artículo
                    </button>
                  </div>
                  
                  {details.map((d, idx) => (
                    <div className="card mb-3" key={idx}>
                      <div className="card-body">
                        <div className="row g-2">
                          <div className="col-md-5">
                            <label className="form-label">Producto *</label>
                            <select
                              name="product"
                              className="form-select"
                              value={d.product}
                              onChange={e => handleDetailChange(idx, e)}
                              required
                            >
                              <option value="">Seleccionar producto...</option>
                              {products
                                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                                .map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} {p.price && `- $${p.price}`}
                                  </option>
                                ))}
                            </select>
                          </div>
                          <div className="col-md-2">
                            <label className="form-label">Cantidad *</label>
                            <input
                              type="number"
                              name="quantity"
                              className="form-control"
                              placeholder="0"
                              value={d.quantity}
                              onChange={e => {
                                handleDetailChange(idx, e);
                                calculateTotal();
                              }}
                              required
                              min="1"
                            />
                          </div>
                          <div className="col-md-2">
                            <label className="form-label">Precio *</label>
                            <input
                              type="number"
                              name="price"
                              className="form-control"
                              placeholder="0.00"
                              value={d.price}
                              onChange={e => {
                                handleDetailChange(idx, e);
                                calculateTotal();
                              }}
                              required
                              min="0"
                              step="0.01"
                            />
                          </div>
                          <div className="col-md-2">
                            <label className="form-label">Subtotal</label>
                            <input
                              type="text"
                              className="form-control bg-light"
                              value={`$${((parseFloat(d.quantity) || 0) * (parseFloat(d.price) || 0)).toFixed(2)}`}
                              readOnly
                            />
                          </div>
                          <div className="col-md-1 d-flex align-items-end">
                            <button 
                              type="button" 
                              className="btn btn-outline-danger btn-sm w-100" 
                              onClick={() => removeDetail(idx)} 
                              disabled={details.length === 1}
                              title="Eliminar item"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {formError && (
                    <div className="alert alert-danger d-flex align-items-center">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      {formError}
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => {
                    setShowForm(false);
                    setEditingOrder(null);
                    setFormData({ customer: '', order_date: '', status: '', total_amount: '' });
                    setDetails([{ product: '', quantity: '', price: '' }]);
                  }}>
                    <i className="bi bi-x-circle me-1"></i>Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        {editingOrder ? 'Actualizando...' : 'Guardando...'}
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-1"></i>
                        {editingOrder ? 'Actualizar Pedido' : 'Guardar Pedido'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalles */}
      {showDetails && selectedOrder && (
        <div className="modal fade show d-block" tabIndex="-1" style={{background: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-info text-white">
                <h5 className="modal-title">
                  <i className="bi bi-eye me-2"></i>Detalles del Pedido #{selectedOrder.id}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDetails(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <h6 className="fw-bold">Cliente:</h6>
                    <p className="mb-1">{selectedOrder.customer?.name || 'Cliente desconocido'}</p>
                    <small className="text-muted">{selectedOrder.customer?.email}</small>
                  </div>
                  <div className="col-md-6">
                    <h6 className="fw-bold">Fecha:</h6>
                    <p>{new Date(selectedOrder.order_date).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  </div>
                  <div className="col-md-6">
                    <h6 className="fw-bold">Estado:</h6>
                    <span className={`badge ${getStatusBadgeClass(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                  <div className="col-md-6">
                    <h6 className="fw-bold">Total:</h6>
                    <h4 className="text-success">${parseFloat(selectedOrder.total_amount || 0).toFixed(2)}</h4>
                  </div>
                </div>
                
                <h6 className="fw-bold mb-3">Items del pedido:</h6>
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Cantidad</th>
                          <th>Precio Unit.</th>
                          <th>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items.map((item, index) => (
                          <tr key={index}>
                            <td>{item.product?.name || `Producto ID: ${item.product}`}</td>
                            <td>{item.quantity}</td>
                            <td>${parseFloat(item.price || 0).toFixed(2)}</td>
                            <td className="fw-bold">${(parseFloat(item.quantity || 0) * parseFloat(item.price || 0)).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="alert alert-warning">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    No hay items registrados para este pedido
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDetails(false)}>
                  Cerrar
                </button>
                <button type="button" className="btn btn-primary" onClick={() => {
                  setShowDetails(false);
                  handleEditOrder(selectedOrder);
                }}>
                  <i className="bi bi-pencil me-1"></i>Editar Pedido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesOrders;
