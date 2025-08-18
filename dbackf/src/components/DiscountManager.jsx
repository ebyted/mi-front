import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DiscountManager = ({ productId, productName, onClose }) => {
  const [customers, setCustomers] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [productId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [customersRes, discountsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/customers/`),
        axios.get(`${import.meta.env.VITE_API_URL}/customer-product-discounts/?product=${productId}`)
      ]);
      
      setCustomers(customersRes.data.results || customersRes.data);
      setDiscounts(discountsRes.data.results || discountsRes.data);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDiscount = async () => {
    if (!selectedCustomer || !discountPercentage) {
      alert('Por favor selecciona un cliente y especifica el descuento');
      return;
    }

    if (discountPercentage < 0 || discountPercentage > 100) {
      alert('El descuento debe estar entre 0% y 100%');
      return;
    }

    try {
      setSaving(true);
      await axios.post(`${import.meta.env.VITE_API_URL}/customer-product-discounts/`, {
        customer: selectedCustomer,
        product: productId,
        discount_percentage: discountPercentage,
        is_active: true
      });

      // Resetear formulario
      setSelectedCustomer('');
      setDiscountPercentage('');
      
      // Recargar descuentos
      await loadData();
      
      alert('Descuento guardado exitosamente');
    } catch (error) {
      console.error('Error guardando descuento:', error);
      alert('Error al guardar el descuento');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDiscount = async (discountId) => {
    if (!confirm('¿Estás seguro de eliminar este descuento?')) return;

    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/customer-product-discounts/${discountId}/`);
      await loadData();
      alert('Descuento eliminado exitosamente');
    } catch (error) {
      console.error('Error eliminando descuento:', error);
      alert('Error al eliminar el descuento');
    }
  };

  const toggleDiscountStatus = async (discountId, currentStatus) => {
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}/customer-product-discounts/${discountId}/`, {
        is_active: !currentStatus
      });
      await loadData();
    } catch (error) {
      console.error('Error cambiando estado:', error);
      alert('Error al cambiar el estado del descuento');
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? `${customer.name} (${customer.email})` : 'Cliente no encontrado';
  };

  if (loading) {
    return (
      <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-body text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          {/* Header */}
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              <i className="bi bi-percent me-2"></i>
              Gestionar Descuentos - {productName}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            <div className="row">
              {/* Formulario para Nuevo Descuento */}
              <div className="col-md-5">
                <div className="card border-success">
                  <div className="card-header bg-success text-white">
                    <h6 className="mb-0">
                      <i className="bi bi-plus-circle me-2"></i>
                      Agregar Nuevo Descuento
                    </h6>
                  </div>
                  <div className="card-body">
                    {/* Búsqueda de Cliente */}
                    <div className="mb-3">
                      <label className="form-label">Buscar Cliente</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Buscar por nombre o email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>

                    {/* Selección de Cliente */}
                    <div className="mb-3">
                      <label className="form-label">Cliente</label>
                      <select 
                        className="form-select"
                        value={selectedCustomer}
                        onChange={(e) => setSelectedCustomer(e.target.value)}
                      >
                        <option value="">Seleccionar cliente...</option>
                        {filteredCustomers.map(customer => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name} - {customer.email}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Porcentaje de Descuento */}
                    <div className="mb-3">
                      <label className="form-label">Descuento (%)</label>
                      <div className="input-group">
                        <input
                          type="number"
                          className="form-control"
                          min="0"
                          max="100"
                          step="0.01"
                          value={discountPercentage}
                          onChange={(e) => setDiscountPercentage(e.target.value)}
                          placeholder="0.00"
                        />
                        <span className="input-group-text">%</span>
                      </div>
                      <div className="form-text">Ingresa un valor entre 0% y 100%</div>
                    </div>

                    {/* Botón Guardar */}
                    <button 
                      className="btn btn-success w-100"
                      onClick={handleSaveDiscount}
                      disabled={saving || !selectedCustomer || !discountPercentage}
                    >
                      {saving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Guardando...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-circle me-2"></i>
                          Agregar Descuento
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista de Descuentos Existentes */}
              <div className="col-md-7">
                <div className="card">
                  <div className="card-header">
                    <h6 className="mb-0">
                      <i className="bi bi-list-ul me-2"></i>
                      Descuentos Configurados ({discounts.length})
                    </h6>
                  </div>
                  <div className="card-body p-0">
                    {discounts.length === 0 ? (
                      <div className="text-center py-4 text-muted">
                        <i className="bi bi-inbox fs-1 mb-2 d-block"></i>
                        <p>No hay descuentos configurados para este producto</p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>Cliente</th>
                              <th>Descuento</th>
                              <th>Estado</th>
                              <th>Fecha</th>
                              <th>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {discounts.map(discount => (
                              <tr key={discount.id}>
                                <td>
                                  <div className="fw-semibold">
                                    {getCustomerName(discount.customer)}
                                  </div>
                                </td>
                                <td>
                                  <span className="badge bg-primary fs-6">
                                    {discount.discount_percentage}%
                                  </span>
                                </td>
                                <td>
                                  <span className={`badge ${discount.is_active ? 'bg-success' : 'bg-secondary'}`}>
                                    {discount.is_active ? 'Activo' : 'Inactivo'}
                                  </span>
                                </td>
                                <td>
                                  <small className="text-muted">
                                    {new Date(discount.created_at).toLocaleDateString()}
                                  </small>
                                </td>
                                <td>
                                  <div className="btn-group btn-group-sm">
                                    <button
                                      className={`btn btn-outline-${discount.is_active ? 'warning' : 'success'}`}
                                      onClick={() => toggleDiscountStatus(discount.id, discount.is_active)}
                                      title={discount.is_active ? 'Desactivar' : 'Activar'}
                                    >
                                      <i className={`bi bi-${discount.is_active ? 'pause' : 'play'}-fill`}></i>
                                    </button>
                                    <button
                                      className="btn btn-outline-danger"
                                      onClick={() => handleDeleteDiscount(discount.id)}
                                      title="Eliminar"
                                    >
                                      <i className="bi bi-trash-fill"></i>
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
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              <i className="bi bi-x-circle me-2"></i>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscountManager;
