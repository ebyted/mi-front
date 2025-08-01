import React, { useEffect, useState } from 'react';
import api from '../services/api';
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
  const [inventoryData, setInventoryData] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
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
      } catch (err) {
        console.error('Error en auto-refresh:', err);
      }
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [autoRefresh]);

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
        } else if (showInventoryModal) {
          closeInventoryModal();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [showModal, showInventoryModal]);

  // Obtener movimientos filtrados
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

  // Funciones del modal
  const resetModal = () => {
    setShowModal(false);
    setForm({ warehouse: '', movement_type: '', reference_document: '', notes: '' });
    setModalDetails([{ product_variant: '', quantity: '', price: '', lote: '', expiration_date: '' }]);
    setFormError('');
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
          Movimientos de Inventario
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
        </div>
      </div>

      {/* Ayuda de shortcuts */}
      <div className="alert alert-light border-0 py-2 fade-in">
        <small className="text-muted">
          <i className="bi bi-keyboard me-1"></i>
          <strong>Atajos:</strong> 
          <span className="mx-2">Ctrl+N (Nuevo)</span>
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
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
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
                                            <td>{detail.product_variant?.name || <span className="text-muted">N/A</span>}</td>
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
                        {warehouses.map(w => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
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
                              {productVariants.map(pv => (
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
                          {warehouses.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))}
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
    </div>
  );
};

export default InventoryMovements;
