import React from 'react';

// Componente para mostrar resultados del filtro de lote de productos
// Recibe: filters (objeto de filtros)
const ProductFilterResult = ({ filters }) => {
  // Simulación de resultados (en la práctica, aquí iría la lógica para mostrar productos filtrados)
  // Si hay detalles, muestra la lista
  if (filters.details && Array.isArray(filters.details) && filters.details.length > 0) {
    return (
      <div className="mt-3">
        <h5>Productos en el lote:</h5>
        <ul className="list-group">
          {filters.details.map((d, idx) => (
            <li key={idx} className="list-group-item">
              <strong>ID:</strong> {d.product_id} | <strong>Variante:</strong> {d.product_variant_id} | <strong>Nombre:</strong> {d.name || ''}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  // Si no hay detalles, muestra mensaje
  return <div className="mt-3 text-muted">No hay productos en el lote.</div>;
};

export default ProductFilterResult;
