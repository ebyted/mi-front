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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Validaciones
    if (!formData.supplier) {
      setFormError('Debe seleccionar un proveedor');
      return;
    }

    if (items.some(item => !item.product_variant || !item.quantity || !item.unit_price)) {
      setFormError('Todos los items deben tener producto, cantidad y precio');
      return;
    }

    const total = calculateTotal();
    if (total <= 0) {
      setFormError('El total debe ser mayor a 0');
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
      loadData();
    } catch (err) {
      console.error('Error saving order:', err);
      setFormError(err.response?.data?.detail || 'Error al guardar la orden');
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
      <div className="row mb-4">
        <div className="col">
          <h2 className="text-primary mb-0">
            <i className="bi bi-cart-plus me-2"></i>
            Órdenes de Compra
          </h2>
          <p className="text-muted">Gestión de órdenes de compra a proveedores</p>
        </div>
        <div className="col-auto">
          <button 
            className="btn btn-success"
            onClick={() => setShowForm(true)}
          >
            <i className="bi bi-plus-circle me-2"></i>
            Nueva Orden
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
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2">Cargando órdenes...</p>
        </div>
      ) : (
        <div className="card shadow">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-primary">
                <tr>
                  <th>ID</th>
                  <th>Proveedor</th>
                  <th>Fecha</th>
                  <th>Entrega</th>
                  <th>Estado</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => (
                  <tr key={order.id}>
                    <td>
                      <strong>#{order.id}</strong>
                    </td>
                    <td>
                      <div>
                        <div className="fw-bold">{order.supplier_detail?.name || 'N/A'}</div>
                        {order.supplier_detail?.company_name && (
                          <small className="text-muted">{order.supplier_detail.company_name}</small>
                        )}
                      </div>
                    </td>
                    <td>{formatDate(order.order_date)}</td>
                    <td>{formatDate(order.expected_delivery_date)}</td>
                    <td>
                      <span className={`badge ${statusColors[order.status] || 'bg-secondary'}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-info">
                        {order.items?.length || 0} items
                      </span>
                    </td>
                    <td>
                      <strong>{formatCurrency(order.total_amount)}</strong>
                    </td>
                    <td>
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

                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label">Proveedor <span className="text-danger">*</span></label>
                      <select
                        name="supplier"
                        className="form-select"
                        value={formData.supplier}
                        onChange={handleFormChange}
                        required
                      >
                        <option value="">Seleccionar proveedor...</option>
                        {suppliers.map(supplier => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name} {supplier.company_name && `- ${supplier.company_name}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Fecha de Orden</label>
                      <input
                        type="date"
                        name="order_date"
                        className="form-control"
                        value={formData.order_date}
                        onChange={handleFormChange}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Fecha de Entrega</label>
                      <input
                        type="date"
                        name="expected_delivery_date" 
                        className="form-control"
                        value={formData.expected_delivery_date}
                        onChange={handleFormChange}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Estado</label>
                      <select
                        name="status"
                        className="form-select"
                        value={formData.status}
                        onChange={handleFormChange}
                      >
                        {Object.entries(statusLabels).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Notas</label>
                      <textarea
                        name="notes"
                        className="form-control"
                        rows="2"
                        value={formData.notes}
                        onChange={handleFormChange}
                        placeholder="Notas adicionales..."
                      />
                    </div>
                  </div>

                  <hr />

                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0">Items de la Orden</h6>
                    <button
                      type="button"
                      className="btn btn-outline-success btn-sm"
                      onClick={addItem}
                    >
                      <i className="bi bi-plus-circle me-1"></i>
                      Agregar Item
                    </button>
                  </div>

                  {items.map((item, index) => (
                    <div key={index} className="row g-2 mb-3 align-items-end">
                      <div className="col-md-5">
                        <label className="form-label small">Producto</label>
                        <select
                          className="form-select"
                          value={item.product_variant}
                          onChange={(e) => handleItemChange(index, 'product_variant', e.target.value)}
                          required
                        >
                          <option value="">Seleccionar producto...</option>
                          {productVariants.map(variant => (
                            <option key={variant.id} value={variant.id}>
                              {variant.name} ({variant.sku})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Cantidad</label>
                        <input
                          type="number"
                          className="form-control"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          min="0.01"
                          step="0.01"
                          required
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Precio Unit.</label>
                        <input
                          type="number"
                          className="form-control"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Subtotal</label>
                        <div className="form-control-plaintext fw-bold">
                          {formatCurrency((item.quantity || 0) * (item.unit_price || 0))}
                        </div>
                      </div>
                      <div className="col-md-1">
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="row">
                    <div className="col-md-8"></div>
                    <div className="col-md-4">
                      <div className="card bg-light">
                        <div className="card-body">
                          <h5 className="text-end mb-0">
                            Total: <span className="text-success">{formatCurrency(calculateTotal())}</span>
                          </h5>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={resetForm}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-success">
                    <i className="bi bi-check-circle me-2"></i>
                    {editingOrder ? 'Actualizar' : 'Crear'} Orden
                  </button>
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
