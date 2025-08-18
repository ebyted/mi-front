import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import useDocumentTitle from '../hooks/useDocumentTitle';

const InventoryMovements = () => {
  // Hook para cambiar el título de la pestaña
  useDocumentTitle('Movimientos de Inventario - Maestro Inventario');
  
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMovement, setEditingMovement] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    warehouse_id: '',
    type: 'IN',
    notes: '',
    details: []
  });

  const [currentDetail, setCurrentDetail] = useState({
    product_id: '',
    quantity: '',
    expiration_date: '', // Este campo es opcional
    notes: ''
  });

  useEffect(() => {
    fetchMovements();
    fetchWarehouses();
    fetchProducts();
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

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products/');
      setProducts(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
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
      quantity: '',
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

    const product = products.find(p => p.id === parseInt(currentDetail.product_id));
    const newDetail = {
      ...currentDetail,
      product_id: parseInt(currentDetail.product_id),
      quantity: parseFloat(currentDetail.quantity),
      product_name: product?.name || 'Desconocido',
      product_code: product?.code || 'N/A'
    };

    setFormData(prev => ({
      ...prev,
      details: [...prev.details, newDetail]
    }));

    setCurrentDetail({
      product_id: '',
      quantity: '',
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

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este movimiento?')) return;

    try {
      await api.delete(`/inventory-movements/${id}/`);
      fetchMovements();
    } catch (error) {
      console.error('Error deleting movement:', error);
      alert('Error al eliminar el movimiento');
    }
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

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="display-5 mb-0 text-primary">
          📦 Movimientos de Inventario
        </h1>
        <div className="d-flex gap-3">
          <div className="text-center">
            <div className="h4 mb-0 text-primary">{movements.length}</div>
            <small className="text-muted">Total</small>
          </div>
          <div className="text-center">
            <div className="h4 mb-0 text-success">{movements.filter(m => m.type === 'IN' || m.movement_type === 'IN').length}</div>
            <small className="text-muted">Entradas</small>
          </div>
          <div className="text-center">
            <div className="h4 mb-0 text-warning">{movements.filter(m => m.type === 'OUT' || m.movement_type === 'OUT').length}</div>
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
                    <th>Fecha</th>
                    <th>Almacén</th>
                    <th>Tipo</th>
                    <th>Productos</th>
                    <th>Usuario</th>
                    <th>Notas</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5">
                        <div className="text-muted">
                          <div className="h1 mb-3">📦</div>
                          <h5>No hay movimientos registrados</h5>
                          <p>Crea tu primer movimiento de inventario</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    movements.map((movement) => (
                      <tr key={movement.id}>
                        <td>
                          {new Date(movement.created_at).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
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
                          <span className="fw-bold text-primary">
                            {movement.details?.length || 0}
                          </span> productos
                        </td>
                        <td>
                          <small className="text-muted">
                            {movement.user_email || 'N/A'}
                          </small>
                        </td>
                        <td>
                          <span className="small text-muted">
                            {movement.notes ? (
                              movement.notes.length > 50 
                                ? movement.notes.substring(0, 50) + '...'
                                : movement.notes
                            ) : '-'}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group" role="group">
                            <button
                              onClick={() => handleEdit(movement)}
                              className="btn btn-sm btn-outline-primary"
                              title="Editar movimiento"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(movement.id)}
                              className="btn btn-sm btn-outline-danger"
                              title="Eliminar movimiento"
                            >
                              🗑️
                            </button>
                          </div>
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
                    <select
                      value={currentDetail.product_id}
                      onChange={(e) => setCurrentDetail(prev => ({...prev, product_id: e.target.value}))}
                      className="form-select"
                    >
                      <option value="">Seleccionar producto</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} {product.sku ? `(${product.sku})` : ''}
                        </option>
                      ))}
                    </select>
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
    </div>
  );
};

export default InventoryMovements;
