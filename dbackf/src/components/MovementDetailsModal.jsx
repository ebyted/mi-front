
import React from 'react';
import MovementDetailsTable from './MovementDetailsTable';

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
            <MovementDetailsTable details={movement.details || []} />
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
