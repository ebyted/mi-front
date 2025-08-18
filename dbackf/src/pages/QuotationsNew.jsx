import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

// COMPONENTE DE COTIZACIONES COMPLETAMENTE NUEVO Y LIMPIO
function QuotationsNew() {
  // Estados principales
  const [quotations, setQuotations] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Estados del formulario
  const [formData, setFormData] = useState({
    customer_name: '',
    quote_date: '',
    status: 'DRAFT',
    notes: ''
  });

  const [items, setItems] = useState([{
    product_id: '',
    quantity: 1,
    unit_price: 0
  }]);

  const [formError, setFormError] = useState('');

  // Opciones de estado
  const statusOptions = [
    { value: 'DRAFT', label: 'Borrador', color: 'secondary' },
    { value: 'SENT', label: 'Enviada', color: 'info' },
    { value: 'APPROVED', label: 'Aprobada', color: 'success' },
    { value: 'REJECTED', label: 'Rechazada', color: 'danger' },
    { value: 'EXPIRED', label: 'Expirada', color: 'warning' }
  ];

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [quotationsRes, productsRes] = await Promise.all([
        api.get('/quotations/'),
        api.get('/products/')
      ]);
      
      setQuotations(quotationsRes.data.results || quotationsRes.data || []);
      setProducts(productsRes.data.results || productsRes.data || []);
      setError('');
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Error al cargar los datos. Verifique la conexión.');
      setQuotations([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambios en el formulario principal
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Manejar cambios en los items
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  // Agregar item
  const addItem = () => {
    setItems([...items, { product_id: '', quantity: 1, unit_price: 0 }]);
  };

  // Eliminar item
  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Calcular total
  const calculateTotal = () => {
    return items.reduce((total, item) => {
      return total + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
    }, 0);
  };

  // Validar formulario
  const validateForm = () => {
    // Validar datos básicos
    if (!formData.customer_name?.trim()) {
      setFormError('El nombre del cliente es obligatorio');
      return false;
    }

    if (!formData.quote_date) {
      setFormError('La fecha es obligatoria');
      return false;
    }

    // Validar items
    if (items.length === 0) {
      setFormError('Debe agregar al menos un producto');
      return false;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.product_id) {
        setFormError(`Seleccione un producto para el item ${i + 1}`);
        return false;
      }
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        setFormError(`Ingrese una cantidad válida para el item ${i + 1}`);
        return false;
      }
      if (!item.unit_price || parseFloat(item.unit_price) < 0) {
        setFormError(`Ingrese un precio válido para el item ${i + 1}`);
        return false;
      }
    }

    setFormError('');
    return true;
  };

  // Guardar cotización
  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = {
        customer_name: formData.customer_name.trim(),
        quote_date: formData.quote_date,
        status: formData.status,
        notes: formData.notes || '',
        details: items.map(item => ({
          product_id: parseInt(item.product_id),
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price)
        }))
      };

      console.log('🚀 FRONTEND DEBUG - Payload completo:', payload);
      console.log('🚀 FRONTEND DEBUG - JSON stringify:', JSON.stringify(payload, null, 2));
      console.log('🚀 FRONTEND DEBUG - Items originales:', items);
      console.log('🚀 FRONTEND DEBUG - Details procesados:', payload.details);

      if (editingId) {
        const response = await api.put(`/quotations/${editingId}/`, payload);
        console.log('✅ UPDATE Response:', response);
        alert('Cotización actualizada exitosamente');
      } else {
        const response = await api.post('/quotations/', payload);
        console.log('✅ CREATE Response:', response);
        alert('Cotización creada exitosamente');
      }

      handleCloseModal();
      loadData();
    } catch (err) {
      console.error('❌ Error saving quotation:', err);
      console.error('❌ Error response:', err.response);
      console.error('❌ Error response data:', err.response?.data);
      
      // Manejo mejorado de errores
      let errorMsg = 'Error al guardar la cotización';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMsg = err.response.data;
        } else if (err.response.data.detail) {
          errorMsg = err.response.data.detail;
        } else if (err.response.data.error) {
          errorMsg = err.response.data.error;
        } else {
          // Mostrar errores de validación
          const errors = Object.entries(err.response.data).map(([key, value]) => {
            return `${key}: ${Array.isArray(value) ? value.join(', ') : value}`;
          });
          errorMsg = errors.join('; ');
        }
      }
      
      setFormError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // Abrir modal para nueva cotización
  const handleNew = () => {
    setEditingId(null);
    setFormData({
      customer_name: '',
      quote_date: new Date().toISOString().split('T')[0],
      status: 'DRAFT',
      notes: ''
    });
    setItems([{ product_id: '', quantity: 1, unit_price: 0 }]);
    setFormError('');
    setShowModal(true);
  };

  // Abrir modal para editar
  const handleEdit = (quotation) => {
    console.log('🔧 EDIT DEBUG - Quotation completa:', quotation);
    
    setEditingId(quotation.id);
    setFormData({
      customer_name: quotation.customer_name || '',
      quote_date: quotation.quote_date ? quotation.quote_date.split('T')[0] : '',
      status: quotation.status || 'DRAFT',
      notes: quotation.notes || ''
    });
    
    // Mapear los detalles con debug completo
    if (quotation.details && quotation.details.length > 0) {
      console.log('🔧 EDIT DEBUG - Details originales:', quotation.details);
      
      const mappedItems = quotation.details.map(detail => {
        console.log('🔧 EDIT DEBUG - Detail individual:', detail);
        
        return {
          product_id: detail.product_id?.toString() || detail.product?.toString() || '',
          quantity: detail.quantity || 1,
          unit_price: detail.unit_price || detail.price || 0
        };
      });
      
      console.log('🔧 EDIT DEBUG - Items mapeados:', mappedItems);
      setItems(mappedItems);
    } else {
      console.log('🔧 EDIT DEBUG - No hay details, usando item por defecto');
      setItems([{ product_id: '', quantity: 1, unit_price: 0 }]);
    }
    
    setFormError('');
    setShowModal(true);
  };

  // Eliminar cotización
  const handleDelete = async (quotation) => {
    if (!confirm(`¿Está seguro de eliminar la cotización #${quotation.id}?`)) {
      return;
    }

    try {
      await api.delete(`/quotations/${quotation.id}/`);
      alert('Cotización eliminada exitosamente');
      loadData();
    } catch (err) {
      console.error('Error deleting quotation:', err);
      alert('Error al eliminar la cotización');
    }
  };

  // Cerrar modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormError('');
  };

  // Obtener etiqueta de estado
  const getStatusBadge = (status) => {
    const option = statusOptions.find(opt => opt.value === status) || statusOptions[0];
    return (
      <span className={`badge bg-${option.color}`}>
        {option.label}
      </span>
    );
  };

  // Obtener nombre del producto
  const getProductName = (productId) => {
    const product = products.find(p => p.id === parseInt(productId));
    return product ? product.name : 'Producto no encontrado';
  };

  if (loading) {
    return (
      <div className="container py-5">
        <div className="d-flex justify-content-center align-items-center" style={{height: '400px'}}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 text-primary mb-1">
            <i className="bi bi-clipboard-data me-2"></i>
            Cotizaciones
          </h1>
          <p className="text-muted mb-0">Gestión completa de cotizaciones y presupuestos</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={handleNew}
        >
          <i className="bi bi-plus-lg me-2"></i>
          Nueva Cotización
        </button>
      </div>

      {/* Mensaje de error global */}
      {error && (
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      {/* Tabla de cotizaciones */}
      <div className="card shadow-sm">
        <div className="card-header bg-light">
          <h5 className="card-title mb-0">
            <i className="bi bi-list-ul me-2"></i>
            Lista de Cotizaciones ({quotations.length})
          </h5>
        </div>
        <div className="card-body p-0">
          {quotations.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-clipboard-x display-1 text-muted"></i>
              <h5 className="text-muted mt-3">No hay cotizaciones registradas</h5>
              <p className="text-muted">Haz clic en "Nueva Cotización" para comenzar</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th>Total</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map(quotation => (
                    <tr key={quotation.id}>
                      <td>
                        <span className="fw-bold text-primary">#{quotation.id}</span>
                      </td>
                      <td>{quotation.customer_name || 'Sin nombre'}</td>
                      <td>
                        {quotation.quote_date ? 
                          new Date(quotation.quote_date).toLocaleDateString('es-ES') : 
                          'Sin fecha'
                        }
                      </td>
                      <td>{getStatusBadge(quotation.status)}</td>
                      <td>
                        <span className="fw-bold text-success">
                          ${parseFloat(quotation.total_amount || 0).toLocaleString('es-ES', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-primary"
                            onClick={() => handleEdit(quotation)}
                            title="Editar"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleDelete(quotation)}
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
          )}
        </div>
      </div>

      {/* Modal del formulario */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="bi bi-clipboard-plus me-2"></i>
                  {editingId ? 'Editar Cotización' : 'Nueva Cotización'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={handleCloseModal}
                ></button>
              </div>
              
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  {/* Información básica */}
                  <div className="row mb-4">
                    <div className="col-md-6">
                      <label className="form-label fw-bold">
                        Cliente <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        name="customer_name"
                        className="form-control"
                        value={formData.customer_name}
                        onChange={handleFormChange}
                        placeholder="Ingrese el nombre del cliente"
                        required
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-bold">
                        Fecha <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        name="quote_date"
                        className="form-control"
                        value={formData.quote_date}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-bold">Estado</label>
                      <select
                        name="status"
                        className="form-select"
                        value={formData.status}
                        onChange={handleFormChange}
                      >
                        {statusOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="row mb-4">
                    <div className="col-12">
                      <label className="form-label fw-bold">Notas</label>
                      <textarea
                        name="notes"
                        className="form-control"
                        rows="3"
                        value={formData.notes}
                        onChange={handleFormChange}
                        placeholder="Notas adicionales sobre la cotización..."
                      />
                    </div>
                  </div>

                  {/* Productos */}
                  <div className="border rounded p-3 mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="text-primary mb-0">
                        <i className="bi bi-box-seam me-2"></i>
                        Productos
                      </h6>
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={addItem}
                      >
                        <i className="bi bi-plus-lg me-1"></i>
                        Agregar Producto
                      </button>
                    </div>

                    {items.map((item, index) => (
                      <div key={index} className="row g-2 mb-3 align-items-end">
                        <div className="col-md-5">
                          <label className="form-label small">Producto</label>
                          <select
                            className="form-select"
                            value={item.product_id}
                            onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                            required
                          >
                            <option value="">Seleccionar producto</option>
                            {products.map(product => (
                              <option key={product.id} value={product.id}>
                                {product.name} {product.sku ? `(${product.sku})` : ''}
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
                            required
                            min="0.01"
                            step="0.01"
                          />
                        </div>
                        <div className="col-md-2">
                          <label className="form-label small">Precio Unit.</label>
                          <input
                            type="number"
                            className="form-control"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                            required
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="col-md-2">
                          <label className="form-label small">Total</label>
                          <div className="form-control-plaintext fw-bold text-success">
                            ${((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toLocaleString('es-ES', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </div>
                        </div>
                        <div className="col-md-1">
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm w-100"
                            onClick={() => removeItem(index)}
                            disabled={items.length === 1}
                            title="Eliminar"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="text-end mt-3 pt-3 border-top">
                      <h5 className="text-success mb-0">
                        Total General: 
                        <span className="fw-bold ms-2">
                          ${calculateTotal().toLocaleString('es-ES', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </span>
                      </h5>
                    </div>
                  </div>

                  {/* Error del formulario */}
                  {formError && (
                    <div className="alert alert-danger">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      {formError}
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCloseModal}
                  >
                    <i className="bi bi-x-lg me-1"></i>
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-floppy me-2"></i>
                        {editingId ? 'Actualizar' : 'Guardar'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuotationsNew;
