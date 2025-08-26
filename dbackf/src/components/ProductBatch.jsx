import React, { useState } from 'react';
import ProductFilter from './ProductFilter';
import ProductFilterResult from './ProductFilterResult';

const ProductBatch = () => {
  // Cargar draft
  const handleLoadDraft = () => {
    if (!draftName.trim()) {
      alert('Debes ingresar el nombre del draft a cargar');
      return;
    }
    const draft = localStorage.getItem(`productBatchDraft:${draftName.trim()}`);
    if (!draft) {
      alert('No se encontró el draft: ' + draftName.trim());
      return;
    }
    const parsed = JSON.parse(draft);
    if (parsed.details && Array.isArray(parsed.details)) {
      const missingIds = parsed.details.some(
        d => !d.product_id || !d.product_variant_id
      );
      if (missingIds) {
        alert('El draft seleccionado tiene productos sin product_id o product_variant_id. No se puede cargar.');
        return;
      }
    }
    setFilters(parsed);
    alert('Draft cargado: ' + draftName.trim());
  };
  const [filters, setFilters] = useState({});
  const [draftName, setDraftName] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);

  // Guardar draft con nombre específico, validando product_id y product_variant_id
  const handleSaveDraft = () => {
    if (!draftName.trim()) {
      alert('Debes ingresar un nombre para el draft');
      return;
    }
    // Validar que los filtros incluyan product_id y product_variant_id si existen detalles
    if (filters.details && Array.isArray(filters.details)) {
      const missingIds = filters.details.some(
        d => !d.product_id || !d.product_variant_id
      );
      if (missingIds) {
        alert('Todos los productos deben tener product_id y product_variant_id.');
        return;
      }
    }
    localStorage.setItem(`productBatchDraft:${draftName.trim()}`, JSON.stringify(filters));
    setDraftSaved(true);
    alert('Draft guardado como "' + draftName.trim() + '"');
  };

  // Borrar draft
  const handleDeleteDraft = () => {
    if (!draftName.trim()) {
      alert('Debes ingresar el nombre del draft a borrar');
      return;
    }
    localStorage.removeItem(`productBatchDraft:${draftName.trim()}`);
    setDraftSaved(false);
    alert('Draft eliminado: ' + draftName.trim());
  };

  // Limpiar filtros
  const handleClearFilters = () => {
    setFilters({});
  };

  return (
    <div className="container py-4">
      <h2 className="mb-3 text-primary">Lote de Productos</h2>
      <div className="mb-3">
        <ProductFilter filters={filters} setFilters={setFilters} />
      </div>
      <div className="mb-3 d-flex gap-2 align-items-center">
        <input
          type="text"
          className="form-control"
          placeholder="Nombre del draft"
          value={draftName}
          onChange={e => setDraftName(e.target.value)}
          style={{ maxWidth: 250 }}
        />
        <button className="btn btn-outline-primary" onClick={handleSaveDraft}>
          💾 Guardar draft
        </button>
        <button className="btn btn-outline-info" onClick={handleLoadDraft}>
          📂 Cargar draft
        </button>
        <button className="btn btn-outline-danger" onClick={handleDeleteDraft}>
          🗑️ Borrar draft
        </button>
        <button className="btn btn-outline-secondary" onClick={handleClearFilters}>
          Limpiar filtros
        </button>
      </div>
      <ProductFilterResult filters={filters} />
    </div>
  );
};

export default ProductBatch;
