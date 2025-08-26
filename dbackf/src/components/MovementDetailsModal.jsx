
import React from 'react';

const MovementDetailsModal = ({ show, movement, onClose }) => {
  if (!show || !movement) return null;
  return (
    <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Detalles del Movimiento #{movement.id}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="mb-2"><strong>Almacén:</strong> {movement.warehouse_name || movement.warehouse_id}</div>
            <div className="mb-2"><strong>Tipo:</strong> {movement.type}</div>
            <div className="mb-2"><strong>Notas:</strong> {movement.notes}</div>
            <hr />
            <h6>Productos</h6>
            <div className="table-responsive">
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
                  </tr>
                </thead>
                <tbody>
                  {(movement.details || []).map((d, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{d.product_id}</td>
                      <td>{d.product_variant_id}</td>
                      <td>{d.quantity}</td>
                      <td>{d.lote}</td>
                      <td>{d.expiration_date}</td>
                      <td>{d.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovementDetailsModal;
