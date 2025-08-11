import React, { useState, useEffect } from 'react';
import api from '../services/api';

function CustomersSimple() {
  console.log('🔍 CustomersSimple component iniciando...');
  
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  console.log('🔍 Estados inicializados:', { 
    customers: Array.isArray(customers), 
    customersLength: customers.length
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      console.log('🔍 Cargando clientes...');
      
      const response = await api.get('/customers/');
      console.log('🔍 Respuesta de API:', response);
      console.log('🔍 Datos de respuesta:', response.data);
      console.log('🔍 Tipo de datos:', typeof response.data);
      console.log('🔍 Es array?:', Array.isArray(response.data));
      
      // Asegurar que data es un array
      const customersArray = Array.isArray(response.data) ? response.data : [];
      setCustomers(customersArray);
      setError('');
      
      console.log('🔍 Customers establecidos:', customersArray);
    } catch (err) {
      console.error('🔍 Error loading customers:', err);
      setError('Error al cargar clientes');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  console.log('🔍 Renderizando CustomersSimple:', { 
    customers: Array.isArray(customers) ? customers.length : 'NO ES ARRAY', 
    customersType: typeof customers,
    loading,
    error
  });

  if (loading) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3 text-muted">Cargando clientes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <h1 className="mb-4">Clientes (Simple)</h1>
      
      <div className="mb-3">
        <p>Array válido: {Array.isArray(customers) ? 'SÍ' : 'NO'}</p>
        <p>Cantidad: {Array.isArray(customers) ? customers.length : 'N/A'}</p>
        <p>Tipo: {typeof customers}</p>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(customers) && customers.length > 0 ? (
              customers.map(customer => (
                <tr key={customer.id || Math.random()}>
                  <td>{customer.id}</td>
                  <td>{customer.name}</td>
                  <td>{customer.email}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="text-center">
                  No hay clientes
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CustomersSimple;
