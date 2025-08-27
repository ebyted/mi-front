
import React, { useRef } from 'react';
import ProductSelect from './ProductSelect';

const MovementForm = ({ formData, setFormData, handleSubmit, currentDetail, setCurrentDetail, addDetail, removeDetail, saving, handleCancel, handleSaveBatch, handleLoadBatch, handleClearBatch, warehouses, editingMovement }) => {
  const fileInputRef = useRef();

  // Cargar lote desde archivo JSON
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const batch = JSON.parse(ev.target.result);
        if (!Array.isArray(batch)) throw new Error('El archivo no tiene formato de lote válido');
        const cleanedDetails = batch.map(d => ({
          product_id: d.product_id ? parseInt(d.product_id) : '',
          product_variant_id: d.product_variant_id ?? '',
          product_name: d.product_name ?? '',
          product_code: d.product_code ?? '',
          quantity: d.quantity ? parseFloat(d.quantity) : '',
          lote: d.lote ?? '',
          expiration_date: d.expiration_date ?? '',
          notes: d.notes ?? ''
        }));
        setFormData(f => ({ ...f, details: cleanedDetails }));
        alert('Lote cargado correctamente');
      } catch (err) {
        alert('Error al cargar lote: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Botón para abrir el input file
  const handleLoadBatchFile = () => {
    if (fileInputRef.current) fileInputRef.current.value = null;
    fileInputRef.current.click();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow mb-4">
    <div className="row mb-3">
      <div className="col-md-4">
        <label>Almacén</label>
        <select className="form-select" value={formData.warehouse_id} onChange={e => setFormData(f => ({ ...f, warehouse_id: e.target.value }))} required>
          <option value="">Selecciona almacén</option>
          {warehouses && warehouses.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>
      <div className="col-md-4">
        <label>Tipo</label>
        <select className="form-select" value={formData.type} onChange={e => setFormData(f => ({ ...f, type: e.target.value }))} required>
          <option value="IN">Ingreso</option>
          <option value="OUT">Egreso</option>
        </select>
      </div>
      <div className="col-md-4">
        <label>Notas</label>
        <input className="form-control" value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} />
      </div>
    </div>

    <hr />
    <h5>Captura de productos</h5>
    <div className="row mb-2 align-items-end">
      <div className="col-md-4">
        <ProductSelect
          value={currentDetail.product_id}
          onChange={id => setCurrentDetail(d => ({ ...d, product_id: id }))}
          onProductSelect={product => setCurrentDetail(d => ({
            ...d,
            product_id: product.id,
            product_variant_id: product.product_variant_id,
            product_name: product.name,
            product_code: product.sku || product.product_code || ''
          }))}
          placeholder="Buscar producto por nombre o SKU..."
          required
        />
      </div>
      <div className="col-md-2">
        <input className="form-control" placeholder="Cantidad" type="number" value={currentDetail.quantity} onChange={e => setCurrentDetail(d => ({ ...d, quantity: e.target.value }))} />
      </div>
      <div className="col-md-2">
        <input className="form-control" placeholder="Lote" value={currentDetail.lote} onChange={e => setCurrentDetail(d => ({ ...d, lote: e.target.value }))} />
      </div>
      <div className="col-md-2">
        <input className="form-control" placeholder="Vencimiento" type="date" value={currentDetail.expiration_date} onChange={e => setCurrentDetail(d => ({ ...d, expiration_date: e.target.value }))} />
      </div>
      <div className="col-md-2">
        <input className="form-control" placeholder="Notas" value={currentDetail.notes} onChange={e => setCurrentDetail(d => ({ ...d, notes: e.target.value }))} />
      </div>
      <div className="col-md-12 mt-2">
        <button type="button" className="btn btn-success" onClick={addDetail}>Agregar producto</button>
      </div>
    </div>

    <div className="table-responsive mb-3">
      <table className="table table-sm table-bordered">
        <thead>
          <tr>
            <th>#</th>
            <th>ID Producto</th>
            <th>ID Variante</th>
            <th>Cantidad</th>
            <th>Lote</th>
            <th>Vencimiento</th>
            <th>Notas</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {formData.details.map((d, idx) => (
            <tr key={idx}>
              <td>{idx + 1}</td>
              <td>{d.product_id}</td>
              <td>{d.product_variant_id}</td>
              <td>{d.quantity}</td>
              <td>{d.lote}</td>
              <td>{d.expiration_date}</td>
              <td>{d.notes}</td>
              <td><button type="button" className="btn btn-sm btn-danger" onClick={() => removeDetail(idx)}>Eliminar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="mb-3">
      <button type="button" className="btn btn-outline-primary me-2" onClick={handleSaveBatch}>Guardar lote</button>
  <button type="button" className="btn btn-outline-info me-2" onClick={handleLoadBatchFile} id="btn-cargar-lote">Cargar lote</button>
  <input type="file" accept="application/json" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} id="input-cargar-lote" />
  <small className="text-muted ms-2">Selecciona un archivo JSON exportado previamente.</small>
      <button type="button" className="btn btn-outline-warning" onClick={handleClearBatch}>Limpiar lote</button>
    </div>

    <button type="submit" disabled={saving} className="btn btn-primary">{editingMovement ? 'Actualizar' : 'Guardar'}</button>
    <button type="button" onClick={handleCancel} className="btn btn-secondary ms-2">Cancelar</button>
  </form>
  );
};

export default MovementForm;
