
import React from 'react';


const MovementList = ({ movements, onView, onEdit, onAuthorize, onCancel }) => (
  <div className="table-responsive">
    <table className="table table-striped table-hover align-middle shadow-sm rounded" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
      <thead className="table-light">
        <tr>
          <th className="text-center">ID</th>
          <th>Tipo</th>
          <th>Notas</th>
          <th className="text-center">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {movements.length === 0 ? (
          <tr>
            <td colSpan="4" className="text-center">No hay movimientos registrados.</td>
          </tr>
        ) : (
          movements.map(mov => (
            <tr key={mov.id} className="align-middle">
              <td className="text-center fw-bold text-primary">{mov.id}</td>
              <td>
                {mov.type === 'IN' || mov.movement_type === 'IN' ? (
                  <span className="badge bg-success">Ingreso</span>
                ) : mov.type === 'OUT' || mov.movement_type === 'OUT' ? (
                  <span className="badge bg-danger">Egreso</span>
                ) : (
                  <span className="text-muted">Sin tipo</span>
                )}
              </td>
              <td>{mov.notes}</td>
              <td className="text-center">
                <button className="btn btn-outline-primary btn-xs me-1" title="Ver" style={{padding: '2px 6px', fontSize: '0.9em'}} onClick={() => onView(mov)}>
                  <i className="bi bi-eye"></i>
                </button>
                <button className="btn btn-outline-warning btn-xs me-1" title="Editar" style={{padding: '2px 6px', fontSize: '0.9em'}} onClick={() => onEdit(mov)}>
                  <i className="bi bi-pencil"></i>
                </button>
                <button className="btn btn-outline-success btn-xs me-1" title="Autorizar" style={{padding: '2px 6px', fontSize: '0.9em'}} onClick={() => onAuthorize(mov)}>
                  <i className="bi bi-check2-circle"></i>
                </button>
                <button className="btn btn-outline-danger btn-xs" title="Cancelar" style={{padding: '2px 6px', fontSize: '0.9em'}} onClick={() => onCancel(mov)}>
                  <i className="bi bi-x-circle"></i>
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
    <style>{`
      .table-striped > tbody > tr:nth-of-type(odd) {
        background-color: #f8f9fa;
      }
      .table-hover > tbody > tr:hover {
        background-color: #e9ecef;
      }
      .btn-xs {
        padding: 2px 6px;
        font-size: 0.9em;
      }
      .shadow-sm {
        box-shadow: 0 2px 8px rgba(0,0,0,0.07);
      }
      .rounded {
        border-radius: 8px;
      }
    `}</style>
  </div>
);

export default MovementList;
