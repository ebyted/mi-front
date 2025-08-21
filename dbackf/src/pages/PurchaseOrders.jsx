  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');
    // Validación básica
    if (!formData.supplier || items.length === 0 || items.some(i => !i.product_variant || i.quantity <= 0 || i.unit_price < 0)) {
      setFormError('Completa todos los campos obligatorios y agrega al menos un producto válido.');
      setIsSubmitting(false);
      return;
    }
    const payload = {
      ...formData,
      items: items.map(i => ({
        product_variant: i.product_variant,
        quantity: parseFloat(i.quantity),
        unit_price: parseFloat(i.unit_price)
      }))
    };
    try {
      if (editingOrder) {
        await api.put(`/purchase-orders/${editingOrder.id}/`, payload);
      } else {
        await api.post('/purchase-orders/', payload);
      }
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
      loadData();
    } catch (err) {
      setFormError('Error al guardar la orden.');
    } finally {
      setIsSubmitting(false);
    }
  };

import React, { useState, useEffect } from 'react';
import ProductSelect from '../components/ProductSelect';
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
  const [productOptions, setProductOptions] = useState({});
  const [productLoading, setProductLoading] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [productSearch, setProductSearch] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(null);
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
      const [ordersRes, suppliersRes] = await Promise.all([
        api.get('/purchase-orders/'),
        api.get('/suppliers/')
      ]);
      setOrders(ordersRes.data || []);
      setSuppliers(suppliersRes.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  };

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

  const handleEdit = (order) => {
    setEditingOrder(order);
    setFormData({
      supplier: order.supplier,
      order_date: order.order_date,
      expected_delivery_date: order.expected_delivery_date,
      status: order.status,
      notes: order.notes,
    });
    setItems(
      order.items && Array.isArray(order.items)
        ? order.items.map(item => ({
            product_variant: item.product_variant || '',
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0
          }))
        : [{ product_variant: '', quantity: 1, unit_price: 0 }]
    );
    setShowForm(true);
  };

  const addItem = () => {
    setItems([...items, { product_variant: '', quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleProductSearch = async (index, searchValue) => {
    setProductSearch(prev => ({ ...prev, [index]: searchValue }));
    if (!searchValue || searchValue.length < 2) {
      setProductOptions(prev => ({ ...prev, [index]: [] }));
      return;
    }
    setProductLoading(prev => ({ ...prev, [index]: true }));
    try {
      const res = await api.get(`/products/simple_list/?search=${encodeURIComponent(searchValue)}`);
      setProductOptions(prev => ({ ...prev, [index]: res.data || [] }));
    } catch (err) {
      setProductOptions(prev => ({ ...prev, [index]: [] }));
    } finally {
      setProductLoading(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleProductSelect = (index, product) => {
    const newItems = [...items];
    newItems[index].product_variant = product.id;
    setItems(newItems);
    setProductSearch(prev => ({ ...prev, [index]: product.name }));
    setProductOptions(prev => ({ ...prev, [index]: [] }));
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

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !search || 
      order.supplier_detail?.name?.toLowerCase().includes(search.toLowerCase()) ||
      order.supplier_detail?.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      order.id.toString().includes(search);
    return matchesSearch && (!statusFilter || order.status === statusFilter);
  });


  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col-md-6">
          <input
            type="text"
            className="form-control form-control-lg"
            placeholder="🔍 Buscar proveedor, empresa o ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="col-md-3">
          <select
            className="form-select form-select-lg"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">Todos los estados</option>
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div className="col-md-3 text-end">
          <button className="btn btn-success btn-lg" onClick={() => setShowForm(true)}>
            <i className="bi bi-plus-circle me-2"></i> Nueva Orden
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <span className="spinner-border spinner-border-lg text-primary"></span>
        </div>
      ) : error ? (
        <div className="alert alert-danger text-center">{error}</div>
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
                  <th className="border-0 py-3"><i className="bi bi-hash me-1"></i>ID</th>
                  <th className="border-0 py-3"><i className="bi bi-truck me-1"></i>Proveedor</th>
                  <th className="border-0 py-3"><i className="bi bi-calendar me-1"></i>Fecha</th>
                  <th className="border-0 py-3"><i className="bi bi-calendar-check me-1"></i>Entrega</th>
                  <th className="border-0 py-3"><i className="bi bi-flag me-1"></i>Estado</th>
                  <th className="border-0 py-3"><i className="bi bi-box me-1"></i>Items</th>
                  <th className="border-0 py-3"><i className="bi bi-currency-dollar me-1"></i>Total</th>
                  <th className="border-0 py-3"><i className="bi bi-gear me-1"></i>Acciones</th>
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
                <button type="button" className="btn-close" onClick={() => setShowForm(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {formError && (
                    <div className="alert alert-danger mb-3">{formError}</div>
                  )}
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-bold">Proveedor *</label>
                      <select
                        name="supplier"
                        className="form-select form-select-lg"
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
                      <label className="form-label fw-bold">Fecha de Orden</label>
                      <input
                        type="date"
                        name="order_date"
                        className="form-control form-control-lg"
                        value={formData.order_date || new Date().toISOString().split('T')[0]}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-bold">Fecha de Entrega</label>
                      <input
                        type="date"
                        name="expected_delivery_date"
                        className="form-control form-control-lg"
                        value={formData.expected_delivery_date}
                        onChange={handleFormChange}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold">Estado</label>
                      <select
                        name="status"
                        className="form-select form-select-lg"
                        value={formData.status}
                        onChange={handleFormChange}
                      >
                        {Object.entries(statusLabels).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold">Notas</label>
                      <textarea
                        name="notes"
                        className="form-control form-control-lg"
                        rows="3"
                        value={formData.notes}
                        onChange={handleFormChange}
                        placeholder="Agregue observaciones o comentarios..."
                      />
                    </div>
                  </div>
                  <hr />
                  <h5 className="mb-3">Items de la Orden</h5>
                  {items.map((item, index) => (
                    <div key={index} className="card mb-3">
                      <div className="card-body">
                        <div className="row g-3 align-items-end">
                          <div className="col-md-6">
                            <ProductSelect
                              value={item.product_variant}
                              onChange={val => {
                                const newItems = [...items];
                                newItems[index].product_variant = val;
                                setItems(newItems);
                              }}
                              placeholder="Buscar producto..."
                              required
                            />
                          </div>
                          <div className="col-md-3">
                            <input
                              type="number"
                              className="form-control"
                              value={item.quantity}
                              onChange={e => {
                                const newItems = [...items];
                                newItems[index].quantity = e.target.value;
                                setItems(newItems);
                              }}
                              min="1"
                              required
                              placeholder="Cantidad"
                            />
                          </div>
                          <div className="col-md-3">
                            <input
                              type="number"
                              className="form-control"
                              value={item.unit_price}
                              onChange={e => {
                                const newItems = [...items];
                                newItems[index].unit_price = e.target.value;
                                setItems(newItems);
                              }}
                              min="0"
                              step="0.01"
                              required
                              placeholder="Precio unitario"
                            />
                          </div>
                        </div>
                        <div className="mt-2 text-end">
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => removeItem(index)} disabled={items.length === 1}>
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button" className="btn btn-success" onClick={addItem}>
                    Agregar Producto
                  </button>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
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
                <div className="row mb-3">
                  <div className="col-md-6">
                    <strong>Proveedor:</strong> {showDetails.supplier_detail?.name || 'N/A'}
                    {showDetails.supplier_detail?.company_name && (
                      <span className="text-muted"> - {showDetails.supplier_detail.company_name}</span>
                    )}
                  </div>
                  <div className="col-md-6">
                    <strong>Estado:</strong> <span className={`badge ms-2 ${statusColors[showDetails.status] || 'bg-secondary'}`}>{statusLabels[showDetails.status] || showDetails.status}</span>
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
