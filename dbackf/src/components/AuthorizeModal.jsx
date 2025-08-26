import React from 'react';

const AuthorizeModal = ({ show, movement, onAuthorize, onCancel }) => {
  if (!show || !movement) return null;
  return (
    <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Autorizar Movimiento #{movement.id}</h5>
            <button type="button" className="btn-close" onClick={onCancel}></button>
          </div>
          <div className="modal-body">
            {/* ...info y confirmación... */}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
            <button type="button" className="btn btn-success" onClick={onAuthorize}>Autorizar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthorizeModal;
