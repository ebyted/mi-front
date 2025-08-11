console.log('=== PRUEBA DE API DE PRODUCTOS ===');

// Configuración de la API
const API_BASE = 'https://www.sanchodistribuidora.com/api';

// Función para hacer peticiones
async function testAPI() {
  try {
    // 1. Verificar si el endpoint responde
    console.log('1. Probando endpoint GET /products/');
    const getResponse = await fetch(`${API_BASE}/products/`);
    console.log('Status:', getResponse.status);
    
    if (getResponse.ok) {
      const products = await getResponse.json();
      console.log('Productos obtenidos:', products.length || 'No array');
      
      if (products.length > 0) {
        const firstProduct = products[0];
        console.log('Primer producto:', firstProduct);
        console.log('Campos del primer producto:', Object.keys(firstProduct));
        console.log('Precio del primer producto:', firstProduct.price);
        console.log('Grupo del primer producto:', firstProduct.group);
      }
    }

    // 2. Probar crear un producto de prueba
    console.log('\n2. Probando crear producto de prueba...');
    const testProduct = {
      name: 'PRODUCTO PRUEBA API',
      sku: 'TEST-' + Date.now(),
      brand: 1, // Asumiendo que existe
      category: 1, // Asumiendo que existe
      price: 99.99,
      group: 5,
      business: 1,
      is_active: true
    };
    
    console.log('Datos a enviar:', testProduct);
    
    const postResponse = await fetch(`${API_BASE}/products/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Aquí necesitarías agregar el token de autenticación si es necesario
      },
      body: JSON.stringify(testProduct)
    });
    
    console.log('Status POST:', postResponse.status);
    const responseText = await postResponse.text();
    console.log('Respuesta:', responseText);
    
    if (postResponse.ok) {
      const createdProduct = JSON.parse(responseText);
      console.log('Producto creado:', createdProduct);
      console.log('Precio guardado:', createdProduct.price);
      console.log('Grupo guardado:', createdProduct.group);
    }

  } catch (error) {
    console.error('Error en la prueba:', error);
  }
}

// Ejecutar solo si estamos en el navegador
if (typeof window !== 'undefined') {
  testAPI();
} else {
  console.log('Script preparado para ejecutar en el navegador');
}
