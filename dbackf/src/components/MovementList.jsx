import React from 'react';

const MovementList = ({ movements, onSelect }) => (
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
              <button className="btn btn-sm btn-info" onClick={() => onSelect(mov)}>Ver</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default MovementList;
