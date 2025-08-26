
import React from 'react';

const CancelModal = ({ show, movement, reason, setReason, onCancel, onConfirm }) => {
  if (!show || !movement) return null;
  return (
    <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Cancelar Movimiento #{movement.id}</h5>
            <button type="button" className="btn-close" onClick={onCancel}></button>
          </div>
          <div className="modal-body">
            <label>Motivo de cancelación</label>
            <textarea className="form-control mb-2" value={reason} onChange={e => setReason(e.target.value)} />
            <div className="alert alert-warning">Esta acción no se puede deshacer.</div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>Volver</button>
            <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={!reason.trim()}>Cancelar Movimiento</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancelModal;
