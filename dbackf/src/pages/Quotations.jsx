import React, { useEffect, useState } from 'react';
import ProductSelect from '../components/ProductSelect';
import { api } from '../services/api';

function Quotations() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Estados para datos relacionados
  // customers eliminado - ahora usamos texto libre
  const [products, setProducts] = useState([]);
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    customer_name: '', // Cambiado a texto abierto
    quote_date: '',
    status: 'DRAFT',
    notes: ''
  });
  
  const [details, setDetails] = useState([{
    product_id: '',
    quantity: 1,
    unit_price: 0
  }]);
  
  const [formError, setFormError] = useState('');

  // Cargar datos iniciales
  useEffect(() => {
    loadQuotations();
    loadProducts(); // Ya no necesitamos cargar customers
  }, []);

  const loadQuotations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/quotations/');
      setQuotations(response.data.results || response.data || []);
      setError('');
    } catch (err) {
      console.error('Error loading quotations:', err);
      setError('No se pudieron cargar las cotizaciones.');
      setQuotations([]);
    } finally {
      setLoading(false);
    }
  };

  // loadCustomers eliminado - ya no necesitamos cargar customers

  const loadProducts = async () => {
    try {
      const response = await api.get('/products/');
      setProducts(response.data.results || response.data || []);
    } catch (err) {
      console.error('Error loading products:', err);
      setProducts([]);
    }
  };

  // Handlers del formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDetailChange = (index, field, value) => {
    const newDetails = [...details];
    newDetails[index] = {
      ...newDetails[index],
      [field]: value
    };
    setDetails(newDetails);
  };

  const addDetail = () => {
    setDetails([...details, {
      product_id: '',
      quantity: 1,
      unit_price: 0
    }]);
  };

  const removeDetail = (index) => {
    if (details.length > 1) {
      setDetails(details.filter((_, i) => i !== index));
    }
  };

  // Calcular total
  const calculateTotal = () => {
    return details.reduce((total, detail) => {
      return total + (parseFloat(detail.quantity) || 0) * (parseFloat(detail.unit_price) || 0);
    }, 0).toFixed(2);
  };

  // Validar formulario
  const validateForm = () => {
    if (!formData.customer_name?.trim() || !formData.quote_date) {
      setFormError('Cliente y fecha son obligatorios.');
      return false;
    }

    if (details.some(d => !d.product_id || !d.quantity || parseFloat(d.quantity) <= 0)) {
      setFormError('Todos los productos deben tener cantidad válida.');
      return false;
    }

    setFormError('');
    return true;
  };

  // Enviar formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSaving(true);
    try {
      const quotationData = {
        customer_name: formData.customer_name.trim(),
        quote_date: formData.quote_date,
        status: formData.status,
        notes: formData.notes,
        total_amount: parseFloat(calculateTotal()),
        details: details.map(detail => ({
          product_id: parseInt(detail.product_id),
          quantity: parseFloat(detail.quantity),
          unit_price: parseFloat(detail.unit_price)
        }))
      };

      if (editingQuotation) {
        await api.put(`/quotations/${editingQuotation.id}/`, quotationData);
        alert('Cotización actualizada exitosamente');
      } else {
        await api.post('/quotations/', quotationData);
        alert('Cotización creada exitosamente');
      }

      // Limpiar formulario y recargar datos
      resetForm();
      setShowForm(false);
      loadQuotations();
    } catch (err) {
      console.error('Error saving quotation:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.detail || 
                          'Error al guardar la cotización';
      setFormError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Limpiar formulario
  const resetForm = () => {
    setFormData({
      customer_name: '',
      quote_date: '',
      status: 'DRAFT',
      notes: ''
    });
    setDetails([{
      product_id: '',
      quantity: 1,
      unit_price: 0
    }]);
    setFormError('');
    setEditingQuotation(null);
  };

  // Editar cotización
  const handleEdit = (quotation) => {
    setEditingQuotation(quotation);
    setFormData({
      customer_name: quotation.customer_name || '',
      quote_date: quotation.quote_date || '',
      status: quotation.status || 'DRAFT',
      notes: quotation.notes || ''
    });
    setDetails(quotation.details?.length > 0 ? quotation.details.map(detail => ({
      product_id: detail.product_id?.toString() || '',
      quantity: detail.quantity || 1,
      unit_price: detail.unit_price || 0
    })) : [{
      product_id: '',
      quantity: 1,
      unit_price: 0
    }]);
    setShowForm(true);
  };

  // Eliminar cotización
  const handleDelete = async (quotation) => {
    if (!confirm(`¿Estás seguro de eliminar la cotización #${quotation.id}?`)) {
      return;
    }

    try {
      await api.delete(`/quotations/${quotation.id}/`);
      alert('Cotización eliminada exitosamente');
      loadQuotations();
    } catch (err) {
      console.error('Error deleting quotation:', err);
      alert('Error al eliminar la cotización');
    }
  };

  // getCustomerName eliminado - ya no necesitamos buscar customers

  // Obtener nombre del producto
  const getProductName = (productId) => {
    const product = products.find(p => p.id === parseInt(productId));
    return product ? product.name : 'Seleccionar producto';
  };

  // Estados de cotización
  const statusOptions = [
    { value: 'DRAFT', label: 'Borrador', class: 'secondary' },
    { value: 'SENT', label: 'Enviada', class: 'info' },
    { value: 'APPROVED', label: 'Aprobada', class: 'success' },
    { value: 'REJECTED', label: 'Rechazada', class: 'danger' },
    { value: 'EXPIRED', label: 'Expirada', class: 'warning' }
  ];

  const getStatusBadge = (status) => {
    const statusOption = statusOptions.find(s => s.value === status) || statusOptions[0];
    return (
      <span className={`badge bg-${statusOption.class}`}>
        {statusOption.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="container py-5">
        <div className="d-flex justify-content-center align-items-center" style={{height: '300px'}}>
          <div className="spinner-border text-info" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="display-5 text-info mb-1">
            <i className="bi bi-clipboard-data me-2"></i>
            Cotizaciones
          </h2>
          <p className="text-muted mb-0">Gestión de cotizaciones y presupuestos</p>
        </div>
        <button 
          className="btn btn-info"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <i className="bi bi-plus-lg me-2"></i>
          Nueva Cotización
        </button>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      {/* Lista de cotizaciones */}
      <div className="card shadow">
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
              <p className="text-muted">Haz clic en "Nueva Cotización" para crear una</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-info">
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
                        <span className="fw-bold">#{quotation.id}</span>
                      </td>
                      <td>{quotation.customer_name || 'Sin nombre'}</td>
                      <td>{new Date(quotation.quote_date).toLocaleDateString()}</td>
                      <td>{getStatusBadge(quotation.status)}</td>
                      <td>
                        <span className="fw-bold text-success">
                          ${parseFloat(quotation.total_amount || 0).toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => handleEdit(quotation)}
                            title="Editar"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleDelete(quotation)}
                            title="Eliminar"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                          <button
                            className="btn btn-outline-info btn-sm"
                            title="Ver detalles"
                          >
                            <i className="bi bi-eye"></i>
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
      {showForm && (
        <div className="modal fade show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-info text-white">
                <h5 className="modal-title">
                  <i className="bi bi-clipboard-plus me-2"></i>
                  {editingQuotation ? 'Editar Cotización' : 'Nueva Cotización'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={() => setShowForm(false)}
                ></button>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {/* Información básica */}
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-bold">
                        Cliente <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        name="customer_name"
                        className="form-control"
                        value={formData.customer_name}
                        onChange={handleChange}
                        placeholder="Ingrese el nombre del cliente"
                        required
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-bold">
                        Fecha <span className="text-danger">*</span>
                      </label>
                      <input
                        name="quote_date"
                        type="date"
                        className="form-control"
                        value={formData.quote_date}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-bold">Estado</label>
                      <select
                        name="status"
                        className="form-select"
                        value={formData.status}
                        onChange={handleChange}
                      >
                        {statusOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">Notas</label>
                    <textarea
                      name="notes"
                      className="form-control"
                      rows="2"
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder="Notas adicionales sobre la cotización..."
                    />
                  </div>

                  {/* Detalles de productos */}
                  <div className="bg-light p-3 rounded mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="text-info mb-0">
                        <i className="bi bi-box-seam me-2"></i>
                        Productos
                      </h6>
                      <button
                        type="button"
                        className="btn btn-outline-info btn-sm"
                        onClick={addDetail}
                      >
                        <i className="bi bi-plus-lg me-1"></i>
                        Agregar
                      </button>
                    </div>

                    {details.map((detail, index) => (
                      <div key={index} className="row g-2 mb-2">
                        <div className="col-md-5">
                          <ProductSelect
                            value={detail.product_id}
                            onChange={val => handleDetailChange(index, 'product_id', val)}
                            placeholder="Buscar producto por nombre o SKU..."
                            required
                          />
                        </div>
                        <div className="col-md-2">
                          <input
                            type="number"
                            className="form-control"
                            placeholder="Cantidad"
                            value={detail.quantity}
                            onChange={(e) => handleDetailChange(index, 'quantity', e.target.value)}
                            required
                            min="1"
                            step="1"
                          />
                        </div>
                        <div className="col-md-3">
                          <input
                            type="number"
                            className="form-control"
                            placeholder="Precio unitario"
                            value={detail.unit_price}
                            onChange={(e) => handleDetailChange(index, 'unit_price', e.target.value)}
                            required
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="col-md-1">
                          <div className="text-center fw-bold text-success">
                            ${(parseFloat(detail.quantity) * parseFloat(detail.unit_price) || 0).toFixed(2)}
                          </div>
                        </div>
                        <div className="col-md-1">
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm w-100"
                            onClick={() => removeDetail(index)}
                            disabled={details.length === 1}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="text-end mt-3 pt-2 border-top">
                      <h5 className="text-success mb-0">
                        Total: <span className="fw-bold">${calculateTotal()}</span>
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
                    onClick={() => setShowForm(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-info"
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
                        {editingQuotation ? 'Actualizar' : 'Guardar'}
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

export default Quotations;
