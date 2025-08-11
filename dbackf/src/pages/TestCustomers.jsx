import React, { useState, useEffect } from 'react';

function TestCustomers() {
  console.log('🧪 TestCustomers component iniciando...');
  
  const [testArray, setTestArray] = useState([]);
  
  useEffect(() => {
    console.log('🧪 useEffect ejecutándose...');
    // Simular datos de prueba
    setTestArray([
      { id: 1, name: 'Cliente 1', email: 'test1@test.com' },
      { id: 2, name: 'Cliente 2', email: 'test2@test.com' }
    ]);
  }, []);

  console.log('🧪 Renderizando TestCustomers:', { 
    testArray: Array.isArray(testArray),
    length: testArray.length 
  });

  return (
    <div className="container py-5">
      <h1>Test Customers</h1>
      <p>Array es válido: {Array.isArray(testArray) ? 'SÍ' : 'NO'}</p>
      <p>Cantidad de items: {testArray.length}</p>
      
      <div className="mt-4">
        <h3>Lista de clientes:</h3>
        {Array.isArray(testArray) && testArray.map((customer) => (
          <div key={customer.id} className="border p-2 mb-2">
            <strong>{customer.name}</strong> - {customer.email}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TestCustomers;
