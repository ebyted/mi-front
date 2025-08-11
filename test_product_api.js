// Script para probar la API de productos desde el navegador
// Abre las herramientas de desarrollador y ejecuta esto en la consola

// Función para obtener el token de autenticación
function getAuthToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

// Función para hacer una petición a la API
async function testProductAPI() {
  const token = getAuthToken();
  
  if (!token) {
    console.error('❌ No se encontró token de autenticación');
    return;
  }
  
  console.log('🔑 Token encontrado:', token.substring(0, 20) + '...');
  
  // Datos de prueba del producto
  const testProduct = {
    name: 'Producto Test ' + Date.now(),
    sku: 'TEST-' + Date.now(),
    brand: 1, // ID de marca existente
    category: 1, // ID de categoría existente
    barcode: '123456789',
    minimum_stock: 10,
    maximum_stock: 100,
    price: 29.99, // PRECIO DE PRUEBA
    group: 5, // GRUPO DE PRUEBA
    is_active: true,
    business: 1 // ID del negocio
  };
  
  console.log('📤 Enviando producto de prueba:', testProduct);
  
  try {
    // Crear producto
    const response = await fetch('https://www.sanchodistribuidora.com/api/products/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testProduct)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Producto creado exitosamente:', result);
      console.log('💰 Precio guardado:', result.price);
      console.log('👥 Grupo guardado:', result.group);
      
      // Verificar el producto recién creado
      const verifyResponse = await fetch(`https://www.sanchodistribuidora.com/api/products/${result.id}/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const verifyResult = await verifyResponse.json();
      console.log('🔍 Verificación del producto:', verifyResult);
      console.log('💰 Precio verificado:', verifyResult.price);
      console.log('👥 Grupo verificado:', verifyResult.group);
      
      return result.id;
    } else {
      console.error('❌ Error al crear producto:', result);
    }
  } catch (error) {
    console.error('❌ Error de red:', error);
  }
}

// Función para actualizar un producto existente
async function testProductUpdate(productId) {
  const token = getAuthToken();
  
  const updateData = {
    price: 49.99, // Nuevo precio
    group: 10 // Nuevo grupo
  };
  
  console.log(`📝 Actualizando producto ${productId} con:`, updateData);
  
  try {
    const response = await fetch(`https://www.sanchodistribuidora.com/api/products/${productId}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Producto actualizado:', result);
      console.log('💰 Precio actualizado:', result.price);
      console.log('👥 Grupo actualizado:', result.group);
    } else {
      console.error('❌ Error al actualizar:', result);
    }
  } catch (error) {
    console.error('❌ Error de red:', error);
  }
}

// Ejecutar pruebas
console.log('🚀 Iniciando pruebas de API de productos...');
testProductAPI().then(productId => {
  if (productId) {
    console.log('⏭️ Probando actualización...');
    testProductUpdate(productId);
  }
});
