
import React from 'react';

const MovementList = ({ movements, onView, onEdit, onAuthorize, onCancel }) => (
  <div className="table-responsive">
    <table className="table table-bordered">
      <thead>
        <tr>
          <th>ID</th>
          <th>Tipo</th>
          <th>Notas</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {movements.map(mov => (
          <tr key={mov.id}>
            <td>{mov.id}</td>
            <td>{mov.type}</td>
            <td>{mov.notes}</td>
            <td>
              <button className="btn btn-sm btn-info me-1" onClick={() => onView(mov)}>Ver</button>
              <button className="btn btn-sm btn-warning me-1" onClick={() => onEdit(mov)}>Editar</button>
              <button className="btn btn-sm btn-success me-1" onClick={() => onAuthorize(mov)}>Autorizar</button>
              <button className="btn btn-sm btn-danger" onClick={() => onCancel(mov)}>Cancelar</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default MovementList;
