import React, { useEffect, useState } from 'react';
import api from '../services/api';

const InventoryMovementsSimple = () => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadMovements = async () => {
      try {
        console.log('Cargando movimientos...');
        const response = await api.get('inventory-movements/');
        console.log('Respuesta del servidor:', response.data);
        setMovements(response.data || []);
      } catch (err) {
        console.error('Error cargando movimientos:', err);
        setError('Error al cargar los movimientos: ' + (err.message || 'Error desconocido'));
      } finally {
        setLoading(false);
      }
    };

    loadMovements();
  }, []);

  if (loading) {
    return (
      <div className="container py-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-2">Cargando movimientos de inventario...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">
          <h4>Error</h4>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h2 className="mb-4">
        <i className="bi bi-box-seam me-2"></i>
        Movimientos de Inventario (Simple)
      </h2>
      
      <div className="alert alert-info">
        <strong>Debug Info:</strong> Se encontraron {movements.length} movimientos
      </div>

      {movements.length === 0 ? (
        <div className="alert alert-warning">
          <h4>No hay movimientos</h4>
          <p>No se encontraron movimientos de inventario en el sistema.</p>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Lista de Movimientos ({movements.length})</h5>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Almacén</th>
                    <th>Tipo</th>
                    <th>Usuario</th>
                    <th>Fecha</th>
                    <th>Autorizado</th>
                    <th>Cantidad Total</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map(movement => (
                    <tr key={movement.id}>
                      <td>{movement.id}</td>
                      <td>{movement.warehouse?.name || 'N/A'}</td>
                      <td>
                        <span className={`badge ${
                          movement.movement_type === 'entrada' ? 'bg-success' :
                          movement.movement_type === 'salida' ? 'bg-danger' :
                          'bg-info'
                        }`}>
                          {movement.movement_type}
                        </span>
                      </td>
                      <td>{movement.user?.email || 'N/A'}</td>
                      <td>
                        {movement.created_at ? 
                          new Date(movement.created_at).toLocaleString() : 
                          'N/A'
                        }
                      </td>
                      <td>
                        <span className={`badge ${movement.authorized ? 'bg-success' : 'bg-secondary'}`}>
                          {movement.authorized ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-primary">
                          {movement.total_quantity || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        <h5>Datos Raw (JSON)</h5>
        <pre className="bg-light p-3" style={{ fontSize: '12px', maxHeight: '400px', overflow: 'auto' }}>
          {JSON.stringify(movements, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default InventoryMovementsSimple;
