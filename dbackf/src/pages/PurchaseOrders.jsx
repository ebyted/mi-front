import React, { useState, useEffect } from 'react';
import api from '../services/api';

const statusColors = {
  'DRAFT': 'bg-secondary',
  'PENDING': 'bg-warning text-dark',
  'APPROVED': 'bg-info',
  'SENT': 'bg-primary',
  'RECEIVED': 'bg-success',
  'CANCELLED': 'bg-danger',
};

const statusLabels = {
  'DRAFT': 'Borrador',
  'PENDING': 'Pendiente',
  'APPROVED': 'Aprobada', 
  'SENT': 'Enviada',
  'RECEIVED': 'Recibida',
  'CANCELLED': 'Cancelada',
};

function PurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [productVariants, setProductVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [productSearch, setProductSearch] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    supplier: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    status: 'DRAFT',
    notes: ''
  });
  
  const [items, setItems] = useState([
    { product_variant: '', quantity: 1, unit_price: 0 }
  ]);
  
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, suppliersRes, variantsRes] = await Promise.all([
        api.get('/purchase-orders/'),
        api.get('/suppliers/'),
        api.get('/product-variants/')
      ]);
      
      setOrders(ordersRes.data || []);
      setSuppliers(suppliersRes.data || []);
      setProductVariants(variantsRes.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // Calcular total automáticamente
  const calculateTotal = () => {
    return items.reduce((total, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      return total + (quantity * price);
    }, 0);
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { product_variant: '', quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Función para filtrar productos por búsqueda parcial
  const getFilteredProducts = (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) return productVariants;
    
    return productVariants.filter(variant => 
      variant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      variant.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      variant.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleProductSearch = (index, searchValue) => {
    setProductSearch(prev => ({
      ...prev,
      [index]: searchValue
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    // Validaciones
    if (!formData.supplier) {
      setFormError('Debe seleccionar un proveedor');
      setIsSubmitting(false);
      return;
    }

    if (items.some(item => !item.product_variant || !item.quantity || !item.unit_price)) {
      setFormError('Todos los items deben tener producto, cantidad y precio');
      setIsSubmitting(false);
      return;
    }

    const total = calculateTotal();
    if (total <= 0) {
      setFormError('El total debe ser mayor a 0');
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        total_amount: total,
        items_data: items.map(item => ({
          product_variant: parseInt(item.product_variant),
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price)
        }))
      };

      if (editingOrder) {
        await api.put(`/purchase-orders/${editingOrder.id}/`, payload);
      } else {
        await api.post('/purchase-orders/', payload);
      }

      resetForm();
      await loadData();
    } catch (err) {
      console.error('Error saving order:', err);
      setFormError(err.response?.data?.detail || 'Error al guardar la orden');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingOrder(null);
    setFormData({
      supplier: '',
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: '',
      status: 'DRAFT',
      notes: ''
    });
    setItems([{ product_variant: '', quantity: 1, unit_price: 0 }]);
    setFormError('');
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setFormData({
      supplier: order.supplier || '',
      order_date: order.order_date ? order.order_date.split('T')[0] : '',
      expected_delivery_date: order.expected_delivery_date ? order.expected_delivery_date.split('T')[0] : '',
      status: order.status || 'DRAFT',
      notes: order.notes || ''
    });
    
    if (order.items && order.items.length > 0) {
      setItems(order.items.map(item => ({
        product_variant: item.product_variant || '',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0
      })));
    }
    
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta orden?')) return;
    
    try {
      await api.delete(`/purchase-orders/${id}/`);
      loadData();
    } catch (err) {
      setError('Error al eliminar la orden');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-MX');
  };

  // Filtros
  const filteredOrders = orders.filter(order => {
    const matchesSearch = !search || 
      order.supplier_detail?.name?.toLowerCase().includes(search.toLowerCase()) ||
      order.supplier_detail?.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      order.id.toString().includes(search);
    
    const matchesStatus = !statusFilter || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4 align-items-center">
        <div className="col">
          <div className="d-flex align-items-center mb-2">
            <div className="bg-primary bg-opacity-10 rounded-3 p-3 me-3">
              <i className="bi bi-cart-plus fs-2 text-primary"></i>
            </div>
            <div>
              <h1 className="mb-0 text-primary fw-bold">Órdenes de Compra</h1>
              <p className="text-muted mb-0 fs-6">
                <i className="bi bi-info-circle me-1"></i>
                Gestión completa de órdenes de compra a proveedores
              </p>
            </div>
          </div>
        </div>
        <div className="col-auto">
          <button 
            className="btn btn-success btn-lg shadow"
            onClick={() => setShowForm(true)}
          >
            <i className="bi bi-plus-circle me-2"></i>
            ✨ Nueva Orden
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar por proveedor, empresa o ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Todos los estados</option>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <div className="d-flex gap-2">
                <span className="badge bg-primary">{filteredOrders.length} órdenes</span>
                <span className="badge bg-success">
                  Total: {formatCurrency(filteredOrders.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" style={{width: '3rem', height: '3rem'}}></div>
          <h5 className="mt-3 text-muted">Cargando órdenes de compra...</h5>
          <p className="text-muted">Esto puede tomar unos segundos</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="card shadow">
          <div className="card-body text-center py-5">
            <i className="bi bi-inbox display-1 text-muted"></i>
            <h4 className="mt-3 text-muted">No hay órdenes de compra</h4>
            <p className="text-muted">Comienza creando tu primera orden de compra</p>
            <button 
              className="btn btn-success btn-lg mt-3"
              onClick={() => setShowForm(true)}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Crear Primera Orden
            </button>
          </div>
        </div>
      ) : (
        <div className="card shadow border-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead style={{background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)', color: 'white'}}>
                <tr>
                  <th className="border-0 py-3">
                    <i className="bi bi-hash me-1"></i>ID
                  </th>
                  <th className="border-0 py-3">
                    <i className="bi bi-truck me-1"></i>Proveedor
                  </th>
                  <th className="border-0 py-3">
                    <i className="bi bi-calendar me-1"></i>Fecha
                  </th>
                  <th className="border-0 py-3">
                    <i className="bi bi-calendar-check me-1"></i>Entrega
                  </th>
                  <th className="border-0 py-3">
                    <i className="bi bi-flag me-1"></i>Estado
                  </th>
                  <th className="border-0 py-3">
                    <i className="bi bi-box me-1"></i>Items
                  </th>
                  <th className="border-0 py-3">
                    <i className="bi bi-currency-dollar me-1"></i>Total
                  </th>
                  <th className="border-0 py-3">
                    <i className="bi bi-gear me-1"></i>Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, index) => (
                  <tr key={order.id} className={index % 2 === 0 ? 'bg-light' : ''}>
                    <td className="py-3">
                      <div className="d-flex align-items-center">
                        <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2" style={{width: '24px', height: '24px', fontSize: '12px'}}>
                          {index + 1}
                        </div>
                        <strong className="text-primary">#{order.id}</strong>
                      </div>
                    </td>
                    <td className="py-3">
                      <div>
                        <div className="fw-bold text-dark">{order.supplier_detail?.name || 'N/A'}</div>
                        {order.supplier_detail?.company_name && (
                          <small className="text-muted d-block">{order.supplier_detail.company_name}</small>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="badge bg-secondary bg-opacity-25 text-dark">
                        {formatDate(order.order_date)}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="badge bg-info bg-opacity-25 text-dark">
                        {formatDate(order.expected_delivery_date)}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`badge ${statusColors[order.status] || 'bg-secondary'} px-3 py-2`}>
                        {order.status === 'DRAFT' && '📝 '}
                        {order.status === 'PENDING' && '⏳ '}
                        {order.status === 'APPROVED' && '✅ '}
                        {order.status === 'SENT' && '📤 '}
                        {order.status === 'RECEIVED' && '📥 '}
                        {order.status === 'CANCELLED' && '❌ '}
                        {statusLabels[order.status] || order.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="badge bg-info px-3 py-2">
                        📦 {order.items?.length || 0} items
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="fw-bold fs-6 text-success">
                        {formatCurrency(order.total_amount)}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="btn-group" role="group">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => setShowDetails(order)}
                          title="Ver detalles"
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-outline-warning"
                          onClick={() => handleEdit(order)}
                          title="Editar"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(order.id)}
                          title="Eliminar"
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
        </div>
      )}

      {/* Modal de Formulario */}
      {showForm && (
        <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-cart-plus me-2"></i>
                  {editingOrder ? 'Editar Orden' : 'Nueva Orden de Compra'}
                </h5>
                <button type="button" className="btn-close" onClick={resetForm}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {formError && (
                    <div className="alert alert-danger">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      {formError}
                    </div>
                  )}

                  <div className="card mb-4 border-primary">
                    <div className="card-header bg-primary text-white">
                      <h6 className="mb-0">
                        <i className="bi bi-info-circle me-2"></i>
                        Información General de la Orden
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label fw-bold">
                            <i className="bi bi-truck me-1"></i>
                            Proveedor <span className="text-danger">*</span>
                          </label>
                          <select
                            name="supplier"
                            className="form-select form-select-lg"
                            value={formData.supplier}
                            onChange={handleFormChange}
                            required
                          >
                            <option value="">🔍 Seleccionar proveedor...</option>
                            {suppliers.map(supplier => (
                              <option key={supplier.id} value={supplier.id}>
                                📋 {supplier.name} {supplier.company_name && `- ${supplier.company_name}`}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="col-md-3">
                          <label className="form-label fw-bold">
                            <i className="bi bi-calendar-event me-1"></i>
                            Fecha de Orden
                          </label>
                          <input
                            type="date"
                            name="order_date"
                            className="form-control form-control-lg"
                            value={formData.order_date}
                            onChange={handleFormChange}
                          />
                        </div>
                        
                        <div className="col-md-3">
                          <label className="form-label fw-bold">
                            <i className="bi bi-calendar-check me-1"></i>
                            Fecha de Entrega
                          </label>
                          <input
                            type="date"
                            name="expected_delivery_date" 
                            className="form-control form-control-lg"
                            value={formData.expected_delivery_date}
                            onChange={handleFormChange}
                          />
                        </div>
                        
                        <div className="col-md-6">
                          <label className="form-label fw-bold">
                            <i className="bi bi-flag me-1"></i>
                            Estado de la Orden
                          </label>
                          <select
                            name="status"
                            className="form-select form-select-lg"
                            value={formData.status}
                            onChange={handleFormChange}
                          >
                            {Object.entries(statusLabels).map(([key, label]) => (
                              <option key={key} value={key}>
                                {key === 'DRAFT' && '📝 '}
                                {key === 'PENDING' && '⏳ '}
                                {key === 'APPROVED' && '✅ '}
                                {key === 'SENT' && '📤 '}
                                {key === 'RECEIVED' && '📥 '}
                                {key === 'CANCELLED' && '❌ '}
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="col-md-6">
                          <label className="form-label fw-bold">
                            <i className="bi bi-chat-text me-1"></i>
                            Notas Adicionales
                          </label>
                          <textarea
                            name="notes"
                            className="form-control form-control-lg"
                            rows="3"
                            value={formData.notes}
                            onChange={handleFormChange}
                            placeholder="💬 Agregue cualquier observación, instrucción especial o comentario..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <hr />

                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                      <h5 className="mb-0 text-primary">
                        <i className="bi bi-cart-plus me-2"></i>
                        Items de la Orden
                      </h5>
                      <small className="text-muted">Productos incluidos en esta orden de compra</small>
                    </div>
                    <button
                      type="button"
                      className="btn btn-success btn-lg"
                      onClick={addItem}
                    >
                      <i className="bi bi-plus-circle me-2"></i>
                      Agregar Producto
                    </button>
                  </div>

                  {items.map((item, index) => {
                    const filteredProducts = getFilteredProducts(productSearch[index] || '');
                    const selectedProduct = productVariants.find(p => p.id.toString() === item.product_variant.toString());
                    
                    return (
                    <div key={index} className="card mb-3 border-0 shadow-sm">
                      <div className="card-body">
                        <div className="row g-3 align-items-end">
                          <div className="col-12">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <h6 className="mb-0 text-primary">
                                <i className="bi bi-box me-1"></i>
                                Producto #{index + 1}
                              </h6>
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => removeItem(index)}
                                disabled={items.length === 1}
                                title="Eliminar producto"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </div>
                          
                          <div className="col-md-6">
                            <label className="form-label fw-bold">🔍 Buscar Producto *</label>
                            <div className="input-group">
                              <span className="input-group-text bg-primary text-white">
                                <i className="bi bi-search"></i>
                              </span>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Nombre, SKU o código..."
                                value={productSearch[index] || ''}
                                onChange={(e) => handleProductSearch(index, e.target.value)}
                              />
                            </div>
                            {productSearch[index] && filteredProducts.length === 0 && (
                              <small className="text-warning">No se encontraron productos</small>
                            )}
                          </div>
                          
                          <div className="col-md-6">
                            <label className="form-label fw-bold">📦 Producto Seleccionado *</label>
                            <select
                              className="form-select form-select-lg"
                              value={item.product_variant}
                              onChange={(e) => handleItemChange(index, 'product_variant', e.target.value)}
                              required
                            >
                              <option value="">Seleccionar producto...</option>
                              {filteredProducts.map(variant => (
                                <option key={variant.id} value={variant.id}>
                                  {variant.name} ({variant.sku})
                                </option>
                              ))}
                            </select>
                            {selectedProduct && (
                              <div className="mt-1">
                                <span className="badge bg-info me-2">SKU: {selectedProduct.sku}</span>
                                {selectedProduct.barcode && (
                                  <span className="badge bg-secondary">Código: {selectedProduct.barcode}</span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="col-md-4">
                            <label className="form-label fw-bold">📊 Cantidad *</label>
                            <div className="input-group">
                              <span className="input-group-text bg-success text-white">
                                <i className="bi bi-hash"></i>
                              </span>
                              <input
                                type="number"
                                className="form-control form-control-lg text-center fw-bold"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                min="0.01"
                                step="0.01"
                                required
                                placeholder="0.00"
                              />
                              <span className="input-group-text">unidades</span>
                            </div>
                          </div>
                          
                          <div className="col-md-4">
                            <label className="form-label fw-bold">💰 Precio Unitario *</label>
                            <div className="input-group">
                              <span className="input-group-text bg-warning text-dark">
                                <i className="bi bi-currency-dollar"></i>
                              </span>
                              <input
                                type="number"
                                className="form-control form-control-lg text-end fw-bold"
                                value={item.unit_price}
                                onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                                min="0"
                                step="0.01"
                                required
                                placeholder="0.00"
                              />
                              <span className="input-group-text">MXN</span>
                            </div>
                          </div>
                          
                          <div className="col-md-4">
                            <label className="form-label fw-bold">💵 Subtotal</label>
                            <div className="card bg-light border-0">
                              <div className="card-body py-2 text-center">
                                <h5 className="mb-0 text-success fw-bold">
                                  {formatCurrency((item.quantity || 0) * (item.unit_price || 0))}
                                </h5>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })}

                  <div className="row mt-4">
                    <div className="col-md-8">
                      <div className="card border-info">
                        <div className="card-body">
                          <h6 className="text-info mb-2">
                            <i className="bi bi-info-circle me-1"></i>
                            Resumen de la Orden
                          </h6>
                          <div className="row text-center">
                            <div className="col-4">
                              <div className="border-end">
                                <h5 className="text-primary mb-0">{items.length}</h5>
                                <small className="text-muted">Productos</small>
                              </div>
                            </div>
                            <div className="col-4">
                              <div className="border-end">
                                <h5 className="text-warning mb-0">
                                  {items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0)}
                                </h5>
                                <small className="text-muted">Unidades</small>
                              </div>
                            </div>
                            <div className="col-4">
                              <h5 className="text-info mb-0">
                                {formatCurrency(calculateTotal() / items.length || 0)}
                              </h5>
                              <small className="text-muted">Promedio</small>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="card bg-gradient text-white" style={{ background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' }}>
                        <div className="card-body text-center">
                          <h6 className="card-title mb-1">
                            <i className="bi bi-calculator me-1"></i>
                            TOTAL DE LA ORDEN
                          </h6>
                          <h2 className="mb-0 fw-bold">
                            {formatCurrency(calculateTotal())}
                          </h2>
                          <small className="opacity-75">Pesos Mexicanos</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <div className="d-flex justify-content-between w-100 align-items-center">
                    <div>
                      <small className="text-muted">
                        <i className="bi bi-info-circle me-1"></i>
                        {items.length} producto{items.length !== 1 ? 's' : ''} • Total: {formatCurrency(calculateTotal())}
                      </small>
                    </div>
                    <div className="d-flex gap-2">
                      <button 
                        type="button" 
                        className="btn btn-outline-secondary btn-lg" 
                        onClick={resetForm}
                        disabled={isSubmitting}
                      >
                        <i className="bi bi-x-circle me-2"></i>
                        Cancelar
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-success btn-lg"
                        disabled={isSubmitting || calculateTotal() <= 0}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Guardando...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check-circle me-2"></i>
                            {editingOrder ? '💾 Actualizar' : '✨ Crear'} Orden
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles */}
      {showDetails && (
        <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-eye me-2"></i>
                  Detalles de Orden #{showDetails.id}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowDetails(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <strong>Proveedor:</strong> {showDetails.supplier_detail?.name || 'N/A'}
                    {showDetails.supplier_detail?.company_name && (
                      <div><small className="text-muted">{showDetails.supplier_detail.company_name}</small></div>
                    )}
                  </div>
                  <div className="col-md-6">
                    <strong>Estado:</strong> 
                    <span className={`badge ms-2 ${statusColors[showDetails.status] || 'bg-secondary'}`}>
                      {statusLabels[showDetails.status] || showDetails.status}
                    </span>
                  </div>
                  <div className="col-md-6">
                    <strong>Fecha de Orden:</strong> {formatDate(showDetails.order_date)}
                  </div>
                  <div className="col-md-6">
                    <strong>Fecha de Entrega:</strong> {formatDate(showDetails.expected_delivery_date)}
                  </div>
                  <div className="col-12">
                    <strong>Notas:</strong> {showDetails.notes || 'Sin notas'}
                  </div>
                </div>

                <h6>Items de la Orden</h6>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Precio Unit.</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {showDetails.items?.map((item, index) => (
                        <tr key={index}>
                          <td>{item.product_variant_detail?.name || 'N/A'}</td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(item.unit_price)}</td>
                          <td>{formatCurrency(item.total_price)}</td>
                        </tr>
                      )) || <tr><td colSpan="4" className="text-center">Sin items</td></tr>}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th colSpan="3">Total:</th>
                        <th>{formatCurrency(showDetails.total_amount)}</th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDetails(null)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PurchaseOrders;
