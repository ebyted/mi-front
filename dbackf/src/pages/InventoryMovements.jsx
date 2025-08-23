import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import useDocumentTitle from '../hooks/useDocumentTitle';
import ProductSelect from '../components/ProductSelect';

const InventoryMovements = () => {
  // Hook para cambiar el título de la pestaña
  useDocumentTitle('Movimientos de Inventario - Maestro Inventario');
  
  const [movements, setMovements] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMovement, setEditingMovement] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [saving, setSaving] = useState(false);
  
  // Estados para modales de autorización y cancelación
  const [showAuthorizeModal, setShowAuthorizeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  
  // Estado para modal de detalles
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [movementDetails, setMovementDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    warehouse_id: '',
    type: 'IN',
    notes: '',
    details: []
  });

  const [currentDetail, setCurrentDetail] = useState({
    product_id: '',
    product_name: '',
    product_code: '',
    quantity: '',
    lote: '',
    expiration_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchMovements();
    fetchWarehouses();
  }, []);

  const fetchMovements = async () => {
    try {
      const response = await api.get('/inventory-movements/');
      setMovements(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/warehouses/');
      setWarehouses(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };



  const fetchMovementDetails = async (movementId) => {
    setLoadingDetails(true);
    try {
      const response = await api.get(`/inventory-movements/${movementId}/`);
      setMovementDetails(response.data);
    } catch (error) {
      console.error('Error fetching movement details:', error);
      alert('Error al cargar los detalles del movimiento');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.details.length === 0) {
      alert('Debes agregar al menos un producto al movimiento');
      return;
    }

    setSaving(true);
    try {
      const movementData = {
        warehouse_id: parseInt(formData.warehouse_id),
        type: formData.type,
        notes: formData.notes,
        details: formData.details.map(detail => ({
          product_id: detail.product_id,
          quantity: parseFloat(detail.quantity),
          lote: detail.lote || '',
          expiration_date: detail.expiration_date || null,
          notes: detail.notes || ''
        }))
      };

      if (editingMovement) {
        await api.put(`/inventory-movements/${editingMovement.id}/`, movementData);
        alert('Movimiento actualizado exitosamente');
      } else {
        await api.post('/inventory-movements/', movementData);
        alert('Movimiento creado exitosamente');
      }

      setShowForm(false);
      setEditingMovement(null);
      resetForm();
      fetchMovements();
    } catch (error) {
      console.error('Error saving movement:', error);
      alert('Error al guardar el movimiento: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      warehouse_id: '',
      type: 'IN',
      notes: '',
      details: []
    });
    setCurrentDetail({
      product_id: '',
      product_name: '',
      product_code: '',
      quantity: '',
      lote: '',
      expiration_date: '',
      notes: ''
    });
  };

  const addDetail = () => {
    if (!currentDetail.product_id || !currentDetail.quantity) {
      alert('Producto y cantidad son requeridos');
      return;
    }

    if (parseFloat(currentDetail.quantity) <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    // El nombre y código se guardan desde el autocomplete
    const newDetail = {
      ...currentDetail,
      product_id: parseInt(currentDetail.product_id),
      quantity: parseFloat(currentDetail.quantity)
    };

    setFormData(prev => ({
      ...prev,
      details: [...prev.details, newDetail]
    }));

    setCurrentDetail({
      product_id: '',
      product_name: '',
      product_code: '',
      quantity: '',
      lote: '',
      expiration_date: '',
      notes: ''
    });
  };

  const removeDetail = (index) => {
    setFormData(prev => ({
      ...prev,
      details: prev.details.filter((_, i) => i !== index)
    }));
  };

  const handleEdit = (movement) => {
    setEditingMovement(movement);
    setFormData({
      warehouse_id: movement.warehouse_id,
      type: movement.type,
      notes: movement.notes || '',
      details: movement.details || []
    });
    setShowForm(true);
  };

  const handleNew = () => {
    resetForm();
    setEditingMovement(null);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingMovement(null);
    resetForm();
  };

  const handleDelete = async (movement) => {
    if (movement.authorized) {
      alert('No se puede eliminar un movimiento autorizado. Debe cancelarlo en su lugar.');
      return;
    }

    if (!movement.can_delete) {
      alert('No tienes permisos para eliminar este movimiento');
      return;
    }

    if (confirm('¿Estás seguro de que quieres eliminar este movimiento?')) {
      try {
        await api.delete(`/inventory-movements/${movement.id}/`);
        alert('Movimiento eliminado exitosamente');
        fetchMovements();
      } catch (error) {
        console.error('Error deleting movement:', error);
        alert(`Error eliminando movimiento: ${error.response?.data?.error || error.message}`);
      }
    }
  };

  const handleAuthorize = (movement) => {
    if (!movement.can_authorize) {
      alert('No puedes autorizar este movimiento');
      return;
    }
    setSelectedMovement(movement);
    setShowAuthorizeModal(true);
  };

  const confirmAuthorize = async () => {
    try {
      await api.post(`/inventory-movements/${selectedMovement.id}/authorize/`);
      alert('Movimiento autorizado exitosamente');
      setShowAuthorizeModal(false);
      setSelectedMovement(null);
      fetchMovements();
    } catch (error) {
      console.error('Error authorizing movement:', error);
      alert(`Error autorizando movimiento: ${error.response?.data?.error || error.message}`);
    }
  };

  const confirmCancel = async () => {
    if (!cancellationReason.trim()) {
      alert('Debe proporcionar una razón para la cancelación');
      return;
    }

    try {
      await api.post(`/inventory-movements/${selectedMovement.id}/cancel_movement/`, {
        reason: cancellationReason
      });
      alert('Movimiento cancelado exitosamente');
      setShowCancelModal(false);
      setSelectedMovement(null);
      setCancellationReason('');
      fetchMovements();
    } catch (error) {
      console.error('Error cancelling movement:', error);
      alert(`Error cancelando movimiento: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleViewDetails = async (movement) => {
    setSelectedMovement(movement);
    setShowDetailsModal(true);
    await fetchMovementDetails(movement.id);
  };

  const handleCancelMovement = (movement) => {
    if (!movement.can_cancel) {
      alert('No se puede cancelar este movimiento');
      return;
    }
    setSelectedMovement(movement);
    setCancellationReason('');
    setShowCancelModal(true);
  };

  const getStatusBadge = (movement) => {
    if (movement.is_cancelled) {
      return <span className="badge bg-danger">Cancelado</span>;
    } else if (movement.authorized) {
      return <span className="badge bg-success">Autorizado</span>;
    } else {
      return <span className="badge bg-warning text-dark">Pendiente Autorización</span>;
    }
  };

  const renderActions = (movement) => {
    return (
      <div className="d-flex gap-1 flex-wrap">
        {/* Botón Autorizar */}
        {movement.can_authorize && (
          <button
            className="btn btn-success btn-sm"
            onClick={() => handleAuthorize(movement)}
            title="Autorizar movimiento"
          >
            ✅
          </button>
        )}
        
        {/* Botón Editar */}
        {movement.can_delete && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => handleEdit(movement)}
            title="Editar movimiento"
          >
            ✏️
          </button>
        )}
        
        {/* Botón Eliminar */}
        {movement.can_delete && (
          <button
            className="btn btn-danger btn-sm"
            onClick={() => handleDelete(movement)}
            title="Eliminar movimiento"
          >
            🗑️
          </button>
        )}
        
        {/* Botón Cancelar */}
        {movement.can_cancel && (
          <button
            className="btn btn-warning btn-sm"
            onClick={() => handleCancelMovement(movement)}
            title="Cancelar movimiento"
          >
            ❌
          </button>
        )}
        
        {/* Botón Ver */}
        <button
          className="btn btn-info btn-sm"
          onClick={() => handleViewDetails(movement)}
          title="Ver detalles"
        >
          👁️
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container py-5">
        <div className="d-flex justify-content-center align-items-center" style={{minHeight: '300px'}}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted">Cargando movimientos de inventario...</p>
          </div>
        </div>
      </div>
    );
  }

  // Filtrar movimientos por producto seleccionado
  const filteredMovements = selectedProductId
    ? movements.filter(mov =>
        mov.details && mov.details.some(detail => detail.product_id === selectedProductId)
      )
    : movements;

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="display-5 mb-0 text-primary">
            📦 Movimientos de Inventario
          </h1>
          <div className="mt-2">
            <ProductSelect
              value={selectedProductId}
              onChange={setSelectedProductId}
              placeholder="Filtrar por producto..."
              required={false}
              className="w-100"
            />
            {selectedProductId && (
              <button
                className="btn btn-sm btn-outline-secondary mt-2"
                onClick={() => setSelectedProductId(null)}
              >
                Limpiar filtro
              </button>
            )}
          </div>
        </div>
        <div className="d-flex gap-3">
          <div className="text-center">
            <div className="h4 mb-0 text-primary">{filteredMovements.length}</div>
            <small className="text-muted">Total</small>
          </div>
          <div className="text-center">
            <div className="h4 mb-0 text-success">{filteredMovements.filter(m => m.type === 'IN' || m.movement_type === 'IN').length}</div>
            <small className="text-muted">Entradas</small>
          </div>
          <div className="text-center">
            <div className="h4 mb-0 text-warning">{filteredMovements.filter(m => m.type === 'OUT' || m.movement_type === 'OUT').length}</div>
            <small className="text-muted">Salidas</small>
          </div>
        </div>
      </div>

      {!showForm ? (
        // Vista de lista
        <div>
          <div className="row mb-3">
            <div className="col">
              <div className="d-flex justify-content-end">
                <button
                  onClick={handleNew}
                  className="btn btn-primary"
                >
                  ➕ Nuevo Movimiento
                </button>
              </div>
            </div>
          </div>

          {loading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
              <p className="mt-3 text-muted">Cargando movimientos...</p>
            </div>
          )}
          
          {!loading && (
            <div className="table-responsive">
              <table className="table table-bordered table-hover">
                <thead className="table-primary">
                  <tr>
                    <th>ID</th>
                    <th>Fecha</th>
                    <th>Almacén</th>
                    <th>Tipo</th>
                    <th>Creado Por</th>
                    <th>Estado</th>
                    <th>Autorizado Por</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-5">
                        <div className="text-muted">
                          <div className="h1 mb-3">📦</div>
                          <h5>No hay movimientos registrados</h5>
                          <p>Crea tu primer movimiento de inventario</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((movement) => (
                      <tr key={movement.id}>
                        <td>
                          <span className="fw-bold">#{movement.id}</span>
                        </td>
                        <td>
                          {new Date(movement.created_at).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                          <br />
                          <small className="text-muted">
                            {new Date(movement.created_at).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </small>
                        </td>
                        <td>
                          <span className="badge bg-info">
                            {movement.warehouse_name || 'N/A'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${
                            (movement.type === 'IN' || movement.movement_type === 'IN')
                              ? 'bg-success' 
                              : 'bg-danger'
                          }`}>
                            {(movement.type === 'IN' || movement.movement_type === 'IN') ? '📥 Entrada' : '📤 Salida'}
                          </span>
                        </td>
                        <td>
                          <small className="text-muted">
                            {/* Email */}
                            {movement.created_by?.email || movement.created_by_email || movement.user_email || movement.user?.email || movement.created_by || 'N/A'}
                            {/* Nombre */}
                            {movement.created_by?.name || movement.created_by_name ? (
                              <span className="ms-2">({movement.created_by?.name || movement.created_by_name})</span>
                            ) : null}
                          </small>
                        </td>
                        <td>
                          {getStatusBadge(movement)}
                        </td>
                        <td>
                          <small className="text-muted">
                            {/* Email */}
                            {movement.authorized_by?.email || movement.authorized_by_email || movement.authorized_by || (movement.authorized ? 'Autorizado' : <span className="text-muted">Pendiente</span>)}
                            {/* Nombre */}
                            {movement.authorized_by?.name || movement.authorized_by_name ? (
                              <span className="ms-2">({movement.authorized_by?.name || movement.authorized_by_name})</span>
                            ) : null}
                          </small>
                          {movement.authorized_at && (
                            <><br /><small className="text-muted">{new Date(movement.authorized_at).toLocaleDateString('es-ES')}</small></>
                          )}
                        </td>
                        <td>
                          {renderActions(movement)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        // Vista de formulario
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow mb-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="h3 mb-0 text-primary">
              {editingMovement ? '✏️ Editar Movimiento' : '➕ Nuevo Movimiento'}
            </h2>
            <button
              type="button"
              onClick={handleCancel}
              className="btn btn-outline-secondary"
            >
              ✖ Cancelar
            </button>
          </div>

          {/* Información básica */}
          <div className="mb-4">
            <h5 className="text-primary mb-3">📋 Información Básica</h5>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Almacén *</label>
                <select
                  value={formData.warehouse_id}
                  onChange={(e) => setFormData(prev => ({...prev, warehouse_id: e.target.value}))}
                  className="form-select"
                  required
                >
                  <option value="">Seleccionar almacén</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Tipo de Movimiento *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({...prev, type: e.target.value}))}
                  className="form-select"
                >
                  <option value="IN">📥 Entrada</option>
                  <option value="OUT">📤 Salida</option>
                </select>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Notas del Movimiento</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))}
                className="form-control"
                rows="3"
                placeholder="Descripción del movimiento..."
              />
            </div>
          </div>

          {/* Agregar productos */}
          <div className="mb-4">
            <h5 className="text-primary mb-3">📦 Agregar Productos</h5>
            <div className="card bg-light">
              <div className="card-body">
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Producto *</label>
                    <ProductSelect
                      value={currentDetail.product_id}
                      onChange={(value) => setCurrentDetail(prev => ({...prev, product_id: value}))}
                      onProductSelect={product => setCurrentDetail(prev => ({
                        ...prev,
                        product_id: product.id,
                        product_name: product.name,
                        product_code: product.sku || product.code || ''
                      }))}
                      placeholder="Buscar producto por nombre o SKU..."
                      required
                      className="w-100"
                    />
                  </div>

                  <div className="col-md-3 mb-3">
                    <label className="form-label">Cantidad *</label>
                    <input
                      type="number"
                      value={currentDetail.quantity}
                      onChange={(e) => setCurrentDetail(prev => ({...prev, quantity: e.target.value}))}
                      className="form-control"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="col-md-3 mb-3">
                    <label className="form-label">Lote</label>
                    <input
                      type="text"
                      value={currentDetail.lote}
                      onChange={(e) => setCurrentDetail(prev => ({...prev, lote: e.target.value}))}
                      className="form-control"
                      placeholder="Número de lote (opcional)"
                    />
                  </div>

                  <div className="col-md-3 mb-3">
                    <label className="form-label">Fecha de Expiración</label>
                    <input
                      type="date"
                      value={currentDetail.expiration_date}
                      onChange={(e) => setCurrentDetail(prev => ({...prev, expiration_date: e.target.value}))}
                      className="form-control"
                    />
                    <small className="text-muted">Campo opcional</small>
                  </div>

                  <div className="col-md-2 mb-3">
                    <label className="form-label">&nbsp;</label>
                    <button
                      type="button"
                      onClick={addDetail}
                      className="btn btn-success w-100"
                    >
                      ➕ Agregar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de productos agregados */}
          {formData.details.length > 0 && (
            <div className="mb-4">
              <h5 className="text-primary mb-3">📋 Productos en el Movimiento</h5>
              <div className="table-responsive">
                <table className="table table-striped table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th>Producto</th>
                      <th className="text-center">Cantidad</th>
                      <th className="text-center">Lote</th>
                      <th className="text-center">Fecha Exp.</th>
                      <th className="text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.details.map((detail, index) => (
                      <tr key={index}>
                        <td>
                          <div>
                            <div className="fw-bold">{detail.product_name}</div>
                            {detail.product_code && (
                              <small className="text-muted">Código: {detail.product_code}</small>
                            )}
                          </div>
                        </td>
                        <td className="text-center">
                          <span className="badge bg-primary fs-6">{detail.quantity}</span>
                        </td>
                        <td className="text-center">
                          {detail.lote ? (
                            <small className="text-info">{detail.lote}</small>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="text-center">
                          {detail.expiration_date ? (
                            <small>{new Date(detail.expiration_date).toLocaleDateString('es-ES')}</small>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            onClick={() => removeDetail(index)}
                            className="btn btn-sm btn-outline-danger"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="d-flex gap-2 pt-3 border-top">
            <button
              type="button"
              onClick={handleCancel}
              className="btn btn-secondary"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={formData.details.length === 0 || saving}
              className={`btn ${
                formData.details.length === 0 || saving
                  ? 'btn-secondary'
                  : 'btn-primary'
              } flex-fill`}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Guardando...
                </>
              ) : (
                <>💾 {editingMovement ? 'Actualizar Movimiento' : 'Guardar Movimiento'}</>
              )}
            </button>
          </div>

          {formData.details.length === 0 && (
            <div className="alert alert-warning mt-3">
              ⚠️ Debes agregar al menos un producto para poder guardar el movimiento
            </div>
          )}
        </form>
      )}

      {/* Modal de Autorización */}
      {showAuthorizeModal && (
        <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  ✅ Autorizar Movimiento
                </h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setShowAuthorizeModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-info">
                  ℹ️ ¿Está seguro de que desea autorizar el movimiento #{selectedMovement?.id}?
                </div>
                <p><strong>Almacén:</strong> {selectedMovement?.warehouse_name}</p>
                <p><strong>Tipo:</strong> {(selectedMovement?.type === 'IN' || selectedMovement?.movement_type === 'IN') ? 'Entrada' : 'Salida'}</p>
                <p><strong>Creado por:</strong> {selectedMovement?.created_by_email}</p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowAuthorizeModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn btn-success"
                  onClick={confirmAuthorize}
                >
                  ✅ Autorizar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cancelación */}
      {showCancelModal && (
        <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  ❌ Cancelar Movimiento
                </h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setShowCancelModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning">
                  ⚠️ ¿Está seguro de que desea cancelar el movimiento #{selectedMovement?.id}?
                </div>
                <p><strong>Almacén:</strong> {selectedMovement?.warehouse_name}</p>
                <p><strong>Tipo:</strong> {(selectedMovement?.type === 'IN' || selectedMovement?.movement_type === 'IN') ? 'Entrada' : 'Salida'}</p>
                
                <div className="mb-3">
                  <label className="form-label fw-bold">
                    Razón de cancelación <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    placeholder="Ingrese la razón por la cual se cancela este movimiento..."
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowCancelModal(false)}
                >
                  Volver
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={confirmCancel}
                  disabled={!cancellationReason.trim()}
                >
                  ❌ Cancelar Movimiento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles */}
      {showDetailsModal && (
        <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  👁️ Detalles del Movimiento #{selectedMovement?.id}
                </h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setMovementDetails(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                {loadingDetails ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Cargando...</span>
                    </div>
                    <p className="mt-2 text-muted">Cargando detalles...</p>
                  </div>
                ) : movementDetails ? (
                  <div>
                    {/* Información General */}
                    <div className="mb-4">
                      <h6 className="text-primary mb-3">📋 Información General</h6>
                      <div className="row">
                        <div className="col-md-6">
                          <p><strong>ID:</strong> #{movementDetails.id}</p>
                          <p><strong>Almacén:</strong> {movementDetails.warehouse_name || 'N/A'}</p>
                          <p><strong>Tipo:</strong> 
                            <span className={`badge ms-2 ${
                              (movementDetails.type === 'IN' || movementDetails.movement_type === 'INGRESO') 
                                ? 'bg-success' 
                                : 'bg-danger'
                            }`}>
                              {(movementDetails.type === 'IN' || movementDetails.movement_type === 'INGRESO') ? '📥 Entrada' : '📤 Salida'}
                            </span>
                          </p>
                        </div>
                        <div className="col-md-6">
                          <p><strong>Fecha:</strong> {new Date(movementDetails.created_at).toLocaleString('es-ES')}</p>
                          <p><strong>Creado por:</strong> {movementDetails.created_by?.email || movementDetails.created_by_email || movementDetails.user_email || movementDetails.created_by || 'N/A'}
                            {movementDetails.created_by?.name || movementDetails.created_by_name ? (
                              <span className="ms-2">({movementDetails.created_by?.name || movementDetails.created_by_name})</span>
                            ) : null}
                          </p>
                          <p><strong>Estado:</strong>
                            {movementDetails.is_cancelled ? (
                              <span className="badge bg-danger ms-2">❌ Cancelado</span>
                            ) : movementDetails.authorized ? (
                              <span className="badge bg-success ms-2">✅ Autorizado</span>
                            ) : (
                              <span className="badge bg-warning ms-2">⏳ Pendiente</span>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      {movementDetails.notes && (
                        <div className="mt-3">
                          <p><strong>Notas:</strong></p>
                          <div className="bg-light p-3 rounded">
                            {movementDetails.notes}
                          </div>
                        </div>
                      )}

                      {movementDetails.reference_document && (
                        <p className="mt-2">
                          <strong>Referencia:</strong> 
                          <code className="ms-2">{movementDetails.reference_document}</code>
                        </p>
                      )}
                    </div>

                    {/* Información de Autorización */}
                    {movementDetails.authorized && (
                      <div className="mb-4">
                        <h6 className="text-success mb-3">✅ Autorización</h6>
                        <div className="bg-light p-3 rounded">
                          <p className="mb-1">
                            <strong>Autorizado por:</strong> {movementDetails.authorized_by?.email || movementDetails.authorized_by_email || movementDetails.authorized_by || 'N/A'}
                            {movementDetails.authorized_by?.name || movementDetails.authorized_by_name ? (
                              <span className="ms-2">({movementDetails.authorized_by?.name || movementDetails.authorized_by_name})</span>
                            ) : null}
                          </p>
                          <p className="mb-0">
                            <strong>Fecha de autorización:</strong> {new Date(movementDetails.authorized_at).toLocaleString('es-ES')}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Información de Cancelación */}
                    {movementDetails.is_cancelled && (
                      <div className="mb-4">
                        <h6 className="text-danger mb-3">❌ Cancelación</h6>
                        <div className="bg-light p-3 rounded">
                          <p className="mb-1">
                            <strong>Cancelado por:</strong> {movementDetails.cancelled_by_email || 'N/A'}
                          </p>
                          <p className="mb-1">
                            <strong>Fecha de cancelación:</strong> {new Date(movementDetails.cancelled_at).toLocaleString('es-ES')}
                          </p>
                          {movementDetails.cancellation_reason && (
                            <p className="mb-0">
                              <strong>Razón:</strong> {movementDetails.cancellation_reason}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Detalles de Productos */}
                    <div className="mb-4">
                      <h6 className="text-primary mb-3">📦 Productos</h6>
                      {movementDetails.details && movementDetails.details.length > 0 ? (
                        <div className="table-responsive">
                          <table className="table table-striped table-hover">
                            <thead className="table-dark">
                              <tr>
                                <th>Producto</th>
                                <th className="text-center">Cantidad</th>
                                <th className="text-center">Precio</th>
                                <th className="text-center">Total</th>
                                <th className="text-center">Lote</th>
                                <th className="text-center">Fecha Exp.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {movementDetails.details.map((detail, index) => (
                                <tr key={index}>
                                  <td>
                                    <div>
                                      <div className="fw-bold">{detail.product_name || detail.product_variant_name || 'Producto desconocido'}</div>
                                      {detail.product_code && (
                                        <small className="text-muted">Código: {detail.product_code}</small>
                                      )}
                                      {detail.notes && (
                                        <small className="d-block text-info">{detail.notes}</small>
                                      )}
                                    </div>
                                  </td>
                                  <td className="text-center">
                                    <span className={`badge ${
                                      (movementDetails.type === 'IN' || movementDetails.movement_type === 'INGRESO')
                                        ? 'bg-success' 
                                        : 'bg-danger'
                                    } fs-6`}>
                                      {detail.quantity}
                                    </span>
                                  </td>
                                  <td className="text-center">
                                    {detail.price ? 
                                      `$${parseFloat(detail.price).toFixed(2)}` : 
                                      <span className="text-muted">-</span>
                                    }
                                  </td>
                                  <td className="text-center">
                                    {detail.total ? 
                                      `$${parseFloat(detail.total).toFixed(2)}` : 
                                      <span className="text-muted">-</span>
                                    }
                                  </td>
                                  <td className="text-center">
                                    {detail.lote ? (
                                      <small className="text-info">{detail.lote}</small>
                                    ) : (
                                      <span className="text-muted">-</span>
                                    )}
                                  </td>
                                  <td className="text-center">
                                    {detail.expiration_date ? (
                                      <small>{new Date(detail.expiration_date).toLocaleDateString('es-ES')}</small>
                                    ) : (
                                      <span className="text-muted">-</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          
                          {/* Totales */}
                          <div className="mt-3 p-3 bg-light rounded">
                            <div className="row">
                              <div className="col-md-6">
                                <strong>Total de productos: {movementDetails.details.length}</strong>
                              </div>
                              <div className="col-md-6 text-end">
                                <strong>
                                  Cantidad total: {movementDetails.details.reduce((sum, detail) => sum + parseFloat(detail.quantity || 0), 0)}
                                </strong>
                              </div>
                            </div>
                            {movementDetails.details.some(d => d.total && parseFloat(d.total) > 0) && (
                              <div className="row mt-2">
                                <div className="col-md-12 text-end">
                                  <strong>
                                    Valor total: $
                                    {movementDetails.details.reduce((sum, detail) => sum + parseFloat(detail.total || 0), 0).toFixed(2)}
                                  </strong>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="alert alert-info">
                          <i className="fas fa-info-circle me-2"></i>
                          No hay detalles de productos para este movimiento.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="alert alert-danger">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    Error al cargar los detalles del movimiento.
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setMovementDetails(null);
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryMovements;
