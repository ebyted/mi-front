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

  // Función para obtener la clase CSS del badge según el nivel
  const getLevelBadgeClass = (level) => {
    switch (level) {
      case 1:
        return 'bg-secondary';
      case 2:
        return 'bg-primary';
      case 3:
        return 'bg-warning text-dark';
      case 4:
        return 'bg-success';
      default:
        return 'bg-secondary';
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
              <th>Teléfono</th>
              <th>Nivel</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(customers) && customers.length > 0 ? (
              customers.map(customer => (
                <tr key={customer.id || Math.random()}>
                  <td>{customer.id}</td>
                  <td>{customer.name}</td>
                  <td>{customer.email || 'Sin email'}</td>
                  <td>{customer.phone || 'Sin teléfono'}</td>
                  <td>
                    <span className={`badge ${getLevelBadgeClass(customer.level)}`}>
                      Nivel {customer.level || 1}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center">
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
