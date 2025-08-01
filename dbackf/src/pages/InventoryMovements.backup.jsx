import React, { useEffect, useState } from 'react';
import api from '../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const InventoryMovements = () => {
  // Estado para expandir filas
  const [expandedRows, setExpandedRows] = useState([]);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterAuth, setFilterAuth] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMovement, setSelectedMovement] = useState(null);
  const [details, setDetails] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [productVariants, setProductVariants] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState({ warehouse: '', movement_type: '', reference_document: '', notes: '' });
  const [formError, setFormError] = useState('');
  // Estado para edición
  const [editMode, setEditMode] = useState(false);

  // Alternar expansión de fila
  const toggleRow = id => {
    setExpandedRows(expandedRows =>
      expandedRows.includes(id)
        ? expandedRows.filter(rowId => rowId !== id)
        : [...expandedRows, id]
    );
  };

  // Obtener movimientos filtrados
  const filteredMovements = movements.filter(m =>
    (!filterWarehouse || String(m.warehouse?.id) === String(filterWarehouse)) &&
    (!filterType || m.movement_type === filterType) &&
    (!filterAuth || String(m.authorized ? 1 : 0) === filterAuth) &&
    (!filterSearch ||
      (m.reference_document?.toLowerCase().includes(filterSearch.toLowerCase()) ||
        m.notes?.toLowerCase().includes(filterSearch.toLowerCase()) ||
        (m.user?.email || m.user?.username || m.user?.name || '').toLowerCase().includes(filterSearch.toLowerCase())
      )
    )
  );
  // Calcular paginación
  const totalPages = Math.max(1, Math.ceil(filteredMovements.length / rowsPerPage));
  const paginatedMovements = filteredMovements.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  // Cambiar página si el filtro reduce el total
  React.useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [filteredMovements.length, rowsPerPage]);

  // Exportar movimientos filtrados a Excel
  const exportToExcel = () => {
    const filtered = movements.filter(m =>
      (!filterWarehouse || String(m.warehouse?.id) === String(filterWarehouse)) &&
      (!filterType || m.movement_type === filterType) &&
      (!filterAuth || String(m.authorized ? 1 : 0) === filterAuth) &&
      (!filterSearch ||
        (m.reference_document?.toLowerCase().includes(filterSearch.toLowerCase()) ||
          m.notes?.toLowerCase().includes(filterSearch.toLowerCase()) ||
          (m.user?.email || m.user?.username || m.user?.name || '').toLowerCase().includes(filterSearch.toLowerCase())
        )
      )
    );
    const data = filtered.map(m => ({
      ID: m.id,
      Almacen: m.warehouse?.name || '-',
      Tipo: m.movement_type,
      Cantidad: Array.isArray(m.details)
        ? m.details.reduce((sum, d) => sum + (parseFloat(d.quantity) || 0), 0)
        : (typeof m.total_quantity !== 'undefined' ? m.total_quantity : '-'),
      UsuarioCrea: (m.user && (m.user.email || m.user.username || m.user.name)) ? (m.user.email || m.user.username || m.user.name) : '-',
      UsuarioAutoriza: m.authorized_by?.email || '-',
      Fecha: m.created_at?.substring(0, 19).replace('T', ' '),
      Autorizado: m.authorized ? 'Sí' : 'No',
      Referencia: m.reference_document || '-',
      Notas: m.notes || '-'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
    XLSX.writeFile(wb, 'movimientos_inventario.xlsx');
  };

  // Exportar movimientos filtrados a PDF
  const exportToPDF = () => {
    const filtered = movements.filter(m =>
      (!filterWarehouse || String(m.warehouse?.id) === String(filterWarehouse)) &&
      (!filterType || m.movement_type === filterType) &&
      (!filterAuth || String(m.authorized ? 1 : 0) === filterAuth) &&
      (!filterSearch ||
        (m.reference_document?.toLowerCase().includes(filterSearch.toLowerCase()) ||
          m.notes?.toLowerCase().includes(filterSearch.toLowerCase()) ||
          (m.user?.email || m.user?.username || m.user?.name || '').toLowerCase().includes(filterSearch.toLowerCase())
        )
      )
    );
    const doc = new jsPDF();
    doc.text('Movimientos de Inventario', 14, 14);
    doc.autoTable({
      startY: 20,
      head: [[
        'ID', 'Almacén', 'Tipo', 'Cantidad', 'Usuario crea', 'Usuario autoriza', 'Fecha', 'Autorizado', 'Referencia', 'Notas'
      ]],
      body: filtered.map(m => [
        m.id,
        m.warehouse?.name || '-',
        m.movement_type,
        Array.isArray(m.details)
          ? m.details.reduce((sum, d) => sum + (parseFloat(d.quantity) || 0), 0)
          : (typeof m.total_quantity !== 'undefined' ? m.total_quantity : '-'),
        (m.user && (m.user.email || m.user.username || m.user.name)) ? (m.user.email || m.user.username || m.user.name) : '-',
        m.authorized_by?.email || '-',
        m.created_at?.substring(0, 19).replace('T', ' '),
        m.authorized ? 'Sí' : 'No',
        m.reference_document || '-',
        m.notes || '-'
      ])
    });
    doc.save('movimientos_inventario.pdf');
  };

  // Cargar movimientos, productos y almacenes
  useEffect(() => {
    setLoading(true);
    
    const loadData = async () => {
      try {
        console.log('Iniciando carga de datos...');
        
        // Cargar movimientos
        const movementsRes = await api.get('inventory-movements/');
        console.log('Movimientos recibidos del servidor:', movementsRes.data);
        setMovements(movementsRes.data || []);
        
        // Cargar productos
        const productsRes = await api.get('products/');
        const productsData = Array.isArray(productsRes.data) ? productsRes.data : (productsRes.data.results || []);
        console.log('Productos cargados:', productsData.length);
        setProducts(productsData);
        
        // Cargar product-variants
        const variantsRes = await api.get('product-variants/');
        const variantsData = Array.isArray(variantsRes.data) ? variantsRes.data : (variantsRes.data.results || []);
        console.log('Product-variants cargados:', variantsData.length);
        setProductVariants(variantsData);
        
        // Cargar almacenes
        const warehousesRes = await api.get('warehouses/');
        setWarehouses(warehousesRes.data || []);
        
        console.log('Datos cargados exitosamente');
        
      } catch (err) {
        console.error('Error cargando datos:', err);
        if (err.response?.status === 401) {
          setError('Error de autenticación. Por favor, inicia sesión nuevamente.');
        } else {
          setError('No se pudieron cargar los datos. Verifica la conexión con el servidor.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Al seleccionar un movimiento, obtener sus detalles
  useEffect(() => {
    if (selectedMovement) {
      api.get(`inventory-movements/${selectedMovement.id}/details/`)
        .then(res => {
          console.log('Detalles recibidos:', res.data);
          setDetails(res.data);
        })
        .catch(() => setDetails([]));
    }
  }, [selectedMovement]);

  // Modal: agregar detalle
  const [modalDetails, setModalDetails] = useState([
    { product_variant: '', quantity: '', price: '', lote: '', expiration_date: '' }
  ]);

  const handleModalDetailChange = (idx, e) => {
    const newDetails = [...modalDetails];
    newDetails[idx][e.target.name] = e.target.value;
    setModalDetails(newDetails);
    
    // Log para debug
    console.log(`Campo ${e.target.name} cambiado en índice ${idx}:`, e.target.value);
  };

  // Función para crear product-variant automáticamente si no existe
  const createMissingProductVariant = async (productId) => {
    try {
      // Buscar el producto en la lista
      const product = products.find(p => p.id === parseInt(productId));
      if (!product) {
        console.error('Producto no encontrado:', productId);
        return null;
      }

      console.log(`Creando product-variant para producto ${productId}: ${product.name}`);
      
      // Payload con campos requeridos
      const variantPayload = {
        product: product.id,
        name: product.name || `Variante ${product.id}`,
        sku: product.sku || `VAR-${product.id}`,
        is_active: true,
        cost_price: product.cost_price || 0,
        sale_price: product.sale_price || 0,
        purchase_price: product.purchase_price || 0
      };
      
      console.log('Payload para crear variante:', variantPayload);
      
      const response = await api.post('product-variants/', variantPayload);
      
      console.log('Product-variant creada exitosamente:', response.data);
      
      // Actualizar la lista de productVariants
      setProductVariants(prev => [...prev, response.data]);
      
      return response.data;
    } catch (err) {
      console.error('Error creando product-variant:', err.response?.data || err.message);
      if (err.response?.data) {
        console.error('Detalles del error:', JSON.stringify(err.response.data, null, 2));
      }
      return null;
    }
  };

  // Función para forzar la recarga y sincronización de product-variants
  const refreshProductVariants = async () => {
    try {
      setFormError('Sincronizando product-variants...');
      
      // Recargar productos
      const productsRes = await api.get('products/');
      const productsData = Array.isArray(productsRes.data) ? productsRes.data : (productsRes.data.results || []);
      setProducts(productsData);
      
      // Recargar product-variants
      const variantsRes = await api.get('product-variants/');
      const existingVariants = Array.isArray(variantsRes.data) ? variantsRes.data : (variantsRes.data.results || []);
      
      // Obtener IDs de productos que ya tienen variantes
      const existingProductIds = existingVariants.map(v => v.product);
      
      // Encontrar productos activos que NO tienen variantes
      const productsWithoutVariants = productsData.filter(product => 
        product.is_active && !existingProductIds.includes(product.id)
      );
      
      if (productsWithoutVariants.length > 0) {
        setFormError(`Creando ${productsWithoutVariants.length} product-variants faltantes...`);
        
        // Crear variantes para productos que no las tienen
        const variantPromises = productsWithoutVariants.slice(0, 10).map(product => {
          const variantPayload = {
            product: product.id,
            name: product.name || `Variante ${product.id}`,
            sku: product.sku || `VAR-${product.id}`,
            is_active: true,
            cost_price: product.cost_price || 0,
            sale_price: product.sale_price || 0,
            purchase_price: product.purchase_price || 0
          };
          
          return api.post('product-variants/', variantPayload).then(res => res.data).catch(err => {
            console.error(`Error creando variante para producto ${product.id}:`, err.response?.data || err.message);
            return null;
          });
        });
        
        const results = await Promise.all(variantPromises);
        const newVariants = results.filter(result => result !== null);
        
        // Combinar variantes existentes con las nuevas
        const allVariants = [...existingVariants, ...newVariants];
        setProductVariants(allVariants);
        
        setFormError('');
        alert(`✓ Sincronización completada. Se crearon ${newVariants.length} product-variants nuevas.`);
      } else {
        setProductVariants(existingVariants);
        setFormError('');
        alert('✓ Todos los productos ya tienen sus product-variants correspondientes.');
      }
    } catch (err) {
      console.error('Error refrescando product-variants:', err);
      setFormError('Error al sincronizar product-variants. Verifica la conexión con el servidor.');
    }
  };

  // Función para generar notas automáticas
  const generateAutoNotes = (movementType, warehouseId) => {
    if (!movementType || !warehouseId) return '';
    
    const warehouse = warehouses.find(w => w.id === parseInt(warehouseId));
    const warehouseName = warehouse ? warehouse.name : 'Almacén desconocido';
    
    const movementTypes = {
      'entrada': `Entrada de material al almacén ${warehouseName}`,
      'salida': `Salida de material del almacén ${warehouseName}`,
      'ajuste': `Ajuste de inventario en almacén ${warehouseName}`
    };
    
    return movementTypes[movementType] || `Movimiento ${movementType} en ${warehouseName}`;
  };

  // Función para manejar cambios en el formulario principal
  const handleFormChange = (field, value) => {
    const newForm = { ...form, [field]: value };
    
    // Si cambió el tipo de movimiento o el almacén, generar notas automáticas
    // Solo actualizar las notas automáticamente si están vacías o contienen texto auto-generado
    if (field === 'movement_type' || field === 'warehouse') {
      const autoNotes = generateAutoNotes(
        field === 'movement_type' ? value : form.movement_type,
        field === 'warehouse' ? value : form.warehouse
      );
      
      // Solo actualizar las notas si están vacías o parecen ser auto-generadas
      if (!form.notes || form.notes.includes('almacén') || form.notes.includes('Entrada') || form.notes.includes('Salida') || form.notes.includes('Ajuste')) {
        newForm.notes = autoNotes;
      }
    }
    
    setForm(newForm);
  };

  // Función para limpiar el modal
  const resetModal = () => {
    setShowModal(false);
    setEditMode(false);
    setForm({ warehouse: '', movement_type: '', reference_document: '', notes: '' });
    setModalDetails([{ product_variant: '', quantity: '', price: '', lote: '', expiration_date: '' }]);
    setProductSearch('');
    setFormError('');
  };

  const addModalDetail = () => {
    setModalDetails([...modalDetails, { product_variant: '', quantity: '', price: '', lote: '', expiration_date: '' }]);
  };
  const removeModalDetail = idx => {
    setModalDetails(modalDetails.filter((_, i) => i !== idx));
  };

  // Crear movimiento
  const handleSubmit = async e => {
    e.preventDefault();
    setFormError('');
    
    // Validación mejorada
    if (!form.warehouse || !form.movement_type) {
      setFormError('Todos los campos del formulario son obligatorios.');
      return;
    }
    
    // Verificar que todos los detalles tengan datos válidos
    const invalidDetails = modalDetails.some(d => {
      const hasProduct = d.product_variant && d.product_variant !== '' && !isNaN(parseInt(d.product_variant));
      const hasQuantity = d.quantity && d.quantity !== '' && parseFloat(d.quantity) > 0;
      const hasPrice = d.price !== '' && d.price !== null && typeof d.price !== 'undefined' && parseFloat(d.price) >= 0;
      
      console.log('Validando detalle:', { 
        product_variant: d.product_variant, 
        hasProduct, 
        parsedProduct: parseInt(d.product_variant),
        quantity: d.quantity, 
        hasQuantity, 
        price: d.price, 
        hasPrice 
      });
      
      return !hasProduct || !hasQuantity || !hasPrice;
    });
    
    if (invalidDetails) {
      setFormError('Todos los productos deben tener seleccionado un producto, cantidad válida y precio.');
      return;
    }
    
    try {
      console.log('modalDetails antes de procesar:', JSON.stringify(modalDetails, null, 2));
      
      // Validar que todos los product_variant sean números válidos
      const hasInvalidProducts = modalDetails.some(d => !d.product_variant || isNaN(parseInt(d.product_variant)));
      if (hasInvalidProducts) {
        setFormError('Error: Productos no válidos seleccionados. Por favor, revisa la selección de productos.');
        return;
      }
      
      // Verificar que todos los product-variants existen o crear mapping directo
      const missingVariants = [];
      const directProductMapping = {};
      
      for (const detail of modalDetails) {
        const variantId = parseInt(detail.product_variant);
        const variantExists = productVariants.find(pv => pv.id === variantId);
        
        if (!variantExists) {
          console.warn(`Product-variant ${variantId} no existe`);
          
          // Verificar si es un producto válido
          const product = products.find(p => p.id === variantId);
          if (product) {
            console.log(`Usando producto ${variantId} directamente: ${product.name}`);
            directProductMapping[variantId] = product;
          } else {
            console.error(`Ni product-variant ni producto ${variantId} existen`);
            setFormError(`Error: El producto/variante ${variantId} no existe en el sistema.`);
            return;
          }
        }
      }
      
      // Si hay productos que necesitan variants, intentar crearlas
      if (Object.keys(directProductMapping).length > 0) {
        setFormError('Preparando productos para usar... por favor espera...');
        
        for (const [productId, product] of Object.entries(directProductMapping)) {
          const createdVariant = await createMissingProductVariant(productId);
          if (!createdVariant) {
            console.warn(`No se pudo crear variant para producto ${productId}, usando producto directamente`);
          }
        }
        
        // Esperar un momento para que se actualice el estado
        await new Promise(resolve => setTimeout(resolve, 500));
        setFormError('');
      }
      
      // Convert empty price to null for backend and calculate total automatically
      const cleanedDetails = modalDetails.map(d => ({
        product_variant: parseInt(d.product_variant), // Mantener product_variant como espera el backend
        quantity: parseFloat(d.quantity),
        price: parseFloat(d.price),
        total: parseFloat(d.quantity) * parseFloat(d.price), // Calcular total automáticamente
        lote: d.lote || null,
        expiration_date: d.expiration_date === '' ? null : d.expiration_date
      }));
      
      console.log('Enviando detalles limpios:', cleanedDetails);
      
      // Verificar que no hay valores null en product_variant
      const hasNullProducts = cleanedDetails.some(d => d.product_variant === null || d.product_variant === undefined || isNaN(d.product_variant));
      if (hasNullProducts) {
        console.error('Error: Se detectaron product_variant null o inválidos:', cleanedDetails);
        setFormError('Error interno: Productos no válidos. Por favor, vuelve a seleccionar los productos.');
        return;
      }
      
      const payload = {
        warehouse_id: parseInt(form.warehouse),
        movement_type: form.movement_type,
        reference_document: form.reference_document || null,
        notes: form.notes || null,
        details: cleanedDetails
      };
      
      console.log('Payload completo:', payload);
      console.log('Details específicos:', JSON.stringify(cleanedDetails, null, 2));
      
      await api.post('inventory-movements/', payload);
      setShowModal(false);
      setForm({ warehouse: '', movement_type: '', reference_document: '', notes: '' });
      setModalDetails([{ product_variant: '', quantity: '', price: '', lote: '', expiration_date: '' }]);
      setProductSearch('');
      setFormError('');
      setLoading(true);
      api.get('inventory-movements/')
        .then(res => {
          console.log('Movimientos recibidos:', res.data);
          setMovements(res.data);
        })
        .catch(() => setMovements([]))
        .finally(() => setLoading(false));
    } catch (err) {
      console.error('Error completo:', err);
      console.error('Error response:', err.response);
      console.error('Error response data:', err.response?.data);
      
      // Mostrar el mensaje de error exacto del backend si existe
      let msg = 'Error al crear movimiento.';
      if (err && err.response && err.response.data) {
        if (typeof err.response.data === 'string') {
          msg = err.response.data;
        } else if (typeof err.response.data === 'object') {
          msg = Object.entries(err.response.data)
            .map(([k, v]) => {
              if (Array.isArray(v)) {
                // If array contains objects, show their key-value pairs
                if (v.length > 0 && typeof v[0] === 'object') {
                  return `${k}: ${v.map(obj => Object.entries(obj).map(([kk, vv]) => `${kk}: ${vv}`).join(', ')).join(' | ')}`;
                } else {
                  return `${k}: ${v.join(', ')}`;
                }
              } else {
                return `${k}: ${v}`;
              }
            })
            .join(' | ');
        }
      }
      
      // Agregar información de status code
      if (err.response?.status) {
        msg = `HTTP ${err.response.status}: ${msg}`;
      }
      
      // Si el error sigue siendo de product-variant no encontrado, dar más contexto
      if (msg.includes('ProductVariant matching query does not exist')) {
        msg += ' | SOLUCIÓN: Refresca la página y vuelve a intentar. Si persiste, verifica que los productos estén activos en el sistema.';
      }
      
      setFormError(msg);
    }
  };

  // Filtrar productos por búsqueda rápida
  // Filtrar solo variantes de productos activos
  const filteredProductVariants = React.useMemo(() => {
    console.log('=== INICIANDO FILTRADO DE PRODUCT-VARIANTS ===');
    console.log('Total productVariants:', productVariants.length);
    console.log('Búsqueda actual:', productSearch);
    
    if (productVariants.length === 0) {
      console.log('No hay productVariants disponibles');
      return [];
    }
    
    // Mostrar algunos productos de ejemplo para debug
    if (productVariants.length > 0) {
      console.log('Ejemplo de product-variant:', productVariants[0]);
    }
    
    // Filtrar solo variantes activas
    const activeVariants = productVariants.filter(pv => {
      // Las variantes reales del backend tienen is_active
      const isActive = pv.is_active === true;
      
      if (!isActive) {
        console.log('Product-variant inactiva filtrada:', pv.name);
      }
      
      return isActive;
    });
    
    console.log('Product-variants activas encontradas:', activeVariants.length);
    
    // Si no hay búsqueda, devolver todas las activas
    if (!productSearch || productSearch.trim() === '') {
      console.log('Sin búsqueda - devolviendo todas las activas:', activeVariants.length);
      return activeVariants;
    }
    
    const searchTerm = productSearch.toLowerCase().trim();
    console.log('Aplicando búsqueda con término:', searchTerm);
    
    const filtered = activeVariants.filter(pv => {
      const variantName = (pv.name || '').toLowerCase();
      const sku = (pv.sku || '').toLowerCase();
      
      const matches = variantName.includes(searchTerm) || 
                     sku.includes(searchTerm);
      
      if (matches) {
        console.log('✓ Product-variant coincide:', { name: variantName, sku, searchTerm });
      }
      
      return matches;
    });
    
    console.log('Product-variants filtradas final:', filtered.length);
    console.log('=== FIN FILTRADO DE PRODUCT-VARIANTS ===');
    return filtered;
  }, [productVariants, productSearch]);

  // Autorizar movimiento
  const authorizeMovement = async id => {
    if (!window.confirm('¿Seguro que deseas autorizar este movimiento?')) return;
    try {
      await api.post('authorize-inventory-movement/', { movement_id: id });
      api.get('inventory-movements/').then(res => setMovements(res.data));
    } catch {
      alert('No se pudo autorizar el movimiento.');
    }
  };

  // Eliminar movimiento
  const deleteMovement = async id => {
    if (!window.confirm('¿Seguro que deseas eliminar este movimiento?')) return;
    try {
      await api.delete(`inventory-movements/${id}/`);
      api.get('inventory-movements/').then(res => setMovements(res.data));
    } catch {
      alert('No se pudo eliminar el movimiento.');
    }
  };

  // Editar movimiento
  const startEditMovement = m => {
    setForm({
      warehouse: m.warehouse?.id || '',
      movement_type: m.movement_type || '',
      reference_document: m.reference_document || '',
      notes: m.notes || ''
    });
    setModalDetails(Array.isArray(m.details) && m.details.length > 0
      ? m.details.map(d => ({
          product_variant: d.product?.id || d.product_variant?.id || d.product_variant || d.product || '',
          quantity: d.quantity,
          price: d.price,
          lote: d.lote,
          expiration_date: d.expiration_date ? String(d.expiration_date).substring(0, 10) : ''
        }))
      : [{ product_variant: '', quantity: '', price: '', lote: '', expiration_date: '' }]
    );
    setEditMode(m.id);
    setShowModal(true);
  };

  // Guardar edición
  const handleEditSubmit = async e => {
    e.preventDefault();
    setFormError('');
    
    // Validación mejorada igual que en creación
    if (!form.warehouse || !form.movement_type) {
      setFormError('Todos los campos del formulario son obligatorios.');
      return;
    }
    
    // Verificar que todos los detalles tengan datos válidos
    const invalidDetails = modalDetails.some(d => {
      const hasProduct = d.product_variant && d.product_variant !== '' && !isNaN(parseInt(d.product_variant));
      const hasQuantity = d.quantity && d.quantity !== '' && parseFloat(d.quantity) > 0;
      const hasPrice = d.price !== '' && d.price !== null && typeof d.price !== 'undefined' && parseFloat(d.price) >= 0;
      
      return !hasProduct || !hasQuantity || !hasPrice;
    });
    
    if (invalidDetails) {
      setFormError('Todos los productos deben tener seleccionado un producto, cantidad válida y precio.');
      return;
    }
    
    try {
      // Validar que todos los product_variant sean números válidos
      const hasInvalidProducts = modalDetails.some(d => !d.product_variant || isNaN(parseInt(d.product_variant)));
      if (hasInvalidProducts) {
        setFormError('Error: Productos no válidos seleccionados. Por favor, revisa la selección de productos.');
        return;
      }
      
      // Calcular total automáticamente en edición también con la misma lógica
      const cleanedDetails = modalDetails.map(d => ({
        product_variant: parseInt(d.product_variant), // Mantener product_variant como espera el backend
        quantity: parseFloat(d.quantity),
        price: parseFloat(d.price),
        lote: d.lote || null,
        expiration_date: d.expiration_date === '' ? null : d.expiration_date,
        total: parseFloat(d.quantity) * parseFloat(d.price)
      }));
      
      // Verificar que no hay valores null en product_variant para edición también
      const hasNullProducts = cleanedDetails.some(d => d.product_variant === null || d.product_variant === undefined || isNaN(d.product_variant));
      if (hasNullProducts) {
        console.error('Error: Se detectaron product_variant null o inválidos en edición:', cleanedDetails);
        setFormError('Error interno: Productos no válidos. Por favor, vuelve a seleccionar los productos.');
        return;
      }
      
      const payload = {
        warehouse_id: parseInt(form.warehouse),
        movement_type: form.movement_type,
        reference_document: form.reference_document || null,
        notes: form.notes || null,
        details: cleanedDetails
      };
      
      console.log('Payload de edición:', payload);
      
      await api.put(`inventory-movements/${editMode}/`, payload);
      setShowModal(false);
      setEditMode(false);
      setForm({ warehouse: '', movement_type: '', reference_document: '', notes: '' });
      setModalDetails([{ product_variant: '', quantity: '', price: '', lote: '', expiration_date: '' }]);
      setLoading(true);
      api.get('inventory-movements/')
        .then(res => setMovements(res.data))
        .catch(() => setMovements([]))
        .finally(() => setLoading(false));
    } catch (err) {
      setFormError('Error al editar movimiento.');
    }
  };

  return (
    <div className="container py-4 animate__animated animate__fadeIn" style={{ maxWidth: 1200, background: 'linear-gradient(135deg, #fffbe6 0%, #fff 100%)', borderRadius: 24, boxShadow: '0 4px 32px rgba(255,193,7,0.08)' }}>
      <div className="d-flex justify-content-between align-items-center mb-3 animate__animated animate__fadeInDown">
        <h2 className="text-warning fw-bold" style={{ letterSpacing: 1, textShadow: '0 2px 8px #ffe082' }}>
          <i className="bi bi-box-seam me-2"></i>Movimientos de Inventario
        </h2>
        <button className="btn btn-warning shadow-sm" style={{ borderRadius: 12, fontWeight: 500, transition: 'background 0.2s' }}
          onClick={() => setShowModal(true)} title="Registrar un nuevo movimiento"
          onMouseEnter={e => e.target.style.background = '#ffd54f'}
          onMouseLeave={e => e.target.style.background = ''}
        >
          <i className="bi bi-plus-circle me-1"></i> Nuevo Movimiento
        </button>
      </div>
      <div className="alert alert-info mb-2 animate__animated animate__fadeIn" style={{ fontSize: 'clamp(13px, 2vw, 15px)', borderRadius: 12, boxShadow: '0 2px 12px rgba(33,150,243,0.08)' }}>
        <strong>¿Cómo usar?</strong><br />
        <ul className="mb-0 ps-3">
          <li>Filtra por almacén, tipo, estado o busca por referencia, usuario o notas.</li>
          <li>Exporta los movimientos filtrados a Excel o PDF con los botones superiores.</li>
          <li>Haz clic en una fila para ver detalles rápidos. Usa los botones <span className="badge bg-success">✔</span> <span className="badge bg-warning text-dark">✎</span> <span className="badge bg-danger">🗑</span> para autorizar, editar o eliminar (solo si no está autorizado).</li>
          <li>La tabla y los controles se adaptan a dispositivos móviles.</li>
        </ul>
      </div>
      <div className="card mb-3 p-3 shadow-sm animate__animated animate__fadeIn" style={{ borderRadius: 16, background: 'linear-gradient(90deg, #fffde7 0%, #fff 100%)', boxShadow: '0 2px 16px rgba(255,193,7,0.07)' }}>
        <div className="row g-2 align-items-end">
          <div className="col-md-3">
            <label className="form-label mb-1" title="Filtra por almacén">Almacén</label>
            <select className="form-select" value={filterWarehouse} onChange={e => setFilterWarehouse(e.target.value)}>
              <option value="">Todos</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label mb-1" title="Filtra por tipo de movimiento">Tipo</label>
            <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">Todos</option>
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
              <option value="ajuste">Ajuste</option>
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label mb-1" title="Filtra por estado de autorización">Autorizado</label>
            <select className="form-select" value={filterAuth} onChange={e => setFilterAuth(e.target.value)}>
              <option value="">Todos</option>
              <option value="1">Sí</option>
              <option value="0">No</option>
            </select>
          </div>
          <div className="col-md-5">
            <label className="form-label mb-1" title="Busca por referencia, usuario o notas">Buscar</label>
            <input type="text" className="form-control" placeholder="Buscar por referencia, usuario, notas..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Modal para nuevo movimiento */}
      {showModal && (
        <div 
          className="modal-overlay" 
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '20px' }}
          onClick={(e) => e.target === e.currentTarget && resetModal()}
        >
          <div 
            className="modal-dialog" 
            style={{ maxWidth: 600, width: '100%', maxHeight: '90vh', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', borderRadius: 16, background: '#fff', margin: '0 auto', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content animate__animated animate__fadeIn" style={{ background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', maxHeight: '100%' }}>
              <div className="modal-header" style={{ borderBottom: '1px solid #eee', background: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '16px 20px', flexShrink: 0 }}>
                <h4 className="modal-title mb-0">{editMode ? 'Editar Movimiento' : 'Nuevo Movimiento'}</h4>
                <button type="button" className="btn-close" onClick={resetModal} style={{ fontSize: '1.2rem', opacity: 0.8 }}></button>
              </div>
              <div className="modal-body" style={{ background: '#fff', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, padding: '20px', overflow: 'auto', flexGrow: 1 }}>
                <form onSubmit={editMode ? handleEditSubmit : handleSubmit}>
                  <button type="submit" className="btn btn-warning w-100 mb-3">{editMode ? 'Guardar cambios' : 'Guardar movimiento'}</button>
                  {formError && <div className="alert alert-danger mb-2">{formError}</div>}
                  <div className="row mb-2">
                    <div className="col-md-12 mb-2">
                      <label className="form-label">Almacén</label>
                      <select name="warehouse" className="form-select" value={form.warehouse} onChange={e => handleFormChange('warehouse', e.target.value)} required>
                        <option value="">Selecciona almacén</option>
                        {warehouses.map(w => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-12 mb-2">
                      <label className="form-label">Tipo de movimiento</label>
                      <select name="movement_type" className="form-select" value={form.movement_type} onChange={e => handleFormChange('movement_type', e.target.value)} required>
                        <option value="">Selecciona tipo</option>
                        <option value="entrada">Entrada</option>
                        <option value="salida">Salida</option>
                        <option value="ajuste">Ajuste</option>
                      </select>
                    </div>
                  </div>
                  <div className="row mb-2">
                    <div className="col-md-12 mb-2">
                      <label className="form-label">Referencia</label>
                      <input name="reference_document" className="form-control" value={form.reference_document} onChange={e => handleFormChange('reference_document', e.target.value)} />
                    </div>
                    <div className="col-md-12 mb-2">
                      <label className="form-label">
                        Notas 
                        <small className="text-muted ms-2">(se generan automáticamente)</small>
                      </label>
                      <input 
                        name="notes" 
                        className="form-control" 
                        value={form.notes} 
                        onChange={e => handleFormChange('notes', e.target.value)} 
                        placeholder="Selecciona almacén y tipo de movimiento para generar automáticamente..."
                      />
                      {form.notes && (
                        <small className="text-success">
                          <i className="bi bi-check-circle me-1"></i>
                          Nota generada automáticamente (puedes editarla)
                        </small>
                      )}
                    </div>
                  </div>
                  <hr />
                  <h5>Detalles del movimiento</h5>
                  
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <label className="form-label mb-0">Buscar producto</label>
                      <div className="d-flex gap-2">
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => {
                            console.log('=== ESTADO ACTUAL ===');
                            console.log('Products:', products.length);
                            console.log('ProductVariants:', productVariants.length);
                            console.log('Productos de ejemplo:', products.slice(0, 3));
                            console.log('ProductVariants de ejemplo:', productVariants.slice(0, 3));
                            alert(`Productos: ${products.length}, Variantes: ${productVariants.length}. Ver consola para detalles.`);
                          }}
                          title="Ver estado actual en consola"
                        >
                          <i className="bi bi-bug me-1"></i>
                          Debug
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-outline-info btn-sm"
                          onClick={refreshProductVariants}
                          title="Sincronizar product-variants con productos activos"
                        >
                          <i className="bi bi-arrow-clockwise me-1"></i>
                          Sincronizar
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      className="form-control mt-2"
                      placeholder="Buscar producto por nombre o SKU..."
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                    />
                    {productSearch && (
                      <small className="text-muted">
                        Mostrando {filteredProductVariants.length} productos de {productVariants.length} totales
                      </small>
                    )}
                    {productVariants.length === 0 && products.length > 0 && (
                      <div className="alert alert-warning mt-2 mb-0">
                        <small>
                          <i className="bi bi-exclamation-triangle me-1"></i>
                          <strong>Nota:</strong> No se detectaron product-variants. 
                          Usa el botón "Sincronizar" para crearlas automáticamente o "Debug" para ver el estado actual.
                        </small>
                      </div>
                    )}
                  </div>
                  {modalDetails.map((d, idx) => (
                    <div className="card mb-3 p-3" key={idx} style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="mb-0">Producto #{idx + 1}</h6>
                        <button 
                          type="button" 
                          className="btn btn-danger btn-sm" 
                          onClick={() => removeModalDetail(idx)} 
                          disabled={modalDetails.length === 1}
                          title="Eliminar producto"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                      
                      <div className="row g-2">
                        <div className="col-12 mb-2">
                          <label className="form-label">Producto</label>
                          <select
                            name="product_variant"
                            className="form-select"
                            value={d.product_variant}
                            onChange={e => handleModalDetailChange(idx, e)}
                            required
                          >
                            <option value="">Selecciona un producto...</option>
                            {console.log('Renderizando dropdown con product-variants:', filteredProductVariants.length)}
                            {filteredProductVariants.length === 0 ? (
                              // Si no hay product-variants, mostrar productos directamente como fallback
                              products.filter(p => p.is_active).length > 0 ? (
                                <>
                                  <option value="" disabled style={{color: '#007bff', fontWeight: 'bold'}}>
                                    ⚠️ Usando productos directamente (creando variants automáticamente)
                                  </option>
                                  {products
                                    .filter(p => p.is_active)
                                    .filter(p => !productSearch || 
                                      (p.name || '').toLowerCase().includes(productSearch.toLowerCase()) ||
                                      (p.sku || '').toLowerCase().includes(productSearch.toLowerCase())
                                    )
                                    .map(product => (
                                      <option key={`product-${product.id}`} value={product.id}>
                                        {product.name || 'Sin nombre'} - SKU: {product.sku || 'Sin SKU'} (PRODUCTO)
                                      </option>
                                    ))
                                  }
                                </>
                              ) : (
                                <option value="" disabled>
                                  {productVariants.length === 0 
                                    ? 'Creando product-variants automáticamente...' 
                                    : productSearch 
                                      ? `No se encontraron productos con "${productSearch}"` 
                                      : 'No hay productos activos disponibles'
                                  }
                                </option>
                              )
                            ) : (
                              filteredProductVariants.map((pv, index) => {
                                console.log(`Renderizando product-variant ${index}:`, pv);
                                return (
                                  <option key={pv.id} value={pv.id}>
                                    {pv.name || 'Sin nombre'} - SKU: {pv.sku || 'Sin SKU'}
                                  </option>
                                );
                              })
                            )}
                          </select>
                          {d.product_variant && (
                            <small className="text-success">
                              <i className="bi bi-check-circle me-1"></i>
                              Producto seleccionado
                            </small>
                          )}
                        </div>
                        
                        <div className="col-md-6 mb-2">
                          <label className="form-label">Cantidad</label>
                          <input 
                            type="number" 
                            name="quantity" 
                            className="form-control" 
                            placeholder="Ej: 10" 
                            value={d.quantity} 
                            onChange={e => handleModalDetailChange(idx, e)} 
                            required 
                            min="1" 
                          />
                        </div>
                        
                        <div className="col-md-6 mb-2">
                          <label className="form-label">Precio unitario</label>
                          <input 
                            type="number" 
                            name="price" 
                            className="form-control" 
                            placeholder="Ej: 25.50" 
                            value={d.price} 
                            onChange={e => handleModalDetailChange(idx, e)} 
                            min="0" 
                            required 
                            step="0.01" 
                          />
                        </div>
                        
                        <div className="col-md-6 mb-2">
                          <label className="form-label">Total calculado</label>
                          <div className="form-control bg-success text-white fw-bold" style={{ display: 'flex', alignItems: 'center' }}>
                            ${((parseFloat(d.quantity) || 0) * (parseFloat(d.price) || 0)).toFixed(2)}
                          </div>
                        </div>
                        
                        <div className="col-md-6 mb-2">
                          <label className="form-label">Lote (opcional)</label>
                          <input 
                            type="text" 
                            name="lote" 
                            className="form-control" 
                            placeholder="Ej: LOTE001" 
                            value={d.lote} 
                            onChange={e => handleModalDetailChange(idx, e)} 
                          />
                        </div>
                        
                        <div className="col-md-6 mb-2">
                          <label className="form-label">Fecha de expiración (opcional)</label>
                          <input 
                            type="date" 
                            name="expiration_date" 
                            className="form-control" 
                            value={d.expiration_date} 
                            onChange={e => handleModalDetailChange(idx, e)} 
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="d-grid gap-2 mb-3">
                    <button 
                      type="button" 
                      className="btn btn-outline-warning d-flex align-items-center justify-content-center" 
                      onClick={addModalDetail}
                    >
                      <i className="bi bi-plus-circle me-2"></i>
                      Agregar otro producto
                    </button>
                  </div>
                  
                  {/* Botón adicional de cerrar */}
                  <div className="d-grid gap-2 mt-3">
                    <button 
                      type="button" 
                      className="btn btn-outline-secondary" 
                      onClick={resetModal}
                    >
                      ✖ Cerrar sin guardar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Listado de movimientos */}
      <div className="card shadow mb-4 animate__animated animate__fadeInUp" style={{ borderRadius: 16, background: 'linear-gradient(90deg, #fffde7 0%, #fff 100%)', boxShadow: '0 2px 16px rgba(255,193,7,0.07)' }}>
        <div className="card-body p-0" style={{ overflowX: 'auto', borderRadius: 16 }}>
          <div className="d-flex justify-content-end gap-2 p-3">
            <button className="btn btn-outline-success shadow-sm" style={{ borderRadius: 10, fontWeight: 500, transition: 'background 0.2s' }}
              onClick={exportToExcel} title="Exporta los movimientos filtrados a Excel"
              onMouseEnter={e => e.target.style.background = '#e8f5e9'}
              onMouseLeave={e => e.target.style.background = ''}
            >
              <i className="bi bi-file-earmark-excel"></i> Exportar a Excel
            </button>
            <button className="btn btn-outline-danger shadow-sm" style={{ borderRadius: 10, fontWeight: 500, transition: 'background 0.2s' }}
              onClick={exportToPDF} title="Exporta los movimientos filtrados a PDF"
              onMouseEnter={e => e.target.style.background = '#ffebee'}
              onMouseLeave={e => e.target.style.background = ''}
            >
              <i className="bi bi-file-earmark-pdf"></i> Exportar a PDF
            </button>
          </div>
          {/* Debug info */}
          <div className="alert alert-info mx-3 mb-2">
            <small>
              <strong>Estado de datos:</strong> 
              Movimientos totales: <span className="badge bg-primary">{movements.length}</span> | 
              Filtrados: <span className="badge bg-success">{filteredMovements.length}</span> | 
              En página actual: <span className="badge bg-warning text-dark">{paginatedMovements.length}</span> | 
              Página {page} de {totalPages}
            </small>
          </div>
          
          {/* Controles de paginación */}
          <div className="d-flex justify-content-between align-items-center px-3 pb-2">
            <div>
              <span className="me-2">Mostrar</span>
              <select className="form-select d-inline-block w-auto" value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}>
                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="ms-2">movimientos por página</span>
            </div>
            <div>
              <nav>
                <ul className="pagination mb-0">
                  <li className={`page-item${page === 1 ? ' disabled' : ''}`}> <button className="page-link" onClick={() => setPage(page - 1)} disabled={page === 1}>Anterior</button> </li>
                  {[...Array(totalPages)].map((_, i) => (
                    <li key={i + 1} className={`page-item${page === i + 1 ? ' active' : ''}`}> <button className="page-link" onClick={() => setPage(i + 1)}>{i + 1}</button> </li>
                  ))}
                  <li className={`page-item${page === totalPages ? ' disabled' : ''}`}> <button className="page-link" onClick={() => setPage(page + 1)} disabled={page === totalPages}>Siguiente</button> </li>
                </ul>
              </nav>
            </div>
          </div>
          {loading ? (
            <div className="text-center text-secondary py-4">
              <div className="spinner-border me-2"></div>
              Cargando movimientos de inventario...
            </div>
          ) : error ? (
            <div className="text-center text-danger py-4">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
            </div>
          ) : paginatedMovements.length === 0 ? (
            <div className="text-center text-muted py-5">
              <i className="bi bi-inbox display-1"></i>
              <h4 className="mt-3">No hay movimientos para mostrar</h4>
              <p>
                {movements.length === 0 
                  ? 'No se encontraron movimientos en el sistema.' 
                  : `Hay ${movements.length} movimientos total(es), pero ninguno coincide con los filtros aplicados.`
                }
              </p>
              {movements.length > 0 && filteredMovements.length === 0 && (
                <button 
                  className="btn btn-outline-primary"
                  onClick={() => {
                    setFilterWarehouse('');
                    setFilterType('');
                    setFilterAuth('');
                    setFilterSearch('');
                    setPage(1);
                  }}
                >
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  Limpiar todos los filtros
                </button>
              )}
            </div>
          ) : (
            <table className="table table-bordered table-hover mb-0 align-middle shadow-sm animate__animated animate__fadeIn" style={{ borderRadius: 12, minWidth: 900, fontSize: 'clamp(13px, 2vw, 15px)', overflow: 'hidden', background: 'rgba(255,255,255,0.98)' }}>
              <thead className="table-warning text-center" style={{ fontSize: 15 }}>
                <tr style={{ background: 'linear-gradient(90deg, #fffde7 0%, #fff 100%)' }}>
                  <th>ID <span title="Identificador único del movimiento" style={{ cursor: 'help', color: '#ff9800' }}>ⓘ</span></th>
                  <th>Almacén <span title="Almacén donde ocurre el movimiento" style={{ cursor: 'help', color: '#ff9800' }}>ⓘ</span></th>
                  <th>Tipo <span title="Tipo de movimiento: entrada, salida o ajuste" style={{ cursor: 'help', color: '#ff9800' }}>ⓘ</span></th>
                  <th>Cantidad <span title="Cantidad total de artículos en el movimiento" style={{ cursor: 'help', color: '#ff9800' }}>ⓘ</span></th>
                  <th>Usuario crea <span title="Usuario que registró el movimiento" style={{ cursor: 'help', color: '#ff9800' }}>ⓘ</span></th>
                  <th>Usuario autoriza <span title="Usuario que autorizó el movimiento" style={{ cursor: 'help', color: '#ff9800' }}>ⓘ</span></th>
                  <th>Fecha <span title="Fecha de registro" style={{ cursor: 'help', color: '#ff9800' }}>ⓘ</span></th>
                  <th>Autorizado <span title="Estado de autorización" style={{ cursor: 'help', color: '#ff9800' }}>ⓘ</span></th>
                  <th className="text-center">Acciones <span title="Autorizar, editar o eliminar" style={{ cursor: 'help', color: '#ff9800' }}>ⓘ</span></th>
                </tr>
              </thead>
              <tbody>
                {paginatedMovements.map(m => {
                  // Suma de cantidades de detalles si existen
                  const totalQty = Array.isArray(m.details)
                    ? m.details.reduce((sum, d) => sum + (parseFloat(d.quantity) || 0), 0)
                    : (typeof m.total_quantity !== 'undefined' ? m.total_quantity : '-');
                  // Badge para tipo
                  let tipoBadge = '';
                  if (m.movement_type === 'entrada') tipoBadge = <span className="badge bg-success">Entrada</span>;
                  else if (m.movement_type === 'salida') tipoBadge = <span className="badge bg-danger">Salida</span>;
                  else tipoBadge = <span className="badge bg-info text-dark">Ajuste</span>;
                  // Badge para autorizado
                  const authBadge = m.authorized ? <span className="badge bg-primary">Sí</span> : <span className="badge bg-secondary">No</span>;
                  return (
                    <React.Fragment key={m.id}>
                      <tr style={{ cursor: 'pointer' }}
                        className={expandedRows.includes(m.id) ? 'table-active' : ''}
                        onClick={e => {
                          // Solo expandir si no se hace click en acciones
                          if (e.target.closest('.row-actions')) return;
                          toggleRow(m.id);
                        }}
                      >
                        <td className="text-center fw-bold" style={{ background: expandedRows.includes(m.id) ? '#fffde7' : '', transition: 'background 0.2s' }}>
                          <span style={{ fontSize: 18, marginRight: 8, color: '#ffb300', transition: 'color 0.2s' }}>
                            {expandedRows.includes(m.id) ? '▼' : '▶'}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: 17 }}>{m.id}</span>
                        </td>
                        <td style={{ background: expandedRows.includes(m.id) ? '#fffde7' : '', transition: 'background 0.2s' }}>{m.warehouse?.name || '-'}</td>
                        <td className="text-center">{tipoBadge}</td>
                        <td className="text-center"><span className="badge bg-light text-dark" style={{ fontWeight: 600, fontSize: 15 }}>{totalQty}</span></td>
                        <td style={{ background: expandedRows.includes(m.id) ? '#fffde7' : '', transition: 'background 0.2s' }}>{(m.user && (m.user.email || m.user.username || m.user.name)) ? (m.user.email || m.user.username || m.user.name) : '-'}</td>
                        <td>{m.authorized_by?.email || '-'}</td>
                        <td className="text-center">{m.created_at?.substring(0, 19).replace('T', ' ')}</td>
                        <td className="text-center">{authBadge}</td>
                        <td className="text-center row-actions">
                          {!m.authorized && (
                            <>
                              <button className="btn btn-sm btn-success me-1 shadow-sm" style={{ borderRadius: 8, transition: 'background 0.2s' }} title="Autorizar" data-bs-toggle="tooltip" data-bs-placement="top" onClick={e => { e.stopPropagation(); authorizeMovement(m.id); }}
                                onMouseEnter={e => e.target.style.background = '#c8e6c9'}
                                onMouseLeave={e => e.target.style.background = ''}
                              >
                                <i className="bi bi-check2-circle"></i>
                              </button>
                              <button className="btn btn-sm btn-warning me-1 shadow-sm" style={{ borderRadius: 8, transition: 'background 0.2s' }} title="Editar" data-bs-toggle="tooltip" data-bs-placement="top" onClick={e => { e.stopPropagation(); startEditMovement(m); }}
                                onMouseEnter={e => e.target.style.background = '#fffde7'}
                                onMouseLeave={e => e.target.style.background = ''}
                              >
                                <i className="bi bi-pencil-square"></i>
                              </button>
                              <button className="btn btn-sm btn-danger shadow-sm" style={{ borderRadius: 8, transition: 'background 0.2s' }} title="Eliminar" data-bs-toggle="tooltip" data-bs-placement="top" onClick={e => { e.stopPropagation(); deleteMovement(m.id); }}
                                onMouseEnter={e => e.target.style.background = '#ffcdd2'}
                                onMouseLeave={e => e.target.style.background = ''}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                      {expandedRows.includes(m.id) && (
                        <tr className="bg-light animate__animated animate__fadeIn">
                          <td colSpan={9} style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(255,193,7,0.08)', background: '#fffde7' }}>
                            <div className="p-2">
                              <strong>Referencia:</strong> <span className="badge bg-info text-dark" style={{ fontSize: 14 }}>{m.reference_document || '-'}</span><br />
                              <strong>Notas:</strong> <span className="badge bg-light text-dark" style={{ fontSize: 14 }}>{m.notes || '-'}</span><br />
                              <strong>Detalles:</strong>
                              {Array.isArray(m.details) && m.details.length > 0 ? (
                                <table className="table table-sm table-bordered mt-2 mb-0" style={{ borderRadius: 8, background: '#fff' }}>
                                  <thead>
                                    <tr style={{ background: '#fffde7' }}>
                                      <th>Producto</th>
                                      <th>SKU</th>
                                      <th>Cantidad</th>
                                      <th>Precio</th>
                                      <th>Total</th>
                                      <th>Lote</th>
                                      <th>Expiración</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {m.details.map(d => (
                                      <tr key={d.id || d.product_variant} style={{ transition: 'background 0.2s' }}>
                                        <td>{d.product_variant?.name || '-'}</td>
                                        <td>{d.product_variant?.sku || '-'}</td>
                                        <td><span className="badge bg-light text-dark" style={{ fontWeight: 600 }}>{d.quantity}</span></td>
                                        <td>{d.price}</td>
                                        <td>{d.total}</td>
                                        <td>{d.lote || '-'}</td>
                                        <td>{d.expiration_date ? String(d.expiration_date).substring(0, 10) : '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="text-muted">No hay detalles para este movimiento.</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot className="table-light fw-bold">
                <tr style={{ background: '#fffde7' }}>
                  <td colSpan={3} className="text-end">Total movimientos en página:</td>
                  <td className="text-center">
                    <span className="badge bg-warning text-dark" style={{ fontSize: 15 }}>{paginatedMovements.length}</span>
                  </td>
                  <td colSpan={1} className="text-end">Suma cantidades:</td>
                  <td className="text-center" colSpan={3}>
                    <span className="badge bg-success" style={{ fontSize: 15 }}>{paginatedMovements.reduce((sum, m) => {
                      const qty = Array.isArray(m.details)
                        ? m.details.reduce((s, d) => s + (parseFloat(d.quantity) || 0), 0)
                        : (typeof m.total_quantity !== 'undefined' ? Number(m.total_quantity) : 0);
                      return sum + (isNaN(qty) ? 0 : qty);
                    }, 0)}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* Detalle del movimiento seleccionado */}
      {selectedMovement && (
        <div className="card border-warning mb-4 animate__animated animate__fadeIn">
          <div className="card-header bg-warning text-white fw-bold">Detalle del movimiento #{selectedMovement.id}</div>
          <div className="card-body">
            <div className="row mb-2">
              <div className="col-md-4"><strong>Almacén:</strong> {selectedMovement.warehouse?.name}</div>
              <div className="col-md-4"><strong>Tipo:</strong> {selectedMovement.movement_type}</div>
              <div className="col-md-4"><strong>Usuario:</strong> {selectedMovement.user?.email || '-'}</div>
            </div>
            <div className="row mb-2">
              <div className="col-md-4"><strong>Referencia:</strong> {selectedMovement.reference_document || '-'}</div>
              <div className="col-md-4"><strong>Notas:</strong> {selectedMovement.notes || '-'}</div>
              <div className="col-md-4"><strong>Autorizado:</strong> {selectedMovement.authorized ? 'Sí' : 'No'}</div>
            </div>
            <div className="row mb-2">
              <div className="col-md-4"><strong>Fecha:</strong> {selectedMovement.created_at?.substring(0, 19).replace('T', ' ')}</div>
              <div className="col-md-4"><strong>Autorizado por:</strong> {selectedMovement.authorized_by?.email || '-'}</div>
              <div className="col-md-4"><strong>Fecha autorización:</strong> {selectedMovement.authorized_at ? selectedMovement.authorized_at.substring(0, 19).replace('T', ' ') : '-'}</div>
            </div>
            <hr />
            <h5 className="mb-3">Artículos del movimiento</h5>
            {details.length === 0 ? (
              <div className="text-muted">No hay detalles para este movimiento.</div>
            ) : (
              <table className="table table-sm table-bordered">
                <thead className="table-light">
                  <tr>
                    <th>Producto</th>
                    <th>SKU</th>
                    <th>Cantidad</th>
                    <th>Precio</th>
                    <th>Total</th>
                    <th>Lote</th>
                    <th>Expiración</th>
                  </tr>
                </thead>
                <tbody>
                  {details.map(d => (
                    <tr key={d.id}>
                      <td>{d.product_variant?.name}</td>
                      <td>{d.product_variant?.sku}</td>
                      <td>{d.quantity}</td>
                      <td>{d.price}</td>
                      <td>{d.total}</td>
                      <td>{d.lote || '-'}</td>
                      <td>{d.expiration_date ? d.expiration_date.substring(0, 10) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button className="btn btn-outline-secondary mt-2" onClick={() => setSelectedMovement(null)}>Cerrar detalle</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryMovements;

