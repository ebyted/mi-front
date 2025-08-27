import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import useDocumentTitle from '../hooks/useDocumentTitle';
import MovementList from '../components/MovementList';
import MovementForm from '../components/MovementForm';
import MovementDetailsModal from '../components/MovementDetailsModal';
import MovementDetailsTable from '../components/MovementDetailsTable';
import AuthorizeModal from '../components/AuthorizeModal';
import CancelModal from '../components/CancelModal';
import DraftModal from '../components/DraftModal';

const InventoryMovements = () => {
  useDocumentTitle('Movimientos de Inventario - Maestro Inventario');
  const [movements, setMovements] = useState([]);
  const [formData, setFormData] = useState({ warehouse_id: '', type: 'IN', notes: '', details: [] });
  const [warehouses, setWarehouses] = useState([]);
  // Eliminada declaración duplicada de showDraftModal/setShowDraftModal

  // ...existing code...

  // Mostrar detalles, autorizar y cancelar desde la lista
  const handleViewDetails = (movement) => {
    setSelectedMovement(movement);
    setShowDetailsModal(true);
  };

  const handleAuthorize = (movement) => {
    setSelectedMovement(movement);
    setShowAuthorizeModal(true);
  };

  const handleCancelMovement = (movement) => {
    setSelectedMovement(movement);
    setShowCancelModal(true);
  };
  const [showForm, setShowForm] = useState(false);
  const [editingMovement, setEditingMovement] = useState(null);
  const [currentDetail, setCurrentDetail] = useState({ product_id: '', product_variant_id: '', product_name: '', product_code: '', quantity: '', lote: '', expiration_date: '', notes: '', errorVariant: false });
  const [hasDraft, setHasDraft] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAuthorizeModal, setShowAuthorizeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [showDraftModal, setShowDraftModal] = useState(false);

  // Cargar movimientos y almacenes al montar
  useEffect(() => {
    const fetchMovements = async () => {
      try {
        const resp = await api.get('/inventory-movements/');
        setMovements(resp.data);
      } catch (error) {
        alert('Error al cargar movimientos');
      }
    };
    const fetchWarehouses = async () => {
      try {
        const resp = await api.get('/warehouses/');
        setWarehouses(resp.data);
      } catch (error) {
        alert('Error al cargar almacenes');
      }
    };
    fetchMovements();
    fetchWarehouses();
  }, []);

  // Handler para guardar movimiento
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Eliminar draft antes de guardar
    localStorage.removeItem('inventoryMovementDraft');
    setHasDraft(false);
    setSaving(true);
    try {
      const movementData = {
        warehouse_id: parseInt(formData.warehouse_id),
        type: formData.type,
        notes: formData.notes,
        details: formData.details.map(detail => ({
          product_id: parseInt(detail.product_id),
          product_variant_id: detail.product_variant_id ?? null,
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
    } catch (error) {
      alert(`Error al guardar movimiento: ${error.response?.data?.error || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Guardar lote de captura como archivo JSON
  const handleSaveBatch = () => {
    if (!formData.details || formData.details.length === 0) {
      alert('No hay productos capturados para guardar.');
      return;
    }
    const name = window.prompt('Nombre para el archivo de lote:', 'lote-inventario');
    if (!name || !name.trim()) {
      alert('Debes ingresar un nombre válido.');
      return;
    }
    // Solo guardar los campos product_id y product_variant_id (y los relevantes)
    const batch = formData.details.map(d => ({
      product_id: d.product_id,
      product_variant_id: d.product_variant_id,
      product_name: d.product_name,
      product_code: d.product_code,
      quantity: d.quantity,
      lote: d.lote,
      expiration_date: d.expiration_date,
      notes: d.notes
    }));
    const json = JSON.stringify(batch, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.trim()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('Lote guardado como archivo: ' + name.trim() + '.json');
  };

  // Limpiar lote (borrar todos los detalles capturados)
  const handleClearBatch = () => {
    if (!formData.details || formData.details.length === 0) {
      alert('No hay productos capturados para limpiar.');
      return;
    }
    if (window.confirm('¿Seguro que deseas borrar todo el lote capturado?')) {
      setFormData(prev => ({ ...prev, details: [] }));
      alert('Lote de captura borrado.');
    }
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

    // Validar que venga product_variant_id desde ProductSelect
    let variantId = currentDetail.product_variant_id;
    let productObj = currentDetail.product;
    console.log('[addDetail] currentDetail:', currentDetail);
    console.log('[addDetail] productObj:', productObj);
    if (!variantId) {
      // Si no se seleccionó variante, intentar obtener la principal del objeto
      if (productObj && Array.isArray(productObj.variants) && productObj.variants.length > 0) {
        variantId = productObj.variants[0].id;
        console.log('[addDetail] variantId obtenido de variants:', variantId);
      } else {
        alert('El producto seleccionado no tiene variantes válidas. Selecciona un producto desde el buscador.');
        return;
      }
    }
    // Validar que el variantId es válido
    if (!variantId) {
      alert('No se pudo determinar la variante del producto. Selecciona un producto válido.');
      console.log('[addDetail] variantId es null, currentDetail:', currentDetail);
      return;
    }
    const newDetail = {
      ...currentDetail,
      product_id: parseInt(currentDetail.product_id),
      product_variant_id: variantId,
      quantity: parseFloat(currentDetail.quantity)
    };
    console.log('[addDetail] newDetail agregado:', newDetail);
    setFormData(prev => ({
      ...prev,
      details: [...prev.details, newDetail]
    }));
    setCurrentDetail({
      product_id: '',
      product_variant_id: '',
      product_name: '',
      product_code: '',
      quantity: '',
      lote: '',
      expiration_date: '',
      notes: '',
      errorVariant: false
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
    // Sobrescribe completamente el estado, limpia detalles viejos
    const cleanedDetails = Array.isArray(movement.details) ? movement.details.map(d => ({
      product_id: d.product_id ? parseInt(d.product_id) : '',
      product_variant_id: d.product_variant_id ?? '',
      product_name: d.product_name ?? '',
      product_code: d.product_code ?? '',
      quantity: d.quantity ? parseFloat(d.quantity) : '',
      lote: d.lote ?? '',
      expiration_date: d.expiration_date ?? '',
      notes: d.notes ?? ''
    })) : [];
    setFormData({
      warehouse_id: movement.warehouse_id,
      type: movement.type,
      notes: movement.notes || '',
      details: cleanedDetails
    });
    console.log('[handleEdit] Detalles cargados:', cleanedDetails);
    setShowForm(true);
  };

  // Función para limpiar el formulario y el detalle actual
  const resetForm = () => {
    setFormData({
      warehouse_id: '',
      type: 'IN',
      notes: '',
      details: []
    });
    setCurrentDetail({
      product_id: '',
      product_variant_id: '',
      product_name: '',
      product_code: '',
      quantity: '',
      lote: '',
      expiration_date: '',
      notes: '',
      errorVariant: false
    });
  };

  const handleNew = () => {
    // Al iniciar nuevo movimiento, limpiar draft y estado
    localStorage.removeItem('inventoryMovementDraft');
    setHasDraft(false);
    resetForm();
    setEditingMovement(null);
    setShowForm(true);
  };
  // Guardar draft en cada cambio relevante
  useEffect(() => {
    if (showForm && !editingMovement) {
      // Solo guardar los campos relevantes en el draft
      const batch = formData.details.map(d => ({
        product_id: d.product_id,
        product_variant_id: d.product_variant_id,
        product_name: d.product_name,
        product_code: d.product_code,
        quantity: d.quantity,
        lote: d.lote,
        expiration_date: d.expiration_date,
        notes: d.notes
      }));
      const draft = {
        warehouse_id: formData.warehouse_id,
        type: formData.type,
        notes: formData.notes,
        details: batch
      };
      localStorage.setItem('inventoryMovementDraft', JSON.stringify(draft));
      setHasDraft(true);
    }
  }, [formData, showForm, editingMovement]);

  const handleCancel = () => {
  setShowForm(false);
  setEditingMovement(null);
  resetForm();
  // Borrar draft y limpiar detalles al cancelar
  localStorage.removeItem('inventoryMovementDraft');
  setHasDraft(false);
  };

  // Unificar handleSubmit para evitar duplicidad y errores
  // (Removed duplicate handleSubmit definition)
  // Cargar draft desde localStorage
  const loadDraft = () => {
    const draft = localStorage.getItem('inventoryMovementDraft');
    if (draft) {
      // Sobrescribe completamente el estado con el draft y limpia detalles viejos
      const parsed = JSON.parse(draft);
      const cleanedDetails = Array.isArray(parsed.details) ? parsed.details.map(d => ({
        product_id: d.product_id ? parseInt(d.product_id) : '',
        product_variant_id: d.product_variant_id ?? '',
        product_name: d.product_name ?? '',
        product_code: d.product_code ?? '',
        quantity: d.quantity ? parseFloat(d.quantity) : '',
        lote: d.lote ?? '',
        expiration_date: d.expiration_date ?? '',
        notes: d.notes ?? ''
      })) : [];
      setFormData({
        warehouse_id: parsed.warehouse_id || '',
        type: parsed.type || 'IN',
        notes: parsed.notes || '',
        details: cleanedDetails
      });
      console.log('[loadDraft] Draft cargado:', parsed);
      console.log('[loadDraft] Detalles cargados:', cleanedDetails);
    } else {
      resetForm();
      console.log('[loadDraft] No hay draft, estado limpio.');
    }
    setEditingMovement(null);
    setShowForm(true);
    setShowDraftModal(false);
  };

  // Borrar draft manualmente
  const clearDraft = () => {
    localStorage.removeItem('inventoryMovementDraft');
    setHasDraft(false);
    alert('Lote guardado eliminado.');
  };
  // Removed misplaced alert (was outside any function)

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

  // Autorizar movimiento seleccionado
  const confirmAuthorize = async () => {
    if (!selectedMovement) {
      alert('No hay movimiento seleccionado para autorizar.');
      return;
    }
    try {
      await api.post(`/inventory-movements/${selectedMovement.id}/authorize_movement/`);
      alert('Movimiento autorizado exitosamente');
      setShowAuthorizeModal(false);
      setSelectedMovement(null);
      // Recargar movimientos
      const resp = await api.get('/inventory-movements/');
      setMovements(resp.data);
    } catch (error) {
      console.error('Error autorizando movimiento:', error);
      alert(`Error autorizando movimiento: ${error.response?.data?.error || error.message}`);
    }
  };

  // Main JSX return block at the end
  return (
    <div className="container py-5">
        <h2 className="mb-4">Movimientos de Inventario</h2>
        {!showForm ? (
          <>
            <button className="btn btn-primary mb-3" onClick={handleNew}>➕ Nuevo Movimiento</button>
            <MovementList
              movements={movements}
              onView={handleViewDetails}
              onEdit={handleEdit}
              onAuthorize={handleAuthorize}
              onCancel={handleCancelMovement}
            />
          </>
        ) : (
          <MovementForm
            formData={formData}
            setFormData={setFormData}
            handleSubmit={handleSubmit}
            currentDetail={currentDetail}
            setCurrentDetail={setCurrentDetail}
            addDetail={addDetail}
            removeDetail={removeDetail}
            saving={saving}
            handleCancel={handleCancel}
            handleSaveBatch={handleSaveBatch}
            handleLoadBatch={loadDraft}
            handleClearBatch={handleClearBatch}
            warehouses={warehouses}
            editingMovement={editingMovement}
          />
        )}

        {/* Modales funcionales y completos */}
        {showDetailsModal && selectedMovement && (
          <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Detalles del Movimiento #{selectedMovement.id}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowDetailsModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-2"><strong>Almacén:</strong> {selectedMovement.warehouse_name || selectedMovement.warehouse_id}</div>
                  <div className="mb-2"><strong>Tipo:</strong> {selectedMovement.type}</div>
                  <div className="mb-2"><strong>Notas:</strong> {selectedMovement.notes}</div>
                  <hr />
                  <h6>Productos</h6>
                  <MovementDetailsTable details={selectedMovement.details || []} />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowDetailsModal(false)}>Cerrar</button>
                </div>
              </div>
            </div>
          </div>
        )}
        <AuthorizeModal
          show={showAuthorizeModal}
          movement={selectedMovement}
          onAuthorize={confirmAuthorize}
          onCancel={() => setShowAuthorizeModal(false)}
        />
        <CancelModal
          show={showCancelModal}
          movement={selectedMovement}
          reason={cancellationReason}
          setReason={setCancellationReason}
          onCancel={() => setShowCancelModal(false)}
          onConfirm={confirmCancel}
        />
        <DraftModal
          show={showDraftModal}
          onLoad={loadDraft}
          onNew={handleNew}
          onClose={() => setShowDraftModal(false)}
        />
    </div>
  );
}

export default InventoryMovements;
