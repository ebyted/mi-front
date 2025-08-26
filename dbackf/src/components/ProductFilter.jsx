import React from 'react';

// Componente de filtro para lote de productos
// Recibe: filters (objeto de filtros), setFilters (función para actualizar filtros)
const ProductFilter = ({ filters, setFilters }) => {
  // Ejemplo: filtro por nombre, SKU y categoría
  const handleChange = e => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };
  return (
    <div className="row g-2">
      <div className="col-md-4">
        <input
          type="text"
          name="name"
          className="form-control"
          placeholder="Nombre del producto"
          value={filters.name || ''}
          onChange={handleChange}
        />
      </div>
      <div className="col-md-4">
        <input
          type="text"
          name="sku"
          className="form-control"
          placeholder="SKU"
          value={filters.sku || ''}
          onChange={handleChange}
        />
      </div>
      <div className="col-md-4">
        <input
          type="text"
          name="category"
          className="form-control"
          placeholder="Categoría"
          value={filters.category || ''}
          onChange={handleChange}
        />
      </div>
    </div>
  );
};

export default ProductFilter;
