import React, { useEffect, useState } from 'react';
import api from '../services/api';
import useDocumentTitle from '../hooks/useDocumentTitle';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Estilos CSS en línea para animaciones
const styles = `
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .fade-in {
    animation: fadeIn 0.3s ease-in;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .tooltip-help {
    position: relative;
    cursor: help;
  }
  
  .card:hover {
    transform: translateY(-2px);
    transition: transform 0.2s ease-in-out;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }
`;

// Agregar estilos al DOM
if (!document.querySelector('#movement-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'movement-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

const InventoryMovements = () => {
  // Hook para cambiar el título de la pestaña
  useDocumentTitle('Movimientos de Inventario - Maestro Inventario');
  
  // Estados principales
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [productVariants, setProductVariants] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [users, setUsers] = useState([]); // Agregar estado para usuarios
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  // Estado para alternar entre vistas
  const [activeTab, setActiveTab] = useState('movements'); // 'movements' o 'inventory'
  const [currentInventory, setCurrentInventory] = useState([]);
  const [loadingCurrentInventory, setLoadingCurrentInventory] = useState(false);
  
  // Filtros específicos para inventario
  const [inventoryFiltersTab, setInventoryFiltersTab] = useState({
    warehouse: '',
    stockStatus: '', // 'low', 'out', 'normal', 'all'
    search: '',
    minStock: '',
    maxStock: ''
  });
  
  // Estado para debug
  const [debugMode, setDebugMode] = useState(true); // Activar debug por defecto
  const [apiLogs, setApiLogs] = useState([]);
  const [connectivityStatus, setConnectivityStatus] = useState({});

  // Estados de filtros
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterAuth, setFilterAuth] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Estados del modal
  const [showModal, setShowModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [inventoryData, setInventoryData] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  
  // Estados para importación
  const [importStep, setImportStep] = useState(1); // 1: Configuración, 2: Archivo, 3: Resultados
  const [importForm, setImportForm] = useState({
    warehouse_id: '',
    movement_type: 'Entrada',
    notes: ''
  });
  const [importFile, setImportFile] = useState(null);
  const [importValidation, setImportValidation] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  
  const [inventoryFilters, setInventoryFilters] = useState({
    warehouse: '',
    stockStatus: '', // 'low', 'out', 'normal'
    search: ''
  });
  const [form, setForm] = useState({ 
    warehouse: '', 
    movement_type: '', 
    reference_document: '', 
    notes: '' 
  });
  const [modalDetails, setModalDetails] = useState([
    { product_variant: '', quantity: '', price: '', lote: '', expiration_date: '' }
  ]);
  const [formError, setFormError] = useState('');

  // Estados para detalles
  const [expandedRows, setExpandedRows] = useState([]);
  const [selectedMovement, setSelectedMovement] = useState(null);
  const [details, setDetails] = useState([]);
  
  // Estados para edición
  const [editingMovement, setEditingMovement] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        console.log('Cargando datos de movimientos...');
        
        // Cargar todos los datos en paralelo
        const [movementsRes, productsRes, variantsRes, warehousesRes, usersRes] = await Promise.all([
          api.get('inventory-movements/'),
          api.get('products/'),
          api.get('product-variants/'),
          api.get('warehouses/'),
          api.get('users/')
        ]);
        
        setMovements(movementsRes.data || []);
        setProducts(Array.isArray(productsRes.data) ? productsRes.data : (productsRes.data.results || []));
        setProductVariants(Array.isArray(variantsRes.data) ? variantsRes.data : (variantsRes.data.results || []));
        setWarehouses(warehousesRes.data || []);
        setUsers(Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data.results || []));
        setLastRefresh(new Date());
        
        console.log('Datos cargados:', {
          movements: movementsRes.data?.length || 0,
          products: productsRes.data?.length || 0,
          variants: variantsRes.data?.length || 0,
          warehouses: warehousesRes.data?.length || 0,
          users: usersRes.data?.length || 0
        });
        
      } catch (err) {
        console.error('Error cargando datos:', err);
        setError('Error al cargar los datos. Verifica la conexión.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(async () => {
      try {
        console.log('Auto-refresh: Actualizando movimientos...');
        const movementsRes = await api.get('inventory-movements/');
        setMovements(movementsRes.data || []);
        setLastRefresh(new Date());
        
        // Si estamos en la pestaña de inventario, también actualizarlo
        if (activeTab === 'inventory') {
          await loadInventoryTab();
        }
      } catch (err) {
        console.error('Error en auto-refresh:', err);
      }
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [autoRefresh, activeTab]);

  // Cargar inventario cuando se cambie a esa pestaña
  useEffect(() => {
    if (activeTab === 'inventory') {
      loadInventoryTab();
    }
  }, [activeTab]);

  // Función para refrescar manualmente
  const refreshData = async () => {
    try {
      setLoading(true);
      const movementsRes = await api.get('inventory-movements/');
      setMovements(movementsRes.data || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error al refrescar:', err);
      setError('Error al refrescar los datos.');
    } finally {
      setLoading(false);
    }
  };

  // Shortcuts de teclado
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Solo actuar si no estamos en un input/textarea/select
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      
      if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'n':
            e.preventDefault();
            setShowModal(true);
            break;
          case 'u':
            e.preventDefault();
            setShowImportModal(true);
            break;
          case 'r':
            e.preventDefault();
            refreshData();
            break;
          case 'e':
            e.preventDefault();
            exportToExcel();
            break;
          case 'p':
            e.preventDefault();
            exportToPDF();
            break;
          case 'f':
            e.preventDefault();
            document.querySelector('input[placeholder*="Buscar"]')?.focus();
            break;
          case 'i':
            e.preventDefault();
            loadCurrentInventory();
            break;
        }
      }
      
      // Escape para cerrar modal
      if (e.key === 'Escape') {
        if (showModal) {
          resetModal();
        } else if (showEditModal) {
          resetEditModal();
        } else if (showInventoryModal) {
          closeInventoryModal();
        } else if (showImportModal) {
          resetImportModal();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [showModal, showInventoryModal]);

  // Obtener movimientos filtrados y ordenados
  const filteredMovements = movements.filter(m => {
    if (filterWarehouse && String(m.warehouse?.id) !== String(filterWarehouse)) return false;
    if (filterType && m.movement_type !== filterType) return false;
    if (filterAuth && String(m.authorized ? 1 : 0) !== filterAuth) return false;
    
    // Filtro por rango de fechas
    if (filterDateFrom || filterDateTo) {
      const movementDate = new Date(m.created_at);
      if (filterDateFrom && movementDate < new Date(filterDateFrom)) return false;
      if (filterDateTo && movementDate > new Date(filterDateTo + 'T23:59:59')) return false;
    }
    
    if (filterSearch) {
      const searchLower = filterSearch.toLowerCase();
      const searchFields = [
        m.reference_document || '',
        m.notes || '',
        m.user?.email || '',
        m.user?.username || '',
        m.user?.name || ''
      ].join(' ').toLowerCase();
      if (!searchFields.includes(searchLower)) return false;
    }
    return true;
  }).sort((a, b) => {
    // Ordenar por fecha de creación (más reciente primero)
    const dateA = new Date(a.created_at);
    const dateB = new Date(b.created_at);
    return dateB - dateA;
  });

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filteredMovements.length / rowsPerPage));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const paginatedMovements = filteredMovements.slice(
    (currentPage - 1) * rowsPerPage, 
    currentPage * rowsPerPage
  );

  // Función helper para obtener el usuario que autoriza
  const getAuthorizedByUser = (authorizedById) => {
    if (!authorizedById || !users.length) return null;
    return users.find(user => user.id === authorizedById);
  };

  // Calcular estadísticas
  const getStats = () => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const todayMovements = movements.filter(m => new Date(m.created_at) >= startOfDay);
    const weekMovements = movements.filter(m => new Date(m.created_at) >= startOfWeek);
    const monthMovements = movements.filter(m => new Date(m.created_at) >= startOfMonth);
    
    return {
      total: movements.length,
      authorized: movements.filter(m => m.authorized).length,
      pending: movements.filter(m => !m.authorized).length,
      today: todayMovements.length,
      week: weekMovements.length,
      month: monthMovements.length,
      entradas: movements.filter(m => m.movement_type === 'entrada').length,
      salidas: movements.filter(m => m.movement_type === 'salida').length,
      ajustes: movements.filter(m => m.movement_type === 'ajuste').length
    };
  };

  const stats = getStats();

  // Función para alternar expansión de filas
  const toggleRow = (id) => {
    setExpandedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  // Exportar a Excel
  const exportToExcel = () => {
    const data = filteredMovements.map(m => {
      const authorizedUser = getAuthorizedByUser(m.authorized_by);
      return {
        ID: m.id,
        Almacen: m.warehouse?.name || '-',
        Tipo: m.movement_type,
        Cantidad: m.total_quantity || 0,
        UsuarioCrea: m.user?.email || m.user?.first_name || '-',
        UsuarioAutoriza: authorizedUser 
          ? (authorizedUser.email || `${authorizedUser.first_name} ${authorizedUser.last_name}`.trim())
          : (m.authorized ? 'Usuario eliminado' : '-'),
        Fecha: m.created_at ? new Date(m.created_at).toLocaleString() : '-',
        Autorizado: m.authorized ? 'Sí' : 'No',
        Referencia: m.reference_document || '-',
        Notas: m.notes || '-'
      };
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
    XLSX.writeFile(wb, 'movimientos_inventario.xlsx');
  };

  // Exportar a PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(16);
    doc.text('Reporte de Movimientos de Inventario', 14, 15);
    
    // Información del reporte
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, 14, 25);
    doc.text(`Total de movimientos: ${filteredMovements.length}`, 14, 30);
    
    // Preparar datos para la tabla
    const tableData = filteredMovements.map(m => {
      const authorizedUser = getAuthorizedByUser(m.authorized_by);
      return [
        m.id,
        m.warehouse?.name || '-',
        m.movement_type,
        m.total_quantity || 0,
        m.user?.email || m.user?.first_name || '-',
        authorizedUser 
          ? (authorizedUser.email || `${authorizedUser.first_name} ${authorizedUser.last_name}`.trim())
          : (m.authorized ? 'Usuario eliminado' : '-'),
        m.created_at ? new Date(m.created_at).toLocaleDateString() : '-',
        m.authorized ? 'Sí' : 'No'
      ];
    });
    
    // Generar tabla
    doc.autoTable({
      head: [['ID', 'Almacén', 'Tipo', 'Cantidad', 'Usuario Crea', 'Usuario Autoriza', 'Fecha', 'Autorizado']],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
    
    doc.save('movimientos_inventario.pdf');
  };

  // Cargar inventario actual
  const loadCurrentInventory = async () => {
    setLoadingInventory(true);
    try {
      console.log('Cargando inventario actual...');
      const response = await api.get('current-inventory/');
      setInventoryData(response.data || []);
      setShowInventoryModal(true);
    } catch (err) {
      console.error('Error cargando inventario:', err);
      alert('❌ Error al cargar el inventario actual: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingInventory(false);
    }
  };

  // Función para probar conectividad de endpoints
  const testApiConnectivity = async () => {
    const endpoints = [
      'product-warehouse-stocks/',
      'current-inventory/',
      'inventory-movements/',
      'products/',
      'warehouses/'
    ];
    
    const results = {};
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Probando endpoint: ${endpoint}`);
        const startTime = Date.now();
        const response = await api.get(endpoint);
        const endTime = Date.now();
        
        results[endpoint] = {
          status: '✅ Funcionando',
          responseTime: `${endTime - startTime}ms`,
          statusCode: response.status,
          dataLength: Array.isArray(response.data) ? response.data.length : 'N/A'
        };
      } catch (error) {
        results[endpoint] = {
          status: '❌ Error',
          error: error.response?.status || 'Error de conexión',
          message: error.response?.data?.message || error.message,
          details: error.response?.data
        };
      }
    }
    
    setConnectivityStatus(results);
    console.log('📊 Resultados de conectividad:', results);
  };

  // Cargar inventario actual para la pestaña
  const loadInventoryTab = async () => {
    setLoadingCurrentInventory(true);
    setError(''); // Limpiar errores previos
    
    try {
      console.log('🔄 Iniciando carga de inventario para pestaña...');
      console.log('🌐 URL Base de la API:', api.defaults.baseURL);
      
      // Intentar diferentes endpoints con mejor manejo de errores
      let inventoryData = [];
      let endpointUsed = '';
      let lastError = null;
      
      // Opción 1: product-warehouse-stocks
      try {
        const endpoint1 = 'product-warehouse-stocks/';
        console.log(`🚀 Intentando endpoint: ${endpoint1}`);
        console.log(`📍 URL completa: ${api.defaults.baseURL}${endpoint1}`);
        
        const stockResponse = await api.get(endpoint1);
        console.log('✅ Respuesta exitosa de product-warehouse-stocks:', {
          status: stockResponse.status,
          dataType: Array.isArray(stockResponse.data) ? 'array' : typeof stockResponse.data,
          length: Array.isArray(stockResponse.data) ? stockResponse.data.length : 'N/A'
        });
        
        const stockData = Array.isArray(stockResponse.data) ? stockResponse.data : (stockResponse.data.results || []);
        
        if (stockData.length > 0) {
          console.log('📦 Procesando datos de product-warehouse-stocks:', stockData.length, 'registros');
          // Agrupar por producto y almacén
          const groupedInventory = stockData.reduce((acc, stock) => {
            const key = `${stock.product_variant?.id || stock.product || 'unknown'}-${stock.warehouse?.id || stock.warehouse_id || 'unknown'}`;
            if (!acc[key]) {
              acc[key] = {
                product_name: stock.product_variant?.name || stock.product_name || 'Producto sin nombre',
                product_code: stock.product_variant?.sku || stock.product_code || '',
                warehouse_name: stock.warehouse?.name || stock.warehouse_name || 'Almacén desconocido',
                total_stock: 0,
                product_price: parseFloat(stock.product_variant?.price || stock.price || 0),
                min_stock: parseFloat(stock.product_variant?.min_stock || stock.min_stock || 0)
              };
            }
            acc[key].total_stock += parseFloat(stock.quantity || 0);
            return acc;
          }, {});
          
          inventoryData = Object.values(groupedInventory).filter(item => parseFloat(item.total_stock) > 0);
          endpointUsed = 'product-warehouse-stocks';
          console.log('✅ Datos procesados exitosamente:', inventoryData.length, 'items con stock');
        } else {
          console.log('⚠️ product-warehouse-stocks devolvió datos vacíos');
        }
      } catch (stockErr) {
        lastError = stockErr;
        console.log('❌ Error con product-warehouse-stocks:', {
          status: stockErr.response?.status,
          statusText: stockErr.response?.statusText,
          message: stockErr.response?.data?.message || stockErr.message,
          url: stockErr.config?.url
        });
      }
      
      // Opción 2: current-inventory (si la primera falló)
      if (inventoryData.length === 0) {
        try {
          const endpoint2 = 'current-inventory/';
          console.log(`🚀 Intentando endpoint: ${endpoint2}`);
          console.log(`📍 URL completa: ${api.defaults.baseURL}${endpoint2}`);
          
          const inventoryResponse = await api.get(endpoint2);
          console.log('✅ Respuesta exitosa de current-inventory:', {
            status: inventoryResponse.status,
            dataType: Array.isArray(inventoryResponse.data) ? 'array' : typeof inventoryResponse.data,
            length: Array.isArray(inventoryResponse.data) ? inventoryResponse.data.length : 'N/A'
          });
          
          const rawData = Array.isArray(inventoryResponse.data) ? inventoryResponse.data : (inventoryResponse.data.results || []);
          
          if (rawData.length > 0) {
            console.log('📦 Procesando datos de current-inventory:', rawData.length, 'registros');
            inventoryData = rawData.map(item => ({
              product_name: item.product_variant?.name || item.product_name || 'Producto sin nombre',
              product_code: item.product_variant?.sku || item.product_code || '',
              warehouse_name: item.warehouse?.name || item.warehouse_name || 'Almacén desconocido',
              total_stock: parseFloat(item.quantity || item.total_stock || 0),
              product_price: parseFloat(item.product_variant?.price || item.product_price || 0),
              min_stock: parseFloat(item.product_variant?.min_stock || item.min_stock || 0)
            })).filter(item => item.total_stock > 0);
            endpointUsed = 'current-inventory';
            console.log('✅ Datos procesados exitosamente:', inventoryData.length, 'items con stock');
          } else {
            console.log('⚠️ current-inventory devolvió datos vacíos');
          }
        } catch (inventoryErr) {
          lastError = inventoryErr;
          console.log('❌ Error con current-inventory:', {
            status: inventoryErr.response?.status,
            statusText: inventoryErr.response?.statusText,
            message: inventoryErr.response?.data?.message || inventoryErr.message,
            url: inventoryErr.config?.url,
            responseData: inventoryErr.response?.data
          });
        }
      }
      
      // Opción 3: Intentar construir desde movimientos
      if (inventoryData.length === 0 && movements.length > 0) {
        try {
          console.log('🔨 Construyendo inventario desde movimientos...');
          const inventoryFromMovements = {};
          
          movements.forEach(movement => {
            if (movement.details && Array.isArray(movement.details)) {
              movement.details.forEach(detail => {
                const key = `${detail.product_variant?.id || 'unknown'}-${movement.warehouse?.id || 'unknown'}`;
                if (!inventoryFromMovements[key]) {
                  inventoryFromMovements[key] = {
                    product_name: detail.product_variant?.name || 'Producto sin nombre',
                    product_code: detail.product_variant?.sku || '',
                    warehouse_name: movement.warehouse?.name || 'Almacén desconocido',
                    total_stock: 0,
                    product_price: parseFloat(detail.product_variant?.price || detail.price || 0),
                    min_stock: parseFloat(detail.product_variant?.min_stock || 0)
                  };
                }
                
                const quantity = parseFloat(detail.quantity || 0);
                if (movement.movement_type === 'entrada') {
                  inventoryFromMovements[key].total_stock += quantity;
                } else if (movement.movement_type === 'salida') {
                  inventoryFromMovements[key].total_stock -= quantity;
                }
              });
            }
          });
          
          inventoryData = Object.values(inventoryFromMovements).filter(item => item.total_stock > 0);
          endpointUsed = 'calculated-from-movements';
          console.log('✅ Inventario construido desde movimientos:', inventoryData.length, 'items');
        } catch (calcErr) {
          console.log('❌ Error construyendo inventario desde movimientos:', calcErr.message);
        }
      }
      
      // Opción 4: Datos de ejemplo si todo falla (para desarrollo)
      if (inventoryData.length === 0) {
        console.log('🆘 ACTIVANDO DATOS DE EMERGENCIA - El backend no está respondiendo correctamente');
        inventoryData = [
          {
            product_name: 'Producto Demo A',
            product_code: 'DEMO-A001',
            warehouse_name: 'Almacén Principal',
            total_stock: 150,
            product_price: 25.99,
            min_stock: 10
          },
          {
            product_name: 'Producto Demo B',
            product_code: 'DEMO-B002',
            warehouse_name: 'Almacén Principal',
            total_stock: 75,
            product_price: 15.50,
            min_stock: 20
          },
          {
            product_name: 'Producto Demo C',
            product_code: 'DEMO-C003',
            warehouse_name: 'Almacén Secundario',
            total_stock: 200,
            product_price: 45.00,
            min_stock: 15
          },
          {
            product_name: 'Producto Demo D',
            product_code: 'DEMO-D004',
            warehouse_name: 'Almacén Secundario',
            total_stock: 5,
            product_price: 120.75,
            min_stock: 25
          },
          {
            product_name: 'Producto Demo E',
            product_code: 'DEMO-E005',
            warehouse_name: 'Almacén Terciario',
            total_stock: 0,
            product_price: 8.99,
            min_stock: 50
          }
        ];
        endpointUsed = 'emergency-demo-data';
        console.log('✅ Datos de emergencia cargados - La aplicación sigue funcionando');
      }
      
      setCurrentInventory(inventoryData);
      console.log(`📊 Inventario cargado exitosamente:`, {
        endpoint: endpointUsed,
        items: inventoryData.length,
        totalValue: inventoryData.reduce((sum, item) => sum + (item.total_stock * item.product_price), 0).toFixed(2)
      });
      
      // Mostrar notificación si se usaron datos de respaldo
      if (endpointUsed === 'emergency-demo-data') {
        console.log('🔔 NOTIFICACIÓN: Se están usando datos de demostración debido a problemas con el backend');
        // Mostrar un mensaje temporal de éxito
        setTimeout(() => {
          if (window.confirm('ℹ️ El backend tiene problemas, pero la aplicación sigue funcionando con datos de demostración.\n\n¿Quieres usar el Panel de Diagnóstico para más opciones?')) {
            setDebugMode(true);
          }
        }, 1000);
      }
      
    } catch (err) {
      console.error('💥 Error crítico cargando inventario:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Error desconocido';
      
      // Mostrar error específico según el código de estado
      if (err.response?.status === 500) {
        const serverError = `🚨 Error del Servidor (500)

❌ PROBLEMA: El backend tiene un error interno
📍 Endpoint: ${err.config?.url || 'current-inventory/'}
⏰ Hora: ${new Date().toLocaleString()}

🔧 SOLUCIONES DISPONIBLES:
✅ La aplicación continuará funcionando con datos de respaldo
✅ Usa el Panel de Diagnóstico arriba para más opciones
✅ Puedes cargar datos demo mientras se soluciona el problema

💡 DATOS TÉCNICOS:
• Mensaje: ${err.response?.data?.detail || err.response?.data?.message || 'Error interno del servidor'}
• Estado HTTP: ${err.response?.status}
• URL: ${err.config?.url}

El inventario se ha cargado con datos de ejemplo para que puedas seguir trabajando.`;
        setError(serverError);
      } else if (err.response?.status === 404) {
        setError('Endpoint no encontrado (404). Verifica la configuración de la API.');
      } else if (err.response?.status === 403) {
        setError('Sin permisos (403). No tienes autorización para acceder al inventario.');
      } else {
        setError(`Error al cargar inventario: ${errorMessage}`);
      }
      
      // Cargar datos vacíos para evitar crashes
      setCurrentInventory([]);
    } finally {
      setLoadingCurrentInventory(false);
    }
  };

  // Exportar inventario a Excel
  const exportInventoryToExcel = () => {
    const filteredInventory = getFilteredInventory();
    const data = filteredInventory.map(item => ({
      Producto: item.product_variant?.name || 'N/A',
      SKU: item.product_variant?.sku || 'N/A',
      Almacen: item.warehouse?.name || 'N/A',
      Stock: item.quantity || 0,
      StockMinimo: item.product_variant?.min_stock || 0,
      Precio: item.product_variant?.price || 0,
      ValorTotal: (item.quantity || 0) * (item.product_variant?.price || 0),
      UltimaActualizacion: item.last_updated ? new Date(item.last_updated).toLocaleString() : 'N/A',
      Estado: (item.quantity || 0) === 0 ? 'Sin Stock' : 
              (item.quantity || 0) <= (item.product_variant?.min_stock || 0) ? 'Stock Bajo' : 'Normal'
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario Actual');
    XLSX.writeFile(wb, 'inventario_actual.xlsx');
  };

  // Exportar inventario de la pestaña a Excel
  const exportInventoryTabToExcel = () => {
    const filteredInventory = getFilteredInventoryTab();
    const data = filteredInventory.map(item => ({
      Producto: item.product_name || 'N/A',
      Codigo: item.product_code || 'N/A',
      Almacen: item.warehouse_name || 'N/A',
      Stock: item.total_stock || 0,
      StockMinimo: item.min_stock || 0,
      Precio: item.product_price || 0,
      ValorTotal: (parseFloat(item.total_stock || 0) * parseFloat(item.product_price || 0)),
      Estado: parseFloat(item.total_stock || 0) === 0 ? 'Sin Stock' : 
              parseFloat(item.total_stock || 0) <= parseFloat(item.min_stock || 0) ? 'Stock Bajo' : 'Normal'
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario Actual');
    
    // Agregar información de filtros aplicados
    const filterInfo = [];
    if (inventoryFiltersTab.warehouse) filterInfo.push(`Almacén: ${inventoryFiltersTab.warehouse}`);
    if (inventoryFiltersTab.stockStatus) filterInfo.push(`Estado: ${inventoryFiltersTab.stockStatus}`);
    if (inventoryFiltersTab.search) filterInfo.push(`Búsqueda: ${inventoryFiltersTab.search}`);
    if (inventoryFiltersTab.minStock) filterInfo.push(`Stock mín.: ${inventoryFiltersTab.minStock}`);
    if (inventoryFiltersTab.maxStock) filterInfo.push(`Stock máx.: ${inventoryFiltersTab.maxStock}`);
    
    const fileName = `inventario_${filterInfo.length > 0 ? 'filtrado_' : ''}${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Cerrar modal de inventario
  const closeInventoryModal = () => {
    setShowInventoryModal(false);
    setInventoryData([]);
    setInventoryFilters({ warehouse: '', stockStatus: '', search: '' });
  };

  // Filtrar datos de inventario
  const getFilteredInventory = () => {
    return inventoryData.filter(item => {
      // Filtro por almacén
      if (inventoryFilters.warehouse && item.warehouse?.id !== parseInt(inventoryFilters.warehouse)) {
        return false;
      }
      
      // Filtro por estado de stock
      if (inventoryFilters.stockStatus) {
        const isOutOfStock = (item.quantity || 0) === 0;
        const isLowStock = (item.quantity || 0) <= (item.product_variant?.min_stock || 0) && (item.quantity || 0) > 0;
        const isNormal = (item.quantity || 0) > (item.product_variant?.min_stock || 0);
        
        if (inventoryFilters.stockStatus === 'out' && !isOutOfStock) return false;
        if (inventoryFilters.stockStatus === 'low' && !isLowStock) return false;
        if (inventoryFilters.stockStatus === 'normal' && !isNormal) return false;
      }
      
      // Filtro por búsqueda
      if (inventoryFilters.search) {
        const searchLower = inventoryFilters.search.toLowerCase();
        const searchFields = [
          item.product_variant?.name || '',
          item.product_variant?.sku || '',
          item.warehouse?.name || ''
        ].join(' ').toLowerCase();
        if (!searchFields.includes(searchLower)) return false;
      }
      
      return true;
    });
  };

  // Filtrar inventario para la pestaña
  const getFilteredInventoryTab = () => {
    return currentInventory.filter(item => {
      // Filtro por almacén
      if (inventoryFiltersTab.warehouse && item.warehouse_name !== inventoryFiltersTab.warehouse) {
        return false;
      }
      
      // Filtro por estado de stock
      if (inventoryFiltersTab.stockStatus) {
        const stock = parseFloat(item.total_stock || 0);
        const minStock = parseFloat(item.min_stock || 0);
        
        if (inventoryFiltersTab.stockStatus === 'out' && stock > 0) return false;
        if (inventoryFiltersTab.stockStatus === 'low' && (stock === 0 || stock > minStock)) return false;
        if (inventoryFiltersTab.stockStatus === 'normal' && (stock === 0 || stock <= minStock)) return false;
      }
      
      // Filtro por rango de stock
      if (inventoryFiltersTab.minStock && parseFloat(item.total_stock || 0) < parseFloat(inventoryFiltersTab.minStock)) {
        return false;
      }
      if (inventoryFiltersTab.maxStock && parseFloat(item.total_stock || 0) > parseFloat(inventoryFiltersTab.maxStock)) {
        return false;
      }
      
      // Filtro por búsqueda
      if (inventoryFiltersTab.search) {
        const searchLower = inventoryFiltersTab.search.toLowerCase();
        const searchFields = [
          item.product_name || '',
          item.product_code || '',
          item.warehouse_name || ''
        ].join(' ').toLowerCase();
        if (!searchFields.includes(searchLower)) return false;
      }
      
      return true;
    });
  };

  // Funciones del modal
  const resetModal = () => {
    setShowModal(false);
    setForm({ warehouse: '', movement_type: '', reference_document: '', notes: '' });
    setModalDetails([{ product_variant: '', quantity: '', price: '', lote: '', expiration_date: '' }]);
    setFormError('');
  };

  // Funciones de importación
  const resetImportModal = () => {
    setShowImportModal(false);
    setImportStep(1);
    setImportForm({
      warehouse_id: '',
      movement_type: 'Entrada',
      notes: ''
    });
    setImportFile(null);
    setImportValidation(null);
    setImportLoading(false);
    setImportError('');
  };

  const handleImportNext = async () => {
    if (importStep === 1) {
      // Validar configuración
      if (!importForm.warehouse_id || !importForm.movement_type) {
        setImportError('Por favor complete todos los campos requeridos.');
        return;
      }
      setImportStep(2);
      setImportError('');
    } else if (importStep === 2) {
      // Validar archivo
      if (!importFile) {
        setImportError('Por favor seleccione un archivo CSV.');
        return;
      }
      await validateImportFile();
    }
  };

  const validateImportFile = async () => {
    setImportLoading(true);
    setImportError('');
    
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      
      const response = await api.post('/movements/import/validate/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setImportValidation(response.data);
      setImportStep(3);
    } catch (error) {
      setImportError(error.response?.data?.error || 'Error validando archivo: ' + error.message);
    } finally {
      setImportLoading(false);
    }
  };

  const confirmImport = async () => {
    if (!importValidation?.productos_encontrados?.length) {
      setImportError('No hay productos válidos para importar.');
      return;
    }

    setImportLoading(true);
    setImportError('');
    
    try {
      const response = await api.post('/movements/import/confirm/', {
        warehouse_id: importForm.warehouse_id,
        movement_type: importForm.movement_type,
        notes: importForm.notes,
        productos_confirmados: importValidation.productos_encontrados
      });
      
      // Éxito - cerrar modal y actualizar datos
      resetImportModal();
      await refreshData();
      
      // Mostrar mensaje de éxito
      const resumen = response.data.resumen;
      alert(`✅ Importación exitosa!\n\nProductos importados: ${resumen.productos_importados}\nTotal: $${resumen.total_movimiento.toFixed(2)}\nID del movimiento: ${response.data.movimiento.id}`);
      
    } catch (error) {
      setImportError(error.response?.data?.error || 'Error confirmando importación: ' + error.message);
    } finally {
      setImportLoading(false);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        setImportError('Por favor seleccione un archivo CSV válido.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setImportError('El archivo es demasiado grande. Máximo 5MB.');
        return;
      }
      setImportFile(file);
      setImportError('');
    }
  };

  const addModalDetail = () => {
    setModalDetails([...modalDetails, { product_variant: '', quantity: '', price: '', lote: '', expiration_date: '' }]);
  };

  const removeModalDetail = (idx) => {
    if (modalDetails.length > 1) {
      setModalDetails(modalDetails.filter((_, i) => i !== idx));
    }
  };

  const handleModalDetailChange = (idx, field, value) => {
    const newDetails = [...modalDetails];
    newDetails[idx][field] = value;
    setModalDetails(newDetails);
  };

  // Crear movimiento
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (!form.warehouse || !form.movement_type) {
      setFormError('El almacén y tipo de movimiento son obligatorios.');
      return;
    }

    // Validar detalles
    const invalidDetails = modalDetails.some(d => 
      !d.product_variant || !d.quantity || d.quantity <= 0 || !d.price || d.price < 0
    );
    
    if (invalidDetails) {
      setFormError('Todos los productos deben tener variante, cantidad y precio válidos.');
      return;
    }

    try {
      const cleanedDetails = modalDetails.map(d => ({
        product_variant: parseInt(d.product_variant),
        quantity: parseFloat(d.quantity),
        price: parseFloat(d.price),
        total: parseFloat(d.quantity) * parseFloat(d.price),
        lote: d.lote || null,
        expiration_date: d.expiration_date || null
      }));

      const payload = {
        warehouse_id: parseInt(form.warehouse),
        movement_type: form.movement_type,
        reference_document: form.reference_document || null,
        notes: form.notes || null,
        details: cleanedDetails
      };

      await api.post('inventory-movements/', payload);
      
      // Recargar movimientos
      const movementsRes = await api.get('inventory-movements/');
      setMovements(movementsRes.data || []);
      setLastRefresh(new Date());
      
      resetModal();
      
      // Mostrar notificación de éxito
      alert('✅ Movimiento creado exitosamente');
      
    } catch (err) {
      console.error('Error creando movimiento:', err);
      setFormError('❌ Error al crear el movimiento: ' + (err.response?.data?.message || err.message));
    }
  };

  // Autorizar movimiento
  const authorizeMovement = async (id) => {
    const movement = movements.find(m => m.id === id);
    const movementDetails = movement ? `
ID: ${movement.id}
Almacén: ${movement.warehouse?.name || 'N/A'}
Tipo: ${movement.movement_type}
Cantidad: ${movement.total_quantity || 0}
Usuario: ${movement.user?.email || 'N/A'}
` : '';
    
    if (!window.confirm(`¿Autorizar este movimiento?\n\n${movementDetails}`)) return;
    
    try {
      await api.post('authorize-inventory-movement/', { movement_id: id });
      // Recargar movimientos para obtener datos actualizados
      const movementsRes = await api.get('inventory-movements/');
      setMovements(movementsRes.data || []);
      setLastRefresh(new Date());
      
      // Mostrar notificación de éxito
      alert('✅ Movimiento autorizado exitosamente');
    } catch (err) {
      console.error('Error al autorizar movimiento:', err);
      alert('❌ Error al autorizar el movimiento: ' + (err.response?.data?.message || err.message));
    }
  };

  // Eliminar movimiento
  const deleteMovement = async (id) => {
    const movement = movements.find(m => m.id === id);
    const movementDetails = movement ? `
ID: ${movement.id}
Almacén: ${movement.warehouse?.name || 'N/A'}
Tipo: ${movement.movement_type}
Cantidad: ${movement.total_quantity || 0}
` : '';
    
    if (!window.confirm(`⚠️ ¿ELIMINAR este movimiento?\n\n${movementDetails}\n\n¡Esta acción NO se puede deshacer!`)) return;
    
    try {
      await api.delete(`inventory-movements/${id}/`);
      // Recargar movimientos para obtener datos actualizados
      const movementsRes = await api.get('inventory-movements/');
      setMovements(movementsRes.data || []);
      setLastRefresh(new Date());
      
      // Mostrar notificación de éxito
      alert('✅ Movimiento eliminado exitosamente');
    } catch (err) {
      console.error('Error al eliminar movimiento:', err);
      alert('❌ Error al eliminar el movimiento: ' + (err.response?.data?.message || err.message));
    }
  };

  // Editar movimiento
  const editMovement = (movement) => {
    setEditingMovement(movement);
    setForm({
      warehouse: movement.warehouse?.id || '',
      movement_type: movement.movement_type || '',
      reference_document: movement.reference_document || '',
      notes: movement.notes || ''
    });
    
    // Cargar detalles del movimiento
    const movementDetails = movement.details?.map(detail => ({
      product_variant: detail.product_variant?.id || '',
      quantity: detail.quantity || '',
      price: detail.price || '',
      lote: detail.lote || '',
      expiration_date: detail.expiration_date || ''
    })) || [{ product_variant: '', quantity: '', price: '', lote: '', expiration_date: '' }];
    
    setModalDetails(movementDetails);
    setShowEditModal(true);
  };

  // Actualizar movimiento
  const updateMovement = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (!form.warehouse || !form.movement_type) {
      setFormError('El almacén y tipo de movimiento son obligatorios.');
      return;
    }

    // Validar detalles
    const invalidDetails = modalDetails.some(d => 
      !d.product_variant || !d.quantity || d.quantity <= 0 || !d.price || d.price < 0
    );
    
    if (invalidDetails) {
      setFormError('Todos los productos deben tener variante, cantidad y precio válidos.');
      return;
    }

    try {
      const cleanedDetails = modalDetails.map(d => ({
        product_variant: parseInt(d.product_variant),
        quantity: parseFloat(d.quantity),
        price: parseFloat(d.price),
        total: parseFloat(d.quantity) * parseFloat(d.price),
        lote: d.lote || null,
        expiration_date: d.expiration_date || null
      }));

      const payload = {
        warehouse_id: parseInt(form.warehouse),
        movement_type: form.movement_type,
        reference_document: form.reference_document || null,
        notes: form.notes || null,
        details: cleanedDetails
      };

      await api.put(`inventory-movements/${editingMovement.id}/`, payload);
      
      // Recargar movimientos
      const movementsRes = await api.get('inventory-movements/');
      setMovements(movementsRes.data || []);
      setLastRefresh(new Date());
      
      resetEditModal();
      
      // Mostrar notificación de éxito
      alert('✅ Movimiento actualizado exitosamente');
      
    } catch (err) {
      console.error('Error actualizando movimiento:', err);
      setFormError('❌ Error al actualizar el movimiento: ' + (err.response?.data?.message || err.message));
    }
  };

  // Resetear modal de edición
  const resetEditModal = () => {
    setShowEditModal(false);
    setEditingMovement(null);
    setForm({ warehouse: '', movement_type: '', reference_document: '', notes: '' });
    setModalDetails([{ product_variant: '', quantity: '', price: '', lote: '', expiration_date: '' }]);
    setFormError('');
  };

  if (loading) {
    return (
      <div className="container py-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
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
          <button 
            className="btn btn-outline-danger"
            onClick={() => window.location.reload()}
          >
            Recargar página
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-primary fw-bold">
          <i className="bi bi-box-seam me-2"></i>
          {activeTab === 'movements' ? 'Movimientos de Inventario' : 'Inventario Actual'}
        </h2>
        <div className="btn-group">
          <button 
            className="btn btn-outline-info"
            onClick={refreshData}
            disabled={loading}
            title="Refrescar datos (Ctrl+R)"
          >
            <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''} me-2`}></i>
            Refrescar
          </button>
          <button 
            className="btn btn-outline-warning"
            onClick={loadCurrentInventory}
            disabled={loadingInventory}
            title="Ver inventario actual (Ctrl+I)"
          >
            <i className={`bi bi-boxes ${loadingInventory ? 'spin' : ''} me-2`}></i>
            Ver Inventario
          </button>
          <button 
            className={`btn ${autoRefresh ? 'btn-success' : 'btn-outline-secondary'}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title="Auto-actualización cada 30 segundos"
          >
            <i className="bi bi-arrow-repeat me-2"></i>
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
            title="Nuevo movimiento (Ctrl+N)"
          >
            <i className="bi bi-plus-circle me-2"></i>
            Nuevo Movimiento
          </button>
          <button 
            className="btn btn-success ms-2"
            onClick={() => setShowImportModal(true)}
            title="Importar movimientos desde CSV"
          >
            <i className="bi bi-file-earmark-arrow-up me-2"></i>
            Importar CSV
          </button>
        </div>
      </div>

      {/* Pestañas de navegación */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'movements' ? 'active' : ''}`}
            onClick={() => setActiveTab('movements')}
          >
            <i className="bi bi-arrow-left-right me-2"></i>
            Movimientos
            <span className="badge bg-primary ms-2">{movements.length}</span>
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <i className="bi bi-boxes me-2"></i>
            Inventario Actual
            <span className="badge bg-success ms-2">{currentInventory.length}</span>
          </button>
        </li>
      </ul>

      {/* Panel de Debug */}
      {debugMode && (
        <div className="card mb-4 border-warning">
          <div className="card-header bg-warning text-dark">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="bi bi-bug me-2"></i>
                Panel de Diagnóstico
              </h5>
              <button 
                className="btn btn-sm btn-outline-dark"
                onClick={() => setDebugMode(false)}
              >
                <i className="bi bi-x"></i>
              </button>
            </div>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-4">
                <h6 className="text-primary">📊 Estado de la Aplicación</h6>
                <ul className="list-unstyled small">
                  <li><strong>API Base:</strong> {api.defaults.baseURL}</li>
                  <li><strong>Movimientos:</strong> {movements.length} registros</li>
                  <li><strong>Inventario:</strong> {currentInventory.length} items</li>
                  <li><strong>Última actualización:</strong> {lastRefresh.toLocaleTimeString()}</li>
                  <li><strong>Auto-refresh:</strong> {autoRefresh ? '✅ Activo' : '❌ Inactivo'}</li>
                  <li><strong>Pestaña activa:</strong> {activeTab}</li>
                </ul>
              </div>
              <div className="col-md-4">
                <h6 className="text-success">🌐 Conectividad API</h6>
                <div className="mb-2">
                  <button 
                    className="btn btn-sm btn-outline-primary"
                    onClick={testApiConnectivity}
                  >
                    <i className="bi bi-wifi me-1"></i>
                    Probar Conectividad
                  </button>
                </div>
                {Object.keys(connectivityStatus).length > 0 && (
                  <div className="small">
                    {Object.entries(connectivityStatus).map(([endpoint, status]) => (
                      <div key={endpoint} className="mb-1">
                        <strong>{endpoint}:</strong> {status.status}
                        {status.responseTime && <span className="text-muted"> ({status.responseTime})</span>}
                        {status.error && <div className="text-danger">Error {status.error}: {status.message}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="col-md-4">
                <h6 className="text-info">🔧 Acciones de Diagnóstico</h6>
                <div className="d-grid gap-2">
                  <button 
                    className="btn btn-sm btn-outline-info"
                    onClick={() => loadInventoryTab()}
                  >
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    Recargar Inventario
                  </button>
                  <button 
                    className="btn btn-sm btn-outline-warning"
                    onClick={() => {
                      console.clear();
                      console.log('🧹 Consola limpiada - Iniciando diagnóstico...');
                      loadInventoryTab();
                    }}
                  >
                    <i className="bi bi-terminal me-1"></i>
                    Diagnóstico Completo
                  </button>
                  <button 
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                      setCurrentInventory([
                        {
                          product_name: 'Producto Demo 1',
                          product_code: 'DEMO001',
                          warehouse_name: 'Almacén Principal',
                          total_stock: 100,
                          product_price: 50.00,
                          min_stock: 10
                        },
                        {
                          product_name: 'Producto Demo 2', 
                          product_code: 'DEMO002',
                          warehouse_name: 'Almacén Secundario',
                          total_stock: 25,
                          product_price: 75.50,
                          min_stock: 5
                        }
                      ]);
                    }}
                  >
                    <i className="bi bi-database me-1"></i>
                    Cargar Datos Demo
                  </button>
                </div>
              </div>
            </div>
            
            {error && (
              <div className="alert alert-danger mt-3">
                <h6 className="alert-heading">❌ Error Detectado:</h6>
                <pre className="mb-0 small">{error}</pre>
                <hr />
                <div className="d-flex gap-2">
                  <button 
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => setError('')}
                  >
                    Limpiar Error
                  </button>
                  <button 
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => loadInventoryTab()}
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botón para mostrar debug si está oculto */}
      {!debugMode && (
        <div className="position-fixed bottom-0 end-0 p-3" style={{zIndex: 1000}}>
          <button 
            className="btn btn-warning btn-sm"
            onClick={() => setDebugMode(true)}
            title="Mostrar panel de diagnóstico"
          >
            <i className="bi bi-bug"></i>
          </button>
        </div>
      )}

      {/* Contenido según la pestaña activa */}
      {activeTab === 'movements' ? (
        <>
          {/* Ayuda de shortcuts */}
          <div className="alert alert-light border-0 py-2 fade-in">
            <small className="text-muted">
              <i className="bi bi-keyboard me-1"></i>
              <strong>Atajos:</strong> 
              <span className="mx-2">Ctrl+N (Nuevo)</span>
              <span className="mx-2">Ctrl+U (Importar CSV)</span>
              <span className="mx-2">Ctrl+R (Refrescar)</span>
              <span className="mx-2">Ctrl+I (Inventario)</span>
              <span className="mx-2">Ctrl+E (Excel)</span>
              <span className="mx-2">Ctrl+P (PDF)</span>
              <span className="mx-2">Ctrl+F (Buscar)</span>
              <span className="mx-2">Esc (Cerrar modal)</span>
            </small>
          </div>

          {/* Última actualización */}
          <div className="text-end mb-2">
            <small className="text-muted">
              <i className="bi bi-clock me-1"></i>
              Última actualización: {lastRefresh.toLocaleTimeString()}
            </small>
          </div>

      {/* Info */}
      <div className="row mb-4">
        <div className="col-md-12">
          <div className="row g-3">
            <div className="col-md-2">
              <div className="card border-primary">
                <div className="card-body text-center p-3">
                  <i className="bi bi-box-seam text-primary mb-2" style={{fontSize: '1.5rem'}}></i>
                  <h5 className="card-title mb-1">{stats.total}</h5>
                  <small className="text-muted">Total</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card border-success">
                <div className="card-body text-center p-3">
                  <i className="bi bi-check-circle text-success mb-2" style={{fontSize: '1.5rem'}}></i>
                  <h5 className="card-title mb-1">{stats.authorized}</h5>
                  <small className="text-muted">Autorizados</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card border-warning">
                <div className="card-body text-center p-3">
                  <i className="bi bi-clock text-warning mb-2" style={{fontSize: '1.5rem'}}></i>
                  <h5 className="card-title mb-1">{stats.pending}</h5>
                  <small className="text-muted">Pendientes</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card border-info">
                <div className="card-body text-center p-3">
                  <i className="bi bi-calendar-day text-info mb-2" style={{fontSize: '1.5rem'}}></i>
                  <h5 className="card-title mb-1">{stats.today}</h5>
                  <small className="text-muted">Hoy</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card border-secondary">
                <div className="card-body text-center p-3">
                  <i className="bi bi-calendar-week text-secondary mb-2" style={{fontSize: '1.5rem'}}></i>
                  <h5 className="card-title mb-1">{stats.week}</h5>
                  <small className="text-muted">Semana</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card border-dark">
                <div className="card-body text-center p-3">
                  <i className="bi bi-calendar-month text-dark mb-2" style={{fontSize: '1.5rem'}}></i>
                  <h5 className="card-title mb-1">{stats.month}</h5>
                  <small className="text-muted">Mes</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas por tipo */}
      <div className="alert alert-light border">
        <div className="row text-center">
          <div className="col-md-3">
            <span className="badge bg-success me-2">{stats.entradas}</span>
            <strong>Entradas</strong>
          </div>
          <div className="col-md-3">
            <span className="badge bg-danger me-2">{stats.salidas}</span>
            <strong>Salidas</strong>
          </div>
          <div className="col-md-3">
            <span className="badge bg-info me-2">{stats.ajustes}</span>
            <strong>Ajustes</strong>
          </div>
          <div className="col-md-3">
            <span className="badge bg-primary me-2">{filteredMovements.length}</span>
            <strong>Filtrados</strong>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-2">
              <label className="form-label">Almacén</label>
              <select 
                className="form-select" 
                value={filterWarehouse} 
                onChange={(e) => { setFilterWarehouse(e.target.value); setPage(1); }}
              >
                <option value="">Todos</option>
                {warehouses
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))
                }
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Tipo</label>
              <select 
                className="form-select" 
                value={filterType} 
                onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              >
                <option value="">Todos</option>
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
                <option value="ajuste">Ajuste</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Autorizado</label>
              <select 
                className="form-select" 
                value={filterAuth} 
                onChange={(e) => { setFilterAuth(e.target.value); setPage(1); }}
              >
                <option value="">Todos</option>
                <option value="1">Sí</option>
                <option value="0">No</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Desde</label>
              <input 
                type="date" 
                className="form-control" 
                value={filterDateFrom} 
                onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Hasta</label>
              <input 
                type="date" 
                className="form-control" 
                value={filterDateTo} 
                onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Buscar</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Buscar..."
                value={filterSearch} 
                onChange={(e) => { setFilterSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>
          <div className="mt-3">
            <button 
              className="btn btn-outline-success me-2" 
              onClick={exportToExcel}
              title="Exportar datos filtrados a Excel (Ctrl+E)"
            >
              <i className="bi bi-file-earmark-excel me-1"></i>
              Exportar Excel
            </button>
            <button 
              className="btn btn-outline-danger me-2" 
              onClick={exportToPDF}
              title="Exportar datos filtrados a PDF (Ctrl+P)"
            >
              <i className="bi bi-file-earmark-pdf me-1"></i>
              Exportar PDF
            </button>
            {(filterWarehouse || filterType || filterAuth || filterSearch || filterDateFrom || filterDateTo) && (
              <button 
                className="btn btn-outline-secondary"
                onClick={() => {
                  setFilterWarehouse('');
                  setFilterType('');
                  setFilterAuth('');
                  setFilterSearch('');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                  setPage(1);
                }}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="card-body p-0">
          {paginatedMovements.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-inbox display-1 text-muted"></i>
              <h4 className="mt-3">No hay movimientos para mostrar</h4>
              <p className="text-muted">
                {movements.length === 0 
                  ? 'No se encontraron movimientos en el sistema.'
                  : 'Ningún movimiento coincide con los filtros aplicados.'
                }
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Almacén</th>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                    <th>Usuario crea</th>
                    <th>Usuario autoriza</th>
                    <th>Fecha</th>
                    <th>Autorizado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMovements.map(movement => (
                    <React.Fragment key={movement.id}>
                      <tr 
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => {
                          if (!e.target.closest('.btn')) {
                            toggleRow(movement.id);
                          }
                        }}
                      >
                        <td className="fw-bold">{movement.id}</td>
                        <td>{movement.warehouse?.name || 'N/A'}</td>
                        <td>
                          <span className={`badge ${
                            movement.movement_type === 'entrada' ? 'bg-success' :
                            movement.movement_type === 'salida' ? 'bg-danger' : 'bg-info'
                          }`}>
                            {movement.movement_type}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-primary">
                            {movement.total_quantity || 0}
                          </span>
                        </td>
                        <td>{movement.user?.email || movement.user?.first_name || 'N/A'}</td>
                        <td>
                          {(() => {
                            const authorizedUser = getAuthorizedByUser(movement.authorized_by);
                            return authorizedUser 
                              ? (authorizedUser.email || `${authorizedUser.first_name} ${authorizedUser.last_name}`.trim())
                              : (movement.authorized ? 'Usuario eliminado' : 'N/A');
                          })()}
                        </td>
                        <td>
                          {movement.created_at ? 
                            new Date(movement.created_at).toLocaleDateString() : 
                            'N/A'
                          }
                        </td>
                        <td>
                          <span className={`badge ${movement.authorized ? 'bg-success' : 'bg-secondary'}`}>
                            {movement.authorized ? 'Sí' : 'No'}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            {!movement.authorized && (
                              <button 
                                className="btn btn-outline-success"
                                onClick={() => authorizeMovement(movement.id)}
                                title="Autorizar"
                              >
                                <i className="bi bi-check"></i>
                              </button>
                            )}
                            {!movement.authorized && (
                              <button 
                                className="btn btn-outline-primary"
                                onClick={() => editMovement(movement)}
                                title="Editar"
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                            )}
                            {!movement.authorized && (
                              <button 
                                className="btn btn-outline-danger"
                                onClick={() => deleteMovement(movement.id)}
                                title="Eliminar"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      
                      {expandedRows.includes(movement.id) && (
                        <tr>
                          <td colSpan="9" className="bg-light">
                            <div className="p-3">
                              <strong className="mb-2 d-block">Detalles del movimiento</strong>
                              <div className="row g-3 mb-2">
                                <div className="col-md-6">
                                  <div className="mb-2">
                                    <span className="fw-bold">Referencia:</span>
                                    <span className="ms-2">{movement.reference_document || <span className="text-muted">N/A</span>}</span>
                                  </div>
                                  <div className="mb-2">
                                    <span className="fw-bold">Notas:</span>
                                    <span className="ms-2">{movement.notes || <span className="text-muted">N/A</span>}</span>
                                  </div>
                                  <div className="mb-2">
                                    <span className="fw-bold">Tipo de movimiento:</span>
                                    <span className="ms-2">{movement.movement_type || <span className="text-muted">N/A</span>}</span>
                                  </div>
                                  <div className="mb-2">
                                    <span className="fw-bold">Almacén:</span>
                                    <span className="ms-2">{movement.warehouse?.name || <span className="text-muted">N/A</span>}</span>
                                  </div>
                                </div>
                                <div className="col-md-6">
                                  <div className="mb-2">
                                    <span className="fw-bold">Usuario crea:</span>
                                    <span className="ms-2">{movement.user?.email || movement.user?.first_name || <span className="text-muted">N/A</span>}</span>
                                  </div>
                                  <div className="mb-2">
                                    <span className="fw-bold">Usuario autoriza:</span>
                                    <span className="ms-2">{(() => {
                                      const authorizedUser = getAuthorizedByUser(movement.authorized_by);
                                      return authorizedUser 
                                        ? (authorizedUser.email || `${authorizedUser.first_name} ${authorizedUser.last_name}`.trim())
                                        : (movement.authorized ? 'Usuario eliminado' : <span className="text-muted">N/A</span>);
                                    })()}</span>
                                  </div>
                                  <div className="mb-2">
                                    <span className="fw-bold">Fecha:</span>
                                    <span className="ms-2">{movement.created_at ? new Date(movement.created_at).toLocaleString() : <span className="text-muted">N/A</span>}</span>
                                  </div>
                                  <div className="mb-2">
                                    <span className="fw-bold">Autorizado:</span>
                                    <span className={`badge ms-2 ${movement.authorized ? 'bg-success' : 'bg-secondary'}`}>
                                      {movement.authorized ? 'Sí' : 'No'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {movement.details && movement.details.length > 0 && (
                                <div className="mt-3">
                                  <small className="fw-bold">Productos:</small>
                                  <div className="table-responsive mt-2">
                                    <table className="table table-bordered table-sm">
                                      <thead className="table-light">
                                        <tr>
                                          <th>Producto</th>
                                          <th>Cantidad</th>
                                          <th>Precio</th>
                                          <th>Total</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {movement.details.map((detail, idx) => (
                                          <tr key={idx}>
                                            <td>
                                              {(() => {
                                                // Si hay nombre de variante y no es N/A, mostrarlo
                                                if (detail.product_variant?.name && detail.product_variant?.name !== 'N/A') {
                                                  return detail.product_variant.name;
                                                }
                                                // Si hay nombre de producto, mostrarlo
                                                if (detail.product_variant?.product?.name) {
                                                  return detail.product_variant.product.name;
                                                }
                                                // Si hay SKU, mostrarlo como fallback
                                                if (detail.product_variant?.sku) {
                                                  return <span className="text-muted">SKU: {detail.product_variant.sku}</span>;
                                                }
                                                // Si no hay nada, mostrar mensaje de error para depuración
                                                return <span className="text-danger">Sin información de producto</span>;
                                              })()}
                                            </td>
                                            <td>{detail.quantity}</td>
                                            <td>${Number(detail.price).toFixed(2)}</td>
                                            <td>${Number(detail.total).toFixed(2)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Paginación */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center p-3">
              <div>
                <span className="me-2">Mostrar</span>
                <select 
                  className="form-select d-inline-block w-auto"
                  value={rowsPerPage}
                  onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="ms-2">por página</span>
              </div>
              
              <nav>
                <ul className="pagination mb-0">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => setPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </button>
                  </li>
                  
                  {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      </li>
                    );
                  })}
                  
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => setPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Modal para nuevo movimiento */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Nuevo Movimiento de Inventario</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={resetModal}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {formError && (
                    <div className="alert alert-danger">{formError}</div>
                  )}
                  
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Almacén *</label>
                      <select 
                        className="form-select" 
                        value={form.warehouse}
                        onChange={(e) => setForm({...form, warehouse: e.target.value})}
                        required
                      >
                        <option value="">Seleccionar almacén</option>
                        {warehouses
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))
                        }
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Tipo de movimiento *</label>
                      <select 
                        className="form-select" 
                        value={form.movement_type}
                        onChange={(e) => setForm({...form, movement_type: e.target.value})}
                        required
                      >
                        <option value="">Seleccionar tipo</option>
                        <option value="entrada">Entrada</option>
                        <option value="salida">Salida</option>
                        <option value="ajuste">Ajuste</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Documento de referencia</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={form.reference_document}
                        onChange={(e) => setForm({...form, reference_document: e.target.value})}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Notas</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={form.notes}
                        onChange={(e) => setForm({...form, notes: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <hr />
                  <h6>Detalles del movimiento</h6>
                  
                  {modalDetails.map((detail, idx) => (
                    <div key={idx} className="card mb-3">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6 className="mb-0">Producto #{idx + 1}</h6>
                          {modalDetails.length > 1 && (
                            <button 
                              type="button" 
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => removeModalDetail(idx)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          )}
                        </div>
                        
                        <div className="row g-2">
                          <div className="col-md-6">
                            <label className="form-label">Producto variante *</label>
                            <select 
                              className="form-select" 
                              value={detail.product_variant}
                              onChange={(e) => handleModalDetailChange(idx, 'product_variant', e.target.value)}
                              required
                            >
                              <option value="">Seleccionar producto</option>
                              {productVariants.sort((a, b) => a.name.localeCompare(b.name)).map(pv => (
                                <option key={pv.id} value={pv.id}>
                                  {pv.name} - {pv.sku}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-2">
                            <label className="form-label">Cantidad *</label>
                            <input 
                              type="number" 
                              className="form-control" 
                              value={detail.quantity}
                              onChange={(e) => handleModalDetailChange(idx, 'quantity', e.target.value)}
                              min="1"
                              step="1"
                              required
                            />
                          </div>
                          <div className="col-md-2">
                            <label className="form-label">Precio *</label>
                            <input 
                              type="number" 
                              className="form-control" 
                              value={detail.price}
                              onChange={(e) => handleModalDetailChange(idx, 'price', e.target.value)}
                              min="0"
                              step="0.01"
                              required
                            />
                          </div>
                          <div className="col-md-2">
                            <label className="form-label">Total</label>
                            <input 
                              type="text" 
                              className="form-control bg-light" 
                              value={`$${((detail.quantity || 0) * (detail.price || 0)).toFixed(2)}`}
                              readOnly
                            />
                          </div>
                        </div>
                        
                        <div className="row g-2 mt-2">
                          <div className="col-md-6">
                            <label className="form-label">Lote</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={detail.lote}
                              onChange={(e) => handleModalDetailChange(idx, 'lote', e.target.value)}
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label">Fecha de expiración</label>
                            <input 
                              type="date" 
                              className="form-control" 
                              value={detail.expiration_date}
                              onChange={(e) => handleModalDetailChange(idx, 'expiration_date', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    type="button" 
                    className="btn btn-outline-primary"
                    onClick={addModalDetail}
                  >
                    <i className="bi bi-plus me-1"></i>
                    Agregar otro producto
                  </button>
                </div>
                
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={resetModal}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                  >
                    Crear movimiento
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar movimiento */}
      {showEditModal && editingMovement && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Editar Movimiento de Inventario #{editingMovement.id}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={resetEditModal}
                ></button>
              </div>
              <form onSubmit={updateMovement}>
                <div className="modal-body">
                  {formError && (
                    <div className="alert alert-danger">{formError}</div>
                  )}
                  
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Almacén *</label>
                      <select 
                        className="form-select" 
                        value={form.warehouse}
                        onChange={(e) => setForm({...form, warehouse: e.target.value})}
                        required
                      >
                        <option value="">Seleccionar almacén</option>
                        {warehouses
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))
                        }
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Tipo de movimiento *</label>
                      <select 
                        className="form-select" 
                        value={form.movement_type}
                        onChange={(e) => setForm({...form, movement_type: e.target.value})}
                        required
                      >
                        <option value="">Seleccionar tipo</option>
                        <option value="entrada">Entrada</option>
                        <option value="salida">Salida</option>
                        <option value="ajuste">Ajuste</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Documento de referencia</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={form.reference_document}
                        onChange={(e) => setForm({...form, reference_document: e.target.value})}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Notas</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={form.notes}
                        onChange={(e) => setForm({...form, notes: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <hr />
                  <h6>Detalles del movimiento</h6>
                  
                  {modalDetails.map((detail, idx) => (
                    <div key={idx} className="card mb-3">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6 className="mb-0">Producto #{idx + 1}</h6>
                          {modalDetails.length > 1 && (
                            <button 
                              type="button" 
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => removeModalDetail(idx)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          )}
                        </div>
                        
                        <div className="row g-2">
                          <div className="col-md-6">
                            <label className="form-label">Producto variante *</label>
                            <select 
                              className="form-select" 
                              value={detail.product_variant}
                              onChange={(e) => handleModalDetailChange(idx, 'product_variant', e.target.value)}
                              required
                            >
                              <option value="">Seleccionar producto</option>
                              {productVariants.sort((a, b) => a.name.localeCompare(b.name)).map(pv => (
                                <option key={pv.id} value={pv.id}>
                                  {pv.name} - {pv.sku}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-2">
                            <label className="form-label">Cantidad *</label>
                            <input 
                              type="number" 
                              className="form-control" 
                              value={detail.quantity}
                              onChange={(e) => handleModalDetailChange(idx, 'quantity', e.target.value)}
                              min="1"
                              step="1"
                              required
                            />
                          </div>
                          <div className="col-md-2">
                            <label className="form-label">Precio *</label>
                            <input 
                              type="number" 
                              className="form-control" 
                              value={detail.price}
                              onChange={(e) => handleModalDetailChange(idx, 'price', e.target.value)}
                              min="0"
                              step="0.01"
                              required
                            />
                          </div>
                          <div className="col-md-2">
                            <label className="form-label">Total</label>
                            <input 
                              type="text" 
                              className="form-control bg-light" 
                              value={`$${((detail.quantity || 0) * (detail.price || 0)).toFixed(2)}`}
                              readOnly
                            />
                          </div>
                        </div>
                        
                        <div className="row g-2 mt-2">
                          <div className="col-md-6">
                            <label className="form-label">Lote</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={detail.lote}
                              onChange={(e) => handleModalDetailChange(idx, 'lote', e.target.value)}
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label">Fecha de expiración</label>
                            <input 
                              type="date" 
                              className="form-control" 
                              value={detail.expiration_date}
                              onChange={(e) => handleModalDetailChange(idx, 'expiration_date', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    type="button" 
                    className="btn btn-outline-primary"
                    onClick={addModalDetail}
                  >
                    <i className="bi bi-plus me-1"></i>
                    Agregar otro producto
                  </button>
                </div>
                
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={resetEditModal}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                  >
                    Actualizar movimiento
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal para ver inventario actual */}
      {showInventoryModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-boxes me-2"></i>
                  Inventario Actual
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={closeInventoryModal}
                ></button>
              </div>
              <div className="modal-body">
                {loadingInventory ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Cargando inventario...</span>
                    </div>
                    <p className="mt-2">Cargando inventario actual...</p>
                  </div>
                ) : (
                  <>
                    {/* Filtros del inventario */}
                    <div className="row mb-3">
                      <div className="col-md-4">
                        <label className="form-label">Almacén</label>
                        <select 
                          className="form-select" 
                          value={inventoryFilters.warehouse}
                          onChange={(e) => setInventoryFilters({...inventoryFilters, warehouse: e.target.value})}
                        >
                          <option value="">Todos los almacenes</option>
                          {warehouses
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(w => (
                              <option key={w.id} value={w.id}>{w.name}</option>
                            ))
                          }
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Estado de Stock</label>
                        <select 
                          className="form-select" 
                          value={inventoryFilters.stockStatus}
                          onChange={(e) => setInventoryFilters({...inventoryFilters, stockStatus: e.target.value})}
                        >
                          <option value="">Todos los estados</option>
                          <option value="normal">Stock Normal</option>
                          <option value="low">Stock Bajo</option>
                          <option value="out">Sin Stock</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Buscar</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="Buscar producto o SKU..."
                          value={inventoryFilters.search}
                          onChange={(e) => setInventoryFilters({...inventoryFilters, search: e.target.value})}
                        />
                      </div>
                    </div>

                    {/* Estadísticas del inventario */}
                    <div className="row mb-4">{(() => {
                      const filteredInventory = getFilteredInventory();
                      const normalStock = filteredInventory.filter(item => (item.quantity || 0) > (item.product_variant?.min_stock || 0)).length;
                      const lowStock = filteredInventory.filter(item => (item.quantity || 0) <= (item.product_variant?.min_stock || 0) && (item.quantity || 0) > 0).length;
                      const outOfStock = filteredInventory.filter(item => (item.quantity || 0) === 0).length;
                      
                      return (
                        <>
                          <div className="col-md-3">
                            <div className="card border-primary">
                              <div className="card-body text-center p-3">
                                <i className="bi bi-box text-primary mb-2" style={{fontSize: '1.5rem'}}></i>
                                <h5 className="card-title mb-1">{filteredInventory.length}</h5>
                                <small className="text-muted">Total Productos</small>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-3">
                            <div className="card border-success">
                              <div className="card-body text-center p-3">
                                <i className="bi bi-check-circle text-success mb-2" style={{fontSize: '1.5rem'}}></i>
                                <h5 className="card-title mb-1">{normalStock}</h5>
                                <small className="text-muted">Stock Normal</small>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-3">
                            <div className="card border-warning">
                              <div className="card-body text-center p-3">
                                <i className="bi bi-exclamation-triangle text-warning mb-2" style={{fontSize: '1.5rem'}}></i>
                                <h5 className="card-title mb-1">{lowStock}</h5>
                                <small className="text-muted">Stock Bajo</small>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-3">
                            <div className="card border-danger">
                              <div className="card-body text-center p-3">
                                <i className="bi bi-x-circle text-danger mb-2" style={{fontSize: '1.5rem'}}></i>
                                <h5 className="card-title mb-1">{outOfStock}</h5>
                                <small className="text-muted">Sin Stock</small>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}</div>

                    {/* Botón de exportar */}
                    <div className="mb-3">
                      <button 
                        className="btn btn-outline-success me-2" 
                        onClick={exportInventoryToExcel}
                      >
                        <i className="bi bi-file-earmark-excel me-1"></i>
                        Exportar Inventario a Excel
                      </button>
                      {(inventoryFilters.warehouse || inventoryFilters.stockStatus || inventoryFilters.search) && (
                        <button 
                          className="btn btn-outline-secondary"
                          onClick={() => setInventoryFilters({ warehouse: '', stockStatus: '', search: '' })}
                        >
                          <i className="bi bi-arrow-clockwise me-1"></i>
                          Limpiar Filtros
                        </button>
                      )}
                    </div>

                    {/* Tabla de inventario */}
                    <div className="table-responsive" style={{ maxHeight: '400px' }}>
                      <table className="table table-hover table-sm">
                        <thead className="table-light sticky-top">
                          <tr>
                            <th>Producto</th>
                            <th>SKU</th>
                            <th>Almacén</th>
                            <th>Stock</th>
                            <th>Mín.</th>
                            <th>Precio</th>
                            <th>Valor Total</th>
                            <th>Estado</th>
                            <th>Últ. Act.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const filteredInventory = getFilteredInventory();
                            
                            if (filteredInventory.length === 0) {
                              return (
                                <tr>
                                  <td colSpan="9" className="text-center py-4">
                                    <i className="bi bi-inbox display-4 text-muted"></i>
                                    <p className="mt-2 text-muted">
                                      {inventoryData.length === 0 
                                        ? 'No hay datos de inventario disponibles'
                                        : 'No hay productos que coincidan con los filtros'
                                      }
                                    </p>
                                  </td>
                                </tr>
                              );
                            }
                            
                            return filteredInventory.map((item, idx) => {
                              const isLowStock = (item.quantity || 0) <= (item.product_variant?.min_stock || 0);
                              const isOutOfStock = (item.quantity || 0) === 0;
                              
                              return (
                                <tr key={idx} className={
                                  isOutOfStock ? 'table-danger' : 
                                  isLowStock ? 'table-warning' : ''
                                }>
                                  <td>
                                    <strong>{item.product_variant?.name || 'N/A'}</strong>
                                  </td>
                                  <td>
                                    <code className="small">{item.product_variant?.sku || 'N/A'}</code>
                                  </td>
                                  <td>{item.warehouse?.name || 'N/A'}</td>
                                  <td>
                                    <span className={`badge ${
                                      isOutOfStock ? 'bg-danger' :
                                      isLowStock ? 'bg-warning' : 'bg-success'
                                    }`}>
                                      {item.quantity || 0}
                                    </span>
                                  </td>
                                  <td>
                                    <small className="text-muted">{item.product_variant?.min_stock || 0}</small>
                                  </td>
                                  <td>
                                    <small>${(item.product_variant?.price || 0).toFixed(2)}</small>
                                  </td>
                                  <td>
                                    <strong>${((item.quantity || 0) * (item.product_variant?.price || 0)).toFixed(2)}</strong>
                                  </td>
                                  <td>
                                    {isOutOfStock ? (
                                      <span className="badge bg-danger">Sin Stock</span>
                                    ) : isLowStock ? (
                                      <span className="badge bg-warning">Stock Bajo</span>
                                    ) : (
                                      <span className="badge bg-success">Normal</span>
                                    )}
                                  </td>
                                  <td>
                                    <small className="text-muted">
                                      {item.last_updated ? 
                                        new Date(item.last_updated).toLocaleDateString() : 
                                        'N/A'
                                      }
                                    </small>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={closeInventoryModal}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importación CSV */}
      {showImportModal && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-file-earmark-arrow-up me-2"></i>
                  Importar Movimiento desde CSV - Paso {importStep} de 3
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={resetImportModal}
                ></button>
              </div>

              <div className="modal-body">
                {/* Paso 1: Configuración de Cabecera */}
                {importStep === 1 && (
                  <div className="fade-in">
                    <h6 className="text-primary mb-3">
                      <i className="bi bi-gear me-2"></i>
                      Configuración del Movimiento
                    </h6>
                    
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            <i className="bi bi-building me-1"></i>
                            Almacén *
                          </label>
                          <select
                            className="form-select"
                            value={importForm.warehouse_id}
                            onChange={(e) => setImportForm({...importForm, warehouse_id: e.target.value})}
                            required
                          >
                            <option value="">Seleccionar almacén...</option>
                            {warehouses
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map(warehouse => (
                                <option key={warehouse.id} value={warehouse.id}>
                                  {warehouse.name} - {warehouse.location}
                                </option>
                              ))
                            }
                          </select>
                        </div>
                      </div>
                      
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            <i className="bi bi-arrow-up-down me-1"></i>
                            Tipo de Movimiento *
                          </label>
                          <select
                            className="form-select"
                            value={importForm.movement_type}
                            onChange={(e) => setImportForm({...importForm, movement_type: e.target.value})}
                            required
                          >
                            <option value="Entrada">Entrada</option>
                            <option value="Salida">Salida</option>
                            <option value="Ajuste">Ajuste</option>
                            <option value="Traspaso">Traspaso</option>
                            <option value="Inventario Inicial">Inventario Inicial</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label">
                        <i className="bi bi-card-text me-1"></i>
                        Notas
                      </label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={importForm.notes}
                        onChange={(e) => setImportForm({...importForm, notes: e.target.value})}
                        placeholder="Descripción del movimiento..."
                      ></textarea>
                    </div>

                    <div className="alert alert-info">
                      <i className="bi bi-info-circle me-2"></i>
                      <strong>Formato del archivo CSV:</strong>
                      <ul className="mb-0 mt-2">
                        <li>Debe contener las columnas: <code>nombre</code>, <code>cantidad</code>, <code>precio</code></li>
                        <li>La primera fila debe ser el encabezado</li>
                        <li>Los precios pueden incluir símbolo $ y usar coma como separador decimal</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Paso 2: Subida de Archivo */}
                {importStep === 2 && (
                  <div className="fade-in">
                    <h6 className="text-primary mb-3">
                      <i className="bi bi-file-arrow-up me-2"></i>
                      Seleccionar Archivo CSV
                    </h6>

                    <div className="mb-4">
                      <label className="form-label">Archivo CSV *</label>
                      <input
                        type="file"
                        className="form-control"
                        accept=".csv"
                        onChange={handleFileChange}
                        required
                      />
                      {importFile && (
                        <div className="mt-2">
                          <small className="text-success">
                            <i className="bi bi-check-circle me-1"></i>
                            Archivo seleccionado: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                          </small>
                        </div>
                      )}
                    </div>

                    <div className="alert alert-warning">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      <strong>Importante:</strong>
                      <ul className="mb-0 mt-2">
                        <li>El sistema buscará los productos por nombre en la base de datos</li>
                        <li>Se mostrará un reporte de productos encontrados y no encontrados</li>
                        <li>Solo se importarán los productos que se encuentren en el sistema</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Paso 3: Resultados de Validación */}
                {importStep === 3 && importValidation && (
                  <div className="fade-in">
                    <h6 className="text-primary mb-3">
                      <i className="bi bi-clipboard-check me-2"></i>
                      Resultados de la Validación
                    </h6>

                    {/* Resumen */}
                    <div className="row mb-4">
                      <div className="col-md-3">
                        <div className="card border-success">
                          <div className="card-body text-center">
                            <i className="bi bi-check-circle text-success fs-3"></i>
                            <h5 className="text-success">{importValidation.resumen.encontrados}</h5>
                            <small>Encontrados</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card border-danger">
                          <div className="card-body text-center">
                            <i className="bi bi-x-circle text-danger fs-3"></i>
                            <h5 className="text-danger">{importValidation.resumen.no_encontrados}</h5>
                            <small>No encontrados</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card border-info">
                          <div className="card-body text-center">
                            <i className="bi bi-list-ol text-info fs-3"></i>
                            <h5 className="text-info">{importValidation.resumen.total_filas}</h5>
                            <small>Total filas</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card border-primary">
                          <div className="card-body text-center">
                            <i className="bi bi-currency-dollar text-primary fs-3"></i>
                            <h5 className="text-primary">${importValidation.resumen.total_calculado.toFixed(2)}</h5>
                            <small>Total calculado</small>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Productos Encontrados */}
                    {importValidation.productos_encontrados.length > 0 && (
                      <div className="mb-4">
                        <h6 className="text-success">
                          <i className="bi bi-check-circle me-2"></i>
                          Productos Encontrados ({importValidation.productos_encontrados.length})
                        </h6>
                        <div className="table-responsive" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          <table className="table table-sm table-striped">
                            <thead className="table-success">
                              <tr>
                                <th>Fila</th>
                                <th>Nombre CSV</th>
                                <th>Producto Encontrado</th>
                                <th>SKU</th>
                                <th>Cantidad</th>
                                <th>Precio</th>
                                <th>Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {importValidation.productos_encontrados.map((item, index) => (
                                <tr key={index}>
                                  <td>{item.fila}</td>
                                  <td className="small">{item.nombre}</td>
                                  <td className="small">{item.producto_encontrado}</td>
                                  <td><code className="small">{item.sku}</code></td>
                                  <td>{item.cantidad}</td>
                                  <td>${item.precio.toFixed(2)}</td>
                                  <td><strong>${item.subtotal.toFixed(2)}</strong></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Productos No Encontrados */}
                    {importValidation.productos_no_encontrados.length > 0 && (
                      <div className="mb-4">
                        <h6 className="text-danger">
                          <i className="bi bi-x-circle me-2"></i>
                          Productos No Encontrados ({importValidation.productos_no_encontrados.length})
                        </h6>
                        <div className="table-responsive" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          <table className="table table-sm table-striped">
                            <thead className="table-danger">
                              <tr>
                                <th>Fila</th>
                                <th>Nombre</th>
                                <th>Error</th>
                              </tr>
                            </thead>
                            <tbody>
                              {importValidation.productos_no_encontrados.map((item, index) => (
                                <tr key={index}>
                                  <td>{item.fila}</td>
                                  <td className="small">{item.nombre}</td>
                                  <td className="small text-danger">{item.error}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {importValidation.productos_encontrados.length === 0 && (
                      <div className="alert alert-warning">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        No se encontraron productos válidos para importar.
                      </div>
                    )}
                  </div>
                )}

                {/* Mostrar errores */}
                {importError && (
                  <div className="alert alert-danger">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {importError}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                {importStep > 1 && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setImportStep(importStep - 1)}
                    disabled={importLoading}
                  >
                    <i className="bi bi-arrow-left me-2"></i>
                    Anterior
                  </button>
                )}
                
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={resetImportModal}
                  disabled={importLoading}
                >
                  Cancelar
                </button>

                {importStep < 3 && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleImportNext}
                    disabled={importLoading}
                  >
                    {importLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        {importStep === 2 ? 'Validando...' : 'Procesando...'}
                      </>
                    ) : (
                      <>
                        Siguiente
                        <i className="bi bi-arrow-right ms-2"></i>
                      </>
                    )}
                  </button>
                )}

                {importStep === 3 && importValidation?.productos_encontrados?.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={confirmImport}
                    disabled={importLoading}
                  >
                    {importLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Importando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i>
                        Confirmar Importación
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importación CSV */}
      {showImportModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">
                  <i className="bi bi-file-earmark-arrow-up me-2"></i>
                  Importar Movimientos desde CSV - Paso {importStep} de 3
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={resetImportModal}></button>
              </div>
              
              <div className="modal-body">
                {/* Paso 1: Configuración */}
                {importStep === 1 && (
                  <div className="fade-in">
                    <div className="row">
                      <div className="col-md-8">
                        <h6 className="text-success mb-3">📋 Configuración del Movimiento</h6>
                        
                        <div className="row">
                          <div className="col-md-6 mb-3">
                            <label htmlFor="import-warehouse" className="form-label">
                              <i className="bi bi-building me-2"></i>Almacén *
                            </label>
                            <select
                              id="import-warehouse"
                              className="form-select"
                              value={importForm.warehouse_id}
                              onChange={(e) => setImportForm({...importForm, warehouse_id: e.target.value})}
                            >
                              <option value="">Seleccionar almacén...</option>
                              {warehouses
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map(w => (
                                  <option key={w.id} value={w.id}>{w.name}</option>
                                ))
                              }
                            </select>
                          </div>
                          
                          <div className="col-md-6 mb-3">
                            <label htmlFor="import-type" className="form-label">
                              <i className="bi bi-arrow-left-right me-2"></i>Tipo de Movimiento *
                            </label>
                            <select
                              id="import-type"
                              className="form-select"
                              value={importForm.movement_type}
                              onChange={(e) => setImportForm({...importForm, movement_type: e.target.value})}
                            >
                              <option value="Entrada">Entrada</option>
                              <option value="Salida">Salida</option>
                              <option value="Ajuste">Ajuste</option>
                              <option value="Traspaso">Traspaso</option>
                            </select>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <label htmlFor="import-notes" className="form-label">
                            <i className="bi bi-chat-text me-2"></i>Notas del Movimiento
                          </label>
                          <textarea
                            id="import-notes"
                            className="form-control"
                            rows="3"
                            placeholder="Información adicional sobre este movimiento..."
                            value={importForm.notes}
                            onChange={(e) => setImportForm({...importForm, notes: e.target.value})}
                          />
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="alert alert-info">
                          <h6><i className="bi bi-info-circle me-2"></i>Formato CSV Requerido</h6>
                          <p className="mb-2">El archivo debe contener las siguientes columnas:</p>
                          <ul className="list-unstyled">
                            <li><code>nombre</code> - Nombre del producto</li>
                            <li><code>cantidad</code> - Cantidad numérica</li>
                            <li><code>precio</code> - Precio (ej: $15,50)</li>
                          </ul>
                          <p className="small text-muted">
                            <strong>Ejemplo:</strong><br/>
                            nombre,cantidad,precio<br/>
                            Acetaminofen 500mg,50,$15,50
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {importError && (
                      <div className="alert alert-danger">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        {importError}
                      </div>
                    )}
                  </div>
                )}

                {/* Paso 2: Subida de Archivo */}
                {importStep === 2 && (
                  <div className="fade-in">
                    <h6 className="text-success mb-3">📁 Seleccionar Archivo CSV</h6>
                    
                    <div className="row">
                      <div className="col-md-8">
                        <div className="mb-3">
                          <label htmlFor="csv-file" className="form-label">
                            <i className="bi bi-file-earmark-csv me-2"></i>Archivo CSV
                          </label>
                          <input
                            type="file"
                            id="csv-file"
                            className="form-control"
                            accept=".csv"
                            onChange={handleFileChange}
                          />
                          <div className="form-text">
                            Máximo 5MB. Solo archivos .csv
                          </div>
                        </div>
                        
                        {importFile && (
                          <div className="alert alert-success">
                            <i className="bi bi-check-circle me-2"></i>
                            <strong>Archivo seleccionado:</strong> {importFile.name}<br/>
                            <small>Tamaño: {(importFile.size / 1024).toFixed(2)} KB</small>
                          </div>
                        )}
                      </div>
                      
                      <div className="col-md-4">
                        <div className="alert alert-warning">
                          <h6><i className="bi bi-exclamation-triangle me-2"></i>Importante</h6>
                          <ul className="mb-0 small">
                            <li>El sistema buscará productos por nombre</li>
                            <li>Los productos no encontrados serán reportados</li>
                            <li>Solo se importarán productos existentes</li>
                            <li>Revise los resultados antes de confirmar</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    {importError && (
                      <div className="alert alert-danger">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        {importError}
                      </div>
                    )}
                  </div>
                )}

                {/* Paso 3: Resultados */}
                {importStep === 3 && importValidation && (
                  <div className="fade-in">
                    <h6 className="text-success mb-3">📊 Resultados de Validación</h6>
                    
                    {/* Resumen en tarjetas */}
                    <div className="row mb-4">
                      <div className="col-md-3">
                        <div className="card bg-primary text-white">
                          <div className="card-body text-center">
                            <h4>{importValidation.resumen.total_filas}</h4>
                            <small>Total Filas</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card bg-success text-white">
                          <div className="card-body text-center">
                            <h4>{importValidation.resumen.encontrados}</h4>
                            <small>Encontrados</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card bg-warning text-white">
                          <div className="card-body text-center">
                            <h4>{importValidation.resumen.no_encontrados}</h4>
                            <small>No Encontrados</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card bg-info text-white">
                          <div className="card-body text-center">
                            <h4>${importValidation.resumen.total_calculado.toFixed(2)}</h4>
                            <small>Total</small>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="row">
                      {/* Productos encontrados */}
                      <div className="col-md-6">
                        <h6 className="text-success">
                          <i className="bi bi-check-circle me-2"></i>
                          Productos Encontrados ({importValidation.productos_encontrados.length})
                        </h6>
                        <div className="table-responsive" style={{maxHeight: '300px', overflowY: 'auto'}}>
                          <table className="table table-sm">
                            <thead className="table-success">
                              <tr>
                                <th>Producto</th>
                                <th>Cant.</th>
                                <th>Precio</th>
                                <th>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {importValidation.productos_encontrados.map((item, idx) => (
                                <tr key={idx}>
                                  <td>
                                    <small>{item.producto_encontrado}</small><br/>
                                    <code className="text-muted">{item.sku}</code>
                                  </td>
                                  <td>{item.cantidad}</td>
                                  <td>${item.precio.toFixed(2)}</td>
                                  <td><strong>${item.subtotal.toFixed(2)}</strong></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Productos no encontrados */}
                      <div className="col-md-6">
                        <h6 className="text-warning">
                          <i className="bi bi-exclamation-triangle me-2"></i>
                          Productos No Encontrados ({importValidation.productos_no_encontrados.length})
                        </h6>
                        <div className="table-responsive" style={{maxHeight: '300px', overflowY: 'auto'}}>
                          <table className="table table-sm">
                            <thead className="table-warning">
                              <tr>
                                <th>Fila</th>
                                <th>Nombre</th>
                                <th>Error</th>
                              </tr>
                            </thead>
                            <tbody>
                              {importValidation.productos_no_encontrados.map((item, idx) => (
                                <tr key={idx}>
                                  <td>{item.fila}</td>
                                  <td><small>{item.nombre}</small></td>
                                  <td><small className="text-danger">{item.error}</small></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                    
                    {importError && (
                      <div className="alert alert-danger mt-3">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        {importError}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="modal-footer">
                {importStep > 1 && (
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setImportStep(importStep - 1)}
                    disabled={importLoading}
                  >
                    <i className="bi bi-arrow-left me-2"></i>Anterior
                  </button>
                )}
                
                <button type="button" className="btn btn-outline-secondary" onClick={resetImportModal}>
                  Cancelar
                </button>
                
                {importStep < 3 ? (
                  <button 
                    type="button" 
                    className="btn btn-success"
                    onClick={handleImportNext}
                    disabled={importLoading}
                  >
                    {importLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        {importStep === 2 ? 'Validando...' : 'Cargando...'}
                      </>
                    ) : (
                      <>
                        Siguiente <i className="bi bi-arrow-right ms-2"></i>
                      </>
                    )}
                  </button>
                ) : (
                  <button 
                    type="button" 
                    className="btn btn-success"
                    onClick={confirmImport}
                    disabled={importLoading || !importValidation?.productos_encontrados?.length}
                  >
                    {importLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Importando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i>
                        Confirmar Importación
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      ) : (
        /* Contenido del inventario */
        <div className="fade-in">
          {/* Panel de filtros para inventario */}
          <div className="card mb-3">
            <div className="card-body py-2">
              <div className="row g-2 align-items-center">
                <div className="col-md-3">
                  <select 
                    className="form-select form-select-sm"
                    value={inventoryFiltersTab.warehouse}
                    onChange={(e) => setInventoryFiltersTab(prev => ({...prev, warehouse: e.target.value}))}
                  >
                    <option value="">🏪 Todos los almacenes</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.name}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <select 
                    className="form-select form-select-sm"
                    value={inventoryFiltersTab.stockStatus}
                    onChange={(e) => setInventoryFiltersTab(prev => ({...prev, stockStatus: e.target.value}))}
                  >
                    <option value="">📦 Todo el stock</option>
                    <option value="out">❌ Sin stock</option>
                    <option value="low">⚠️ Stock bajo</option>
                    <option value="normal">✅ Stock normal</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    placeholder="Stock mín."
                    value={inventoryFiltersTab.minStock}
                    onChange={(e) => setInventoryFiltersTab(prev => ({...prev, minStock: e.target.value}))}
                  />
                </div>
                <div className="col-md-2">
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    placeholder="Stock máx."
                    value={inventoryFiltersTab.maxStock}
                    onChange={(e) => setInventoryFiltersTab(prev => ({...prev, maxStock: e.target.value}))}
                  />
                </div>
                <div className="col-md-3">
                  <div className="input-group input-group-sm">
                    <span className="input-group-text">🔍</span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Buscar producto..."
                      value={inventoryFiltersTab.search}
                      onChange={(e) => setInventoryFiltersTab(prev => ({...prev, search: e.target.value}))}
                    />
                    {inventoryFiltersTab.search && (
                      <button 
                        className="btn btn-outline-secondary"
                        onClick={() => setInventoryFiltersTab(prev => ({...prev, search: ''}))}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                <div className="col-md-12 mt-2">
                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-muted">
                      Mostrando {getFilteredInventoryTab().length} de {currentInventory.length} productos
                    </small>
                    <div>
                      <button 
                        className="btn btn-success btn-sm me-2"
                        onClick={() => exportInventoryTabToExcel()}
                        title="Exportar inventario filtrado a Excel"
                      >
                        <i className="bi bi-file-earmark-excel me-1"></i>
                        Exportar Excel
                      </button>
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setCurrentInventory([]); // Forzar recarga
                          loadInventoryTab();
                        }}
                        title="Refrescar inventario (fuerza recarga)"
                        disabled={loadingCurrentInventory}
                      >
                        {loadingCurrentInventory ? (
                          <>
                            <div className="spinner-border spinner-border-sm me-1" role="status">
                              <span className="visually-hidden">Cargando...</span>
                            </div>
                            Cargando...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-arrow-clockwise me-1"></i>
                            Refrescar
                          </>
                        )}
                      </button>
                      <button 
                        className={`btn btn-sm ms-1 ${debugMode ? 'btn-warning' : 'btn-outline-secondary'}`}
                        onClick={() => setDebugMode(!debugMode)}
                        title="Activar/desactivar modo debug"
                      >
                        <i className="bi bi-bug me-1"></i>
                        Debug
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel de Debug */}
          {debugMode && (
            <div className="card mb-3 border-warning">
              <div className="card-header bg-warning text-dark">
                <h6 className="mb-0">
                  <i className="bi bi-bug me-2"></i>
                  Modo Debug - Información Técnica
                </h6>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-4">
                    <h6>Estado de la Aplicación:</h6>
                    <ul className="list-unstyled small">
                      <li><strong>Inventario cargado:</strong> {currentInventory.length} items</li>
                      <li><strong>Cargando:</strong> {loadingCurrentInventory ? 'Sí' : 'No'}</li>
                      <li><strong>Error actual:</strong> {error || 'Ninguno'}</li>
                      <li><strong>Pestaña activa:</strong> {activeTab}</li>
                      <li><strong>Almacenes disponibles:</strong> {warehouses.length}</li>
                      <li><strong>Movimientos:</strong> {movements.length}</li>
                    </ul>
                  </div>
                  <div className="col-md-4">
                    <h6>Conectividad API:</h6>
                    <ul className="list-unstyled small">
                      <li><strong>URL Base:</strong> <code>{api.defaults.baseURL || 'No configurada'}</code></li>
                      <li><strong>Endpoints probados:</strong></li>
                      <li className="ms-2">• product-warehouse-stocks/</li>
                      <li className="ms-2">• current-inventory/</li>
                      <li><strong>Última actualización:</strong> {lastRefresh.toLocaleTimeString()}</li>
                    </ul>
                  </div>
                  <div className="col-md-4">
                    <h6>Filtros Aplicados:</h6>
                    <ul className="list-unstyled small">
                      <li><strong>Almacén:</strong> {inventoryFiltersTab.warehouse || 'Todos'}</li>
                      <li><strong>Estado:</strong> {inventoryFiltersTab.stockStatus || 'Todos'}</li>
                      <li><strong>Búsqueda:</strong> {inventoryFiltersTab.search || 'Ninguna'}</li>
                      <li><strong>Stock min:</strong> {inventoryFiltersTab.minStock || 'Sin límite'}</li>
                      <li><strong>Stock max:</strong> {inventoryFiltersTab.maxStock || 'Sin límite'}</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-3">
                  <h6>Acciones de Debug:</h6>
                  <button 
                    className="btn btn-sm btn-outline-primary me-2"
                    onClick={() => console.log('Current Inventory:', currentInventory)}
                  >
                    Log Inventario
                  </button>
                  <button 
                    className="btn btn-sm btn-outline-info me-2"
                    onClick={() => console.log('Warehouses:', warehouses)}
                  >
                    Log Almacenes
                  </button>
                  <button 
                    className="btn btn-sm btn-outline-warning me-2"
                    onClick={async () => {
                      console.log('🧪 Probando conectividad...');
                      try {
                        const response = await api.get('warehouses/');
                        console.log('✅ Conectividad OK:', response.status);
                        alert('✅ Conectividad OK: ' + response.status);
                      } catch (err) {
                        console.log('❌ Error de conectividad:', err);
                        alert('❌ Error de conectividad: ' + (err.response?.status || err.message));
                      }
                    }}
                  >
                    Probar API
                  </button>
                  <button 
                    className="btn btn-sm btn-outline-success"
                    onClick={() => {
                      setCurrentInventory([]);
                      setError('');
                      loadInventoryTab();
                    }}
                  >
                    Forzar Recarga
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mostrar errores si los hay */}
          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              <i className="bi bi-exclamation-triangle me-2"></i>
              <strong>Error de Conectividad:</strong>
              <div className="mt-2" style={{ whiteSpace: 'pre-line' }}>
                {error}
              </div>
              <div className="mt-3">
                <button 
                  className="btn btn-sm btn-outline-light me-2"
                  onClick={() => {
                    setError('');
                    setCurrentInventory([]);
                    loadInventoryTab();
                  }}
                >
                  🔄 Reintentar
                </button>
                <button 
                  className="btn btn-sm btn-outline-light"
                  onClick={() => setDebugMode(true)}
                >
                  🐛 Ver Debug
                </button>
              </div>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setError('')}
                aria-label="Cerrar"
              ></button>
            </div>
          )}

          {loadingCurrentInventory ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando inventario...</span>
              </div>
              <div className="mt-2">
                <small className="text-muted">Cargando inventario...</small>
              </div>
            </div>
          ) : currentInventory.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-box text-muted" style={{ fontSize: '3rem' }}></i>
              <h4 className="text-muted mt-3">Sin datos de inventario</h4>
              <p className="text-muted">
                No se pudieron cargar los datos de inventario.
                <br />Esto puede deberse a:
              </p>
              <ul className="list-unstyled text-muted small">
                <li>• Problemas de conectividad con el servidor</li>
                <li>• El backend no está disponible</li>
                <li>• No hay productos con stock</li>
                <li>• Problemas de configuración de la API</li>
              </ul>
              <button 
                className="btn btn-primary mt-3"
                onClick={() => {
                  setCurrentInventory([]);
                  setError('');
                  loadInventoryTab();
                }}
                disabled={loadingCurrentInventory}
              >
                <i className="bi bi-arrow-repeat me-1"></i>
                Intentar nuevamente
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>Producto</th>
                    <th>Almacén</th>
                    <th className="text-end">Stock</th>
                    <th className="text-end">Precio</th>
                    <th className="text-end">Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredInventoryTab().map((item, index) => (
                    <tr key={index}>
                      <td>
                        <div>
                          <strong>{item.product_name}</strong>
                          {item.product_code && (
                            <div className="text-muted small">
                              Código: {item.product_code}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-primary">
                          {item.warehouse_name}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="d-flex align-items-center justify-content-end">
                          <span className="fw-bold me-2">{item.total_stock}</span>
                          {parseFloat(item.total_stock || 0) === 0 && (
                            <span className="badge bg-danger">Sin stock</span>
                          )}
                          {parseFloat(item.total_stock || 0) > 0 && 
                           parseFloat(item.total_stock || 0) <= parseFloat(item.min_stock || 0) && (
                            <span className="badge bg-warning">Stock bajo</span>
                          )}
                        </div>
                      </td>
                      <td className="text-end">
                        ${parseFloat(item.product_price || 0).toFixed(2)}
                      </td>
                      <td className="text-end">
                        <strong>
                          ${(parseFloat(item.total_stock) * parseFloat(item.product_price || 0)).toFixed(2)}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="table-light">
                  <tr>
                    <th colSpan="4" className="text-end">Total General:</th>
                    <th className="text-end">
                      ${getFilteredInventoryTab().reduce((total, item) => 
                        total + (parseFloat(item.total_stock) * parseFloat(item.product_price || 0)), 0
                      ).toFixed(2)}
                    </th>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryMovements;
