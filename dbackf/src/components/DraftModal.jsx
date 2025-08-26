
import React from 'react';

const DraftModal = ({ show, onLoad, onNew, onClose }) => {
  if (!show) return null;
  return (
    <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Lote de movimientos guardado</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <p>¿Deseas cargar el último lote guardado y continuar donde lo dejaste?</p>
            <div className="alert alert-info">Si eliges "No", se iniciará un nuevo movimiento y el lote guardado permanecerá disponible.</div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onNew}>No, empezar nuevo</button>
            <button type="button" className="btn btn-primary" onClick={onLoad}>Sí, cargar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DraftModal;
