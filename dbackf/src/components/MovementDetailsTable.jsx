import React from 'react';


const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString();
};

const MovementDetailsTable = ({ details }) => (
  <div className="table-responsive">
    <table className="table table-bordered table-striped align-middle" style={{ minWidth: 700, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <thead className="table-light">
        <tr style={{ background: '#f8f9fa' }}>
          <th style={{ width: 40 }}>#</th>
          <th style={{ width: 90 }}>ID Producto</th>
          <th style={{ minWidth: 160 }}>Nombre Producto</th>
          <th style={{ width: 90 }}>ID Variante</th>
          <th style={{ width: 90 }}>Cantidad</th>
          <th style={{ width: 90 }}>Lote</th>
          <th style={{ width: 120 }}>Vencimiento</th>
          <th style={{ minWidth: 120 }}>Notas</th>
        </tr>
      </thead>
      <tbody>
        {details && details.length > 0 ? (
          details.map((d, idx) => {
            // Mejor manejo de datos vacíos y formato
            const productName = d.product_name || (d.product && d.product.name) || '—';
            const productCode = d.product_code || (d.product && d.product.code) || '';
            const variantId = d.product_variant_id || (d.product_variant && d.product_variant.id) || '—';
            const quantity = d.quantity ?? '—';
            const lote = d.lote ?? '—';
            const expiration = formatDate(d.expiration_date);
            const notes = d.notes ?? '—';
            return (
              <tr key={idx} style={idx % 2 === 0 ? { background: '#f6f8fa' } : {}}>
                <td>{idx + 1}</td>
                <td>{d.product_id ?? '—'}</td>
                <td>
                  <span style={{ fontWeight: 500 }}>{productName}</span>
                  {productCode && <span className="text-muted" style={{ fontSize: '0.9em', marginLeft: 6 }}>({productCode})</span>}
                </td>
                <td>{variantId}</td>
                <td>{quantity}</td>
                <td>{lote}</td>
                <td>{expiration}</td>
                <td>{notes}</td>
              </tr>
            );
          })
        ) : (
          <tr>
            <td colSpan={8} className="text-center text-muted">No hay productos en este movimiento.</td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

export default MovementDetailsTable;
