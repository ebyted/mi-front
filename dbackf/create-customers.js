const fs = require('fs');

const content = `import React, { useState, useEffect } from 'react';
import api from '../services/api';

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = () => {
    setLoading(true);
    api.get('customers/')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setCustomers(data);
      })
      .catch(() => {
        setCustomers([]);
        setError('No se pudo cargar la lista de clientes.');
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="display-5 mb-0 text-primary">
          👥 Clientes
        </h1>
        <div className="text-center">
          <div className="h4 mb-0 text-primary">{customers.length}</div>
          <small className="text-muted">Total</small>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center" role="alert">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3 text-muted">Cargando clientes...</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered table-hover">
            <thead className="table-primary">
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Dirección</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(customer => (
                <tr key={customer.id}>
                  <td><strong>{customer.name}</strong></td>
                  <td>{customer.email || 'Sin email'}</td>
                  <td>{customer.phone || 'Sin teléfono'}</td>
                  <td>{customer.address || 'Sin dirección'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Customers;`;

fs.writeFileSync('c:/Users/dell/Documents/Proyectos/Maestro_inventario/mi-front/dbackf/src/pages/Customers.jsx', content, 'utf8');
console.log('Customers.jsx created successfully!');
