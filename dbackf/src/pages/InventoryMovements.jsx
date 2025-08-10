import React, { useEffect, useState } from 'react';
import api from '../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const InventoryMovements = () => {
  // Estados principales
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [productVariants, setProductVariants] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados de filtros
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterAuth, setFilterAuth] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  // Estados del modal
  const [showModal, setShowModal] = useState(false);
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

  // Estados para inventario actual (nueva pestaña)
  const [activeTab, setActiveTab] = useState('movements'); // 'movements' o 'inventory'
  const [currentInventory, setCurrentInventory] = useState([]);
  const [loadingCurrentInventory, setLoadingCurrentInventory] = useState(false);
  const [inventoryFiltersTab, setInventoryFiltersTab] = useState({
    warehouse: '',
    search: '',
    stockStatus: '', // 'low', 'normal', 'without'
    minStock: '',
    maxStock: ''
  });

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        console.log('Cargando datos de movimientos...');
        
        // Cargar todos los datos en paralelo
        const [movementsRes, productsRes, variantsRes, warehousesRes] = await Promise.all([
          api.get('inventory-movements/'),
          api.get('products/'),
          api.get('product-variants/'),
          api.get('warehouses/')
        ]);
        
        setMovements(movementsRes.data || []);
        setProducts(Array.isArray(productsRes.data) ? productsRes.data : (productsRes.data.results || []));
        setProductVariants(Array.isArray(variantsRes.data) ? variantsRes.data : (variantsRes.data.results || []));
        setWarehouses(warehousesRes.data || []);
        
        console.log('Datos cargados:', {
          movements: movementsRes.data?.length || 0,
          products: productsRes.data?.length || 0,
          variants: variantsRes.data?.length || 0,
          warehouses: warehousesRes.data?.length || 0
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

  // Obtener movimientos filtrados
  const filteredMovements = movements.filter(m => {
    if (filterWarehouse && String(m.warehouse?.id) !== String(filterWarehouse)) return false;
    if (filterType && m.movement_type !== filterType) return false;
    if (filterAuth && String(m.authorized ? 1 : 0) !== filterAuth) return false;
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
    const data = filteredMovements.map(m => ({
      ID: m.id,
      Almacen: m.warehouse?.name || '-',
      Tipo: m.movement_type,
      Cantidad: m.total_quantity || 0,
      UsuarioCrea: m.user?.email || '-',
      UsuarioAutoriza: m.authorized_by?.email || '-',
      Fecha: m.created_at ? new Date(m.created_at).toLocaleString() : '-',
      Autorizado: m.authorized ? 'Sí' : 'No',
      Referencia: m.reference_document || '-',
      Notas: m.notes || '-'
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
    XLSX.writeFile(wb, 'movimientos_inventario.xlsx');
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
      
      resetModal();
      
    } catch (err) {
      console.error('Error creando movimiento:', err);
      setFormError('Error al crear el movimiento: ' + (err.response?.data?.message || err.message));
    }
  };

  // Autorizar movimiento
  const authorizeMovement = async (id) => {
    if (!window.confirm('¿Autorizar este movimiento?')) return;
    
    try {
      await api.post('authorize-inventory-movement/', { movement_id: id });
      const movementsRes = await api.get('inventory-movements/');
      setMovements(movementsRes.data || []);
    } catch (err) {
      alert('Error al autorizar el movimiento.');
    }
  };

  // Eliminar movimiento
  const deleteMovement = async (id) => {
    if (!window.confirm('¿Eliminar este movimiento?')) return;
    
    try {
      await api.delete(`inventory-movements/${id}/`);
      const movementsRes = await api.get('inventory-movements/');
      setMovements(movementsRes.data || []);
    } catch (err) {
      alert('Error al eliminar el movimiento.');
    }
  };

  // ============ FUNCIONES PARA INVENTARIO ACTUAL ============
  
  // Cargar inventario actual para la pestaña
  const loadInventoryTab = async () => {
    setLoadingCurrentInventory(true);
    setError('');
    
    try {
      console.log('🔄 Cargando inventario actual...');
      
      // Usar directamente el endpoint product-warehouse-stocks que ahora incluye category_name y brand_name
      const stockResponse = await api.get('product-warehouse-stocks/');
      const stocks = Array.isArray(stockResponse.data) ? stockResponse.data : (stockResponse.data?.results || []);
      
      console.log('📊 Datos obtenidos:', { stocks: stocks.length });
      
      if (stocks.length > 0) {
        console.log('🔍 Ejemplo de stock con nuevos campos:', JSON.stringify(stocks[0], null, 2));
      }
      
      // Mapear datos directamente desde el backend (que ahora incluye los campos necesarios)
      const inventoryData = stocks
        .filter(stock => parseFloat(stock.quantity || 0) > 0) // Solo items con stock
        .map(stock => ({
          id: `${stock.product_variant?.id || 'unknown'}-${stock.warehouse?.id || 'unknown'}`,
          product_variant_id: stock.product_variant?.id,
          product_id: stock.product_variant?.product?.id,
          warehouse_id: stock.warehouse?.id,
          
          // Datos del producto/variante
          product_name: stock.product_name || stock.product_variant?.name || 'Sin nombre',
          product_code: stock.product_code || stock.product_variant?.sku || 'Sin SKU',
          variant_name: stock.product_variant?.name || 'Sin variante',
          
          // Categoría y marca - usar los nuevos campos del backend
          category_name: stock.category_name || 'SIN CATEGORÍA',
          brand_name: stock.brand_name || 'SIN MARCA',
          
          // Datos del almacén
          warehouse_name: stock.warehouse_name || stock.warehouse?.name || 'Sin almacén',
          
          // Stock y precios
          total_stock: parseFloat(stock.quantity || 0),
          min_stock: parseFloat(stock.min_stock || stock.min_stock_variant || stock.min_stock_product || 0),
          max_stock: parseFloat(stock.max_stock_product || 100),
          product_price: parseFloat(stock.product_price || stock.product_variant?.sale_price || 0),
          
          // Metadatos
          last_updated: stock.updated_at || stock.last_updated || new Date().toISOString()
        }))
        .sort((a, b) => a.product_name.localeCompare(b.product_name));
      
      console.log(`✅ Inventario procesado: ${inventoryData.length} items`);
      console.log('📋 Primeros 3 items procesados:', inventoryData.slice(0, 3));
      console.log('📊 Categorías encontradas:', [...new Set(inventoryData.map(i => i.category_name))]);
      console.log('📊 Marcas encontradas:', [...new Set(inventoryData.map(i => i.brand_name))]);
      
      setCurrentInventory(inventoryData);
      
    } catch (error) {
      console.error('❌ Error cargando inventario:', error);
      setError(`Error cargando inventario: ${error.message}`);
      setCurrentInventory([]);
    } finally {
      setLoadingCurrentInventory(false);
    }
  };

  // Filtrar inventario para la pestaña
  const getFilteredInventoryTab = () => {
    return currentInventory.filter(item => {
      // Filtro por almacén
      if (inventoryFiltersTab.warehouse && String(item.warehouse_id) !== String(inventoryFiltersTab.warehouse)) {
        return false;
      }
      
      // Filtro por búsqueda
      if (inventoryFiltersTab.search) {
        const searchLower = inventoryFiltersTab.search.toLowerCase();
        const searchableText = [
          item.product_name || '',
          item.product_code || '',
          item.category_name || '',
          item.brand_name || '',
          item.warehouse_name || ''
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchLower)) {
          return false;
        }
      }
      
      // Filtro por estado de stock
      if (inventoryFiltersTab.stockStatus) {
        const stock = parseFloat(item.total_stock || 0);
        const minStock = parseFloat(item.min_stock || 0);
        
        switch (inventoryFiltersTab.stockStatus) {
          case 'without':
            if (stock > 0) return false;
            break;
          case 'low':
            if (stock === 0 || stock > minStock) return false;
            break;
          case 'normal':
            if (stock === 0 || stock <= minStock) return false;
            break;
        }
      }
      
      // Filtro por stock mínimo
      if (inventoryFiltersTab.minStock) {
        const stock = parseFloat(item.total_stock || 0);
        const filterMin = parseFloat(inventoryFiltersTab.minStock);
        if (stock < filterMin) return false;
      }
      
      // Filtro por stock máximo
      if (inventoryFiltersTab.maxStock) {
        const stock = parseFloat(item.total_stock || 0);
        const filterMax = parseFloat(inventoryFiltersTab.maxStock);
        if (stock > filterMax) return false;
      }
      
      return true;
    });
  };

  // Cargar inventario cuando se cambia a la pestaña de inventario
  useEffect(() => {
    if (activeTab === 'inventory' && currentInventory.length === 0) {
      loadInventoryTab();
    }
  }, [activeTab]);

  // Exportar inventario de la pestaña a Excel
  const exportInventoryTabToExcel = () => {
    const filteredInventory = getFilteredInventoryTab();
    const data = filteredInventory.map(item => ({
      Producto: item.product_name || 'N/A',
      Codigo: item.product_code || 'N/A',
      Categoria: item.category_name || 'N/A',
      Marca: item.brand_name || 'N/A',
      Almacen: item.warehouse_name || 'N/A',
      Stock: item.total_stock || 0,
      StockMinimo: item.min_stock || 0,
      StockMaximo: item.max_stock || 0,
      Precio: item.product_price || 0,
      ValorTotal: (parseFloat(item.total_stock || 0) * parseFloat(item.product_price || 0)),
      Estado: parseFloat(item.total_stock || 0) === 0 ? 'Sin Stock' : 
              parseFloat(item.total_stock || 0) <= parseFloat(item.min_stock || 0) ? 'Stock Bajo' : 'Normal'
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario Actual');
    
    XLSX.writeFile(wb, 'inventario_actual.xlsx');
  };

  // ============ FIN FUNCIONES INVENTARIO ACTUAL ============

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
          Gestión de Inventario
        </h2>
        {activeTab === 'movements' && (
          <button 
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            <i className="bi bi-plus-circle me-2"></i>
            Nuevo Movimiento
          </button>
        )}
        {activeTab === 'inventory' && (
          <button 
            className="btn btn-success"
            onClick={exportInventoryTabToExcel}
          >
            <i className="bi bi-download me-2"></i>
            Exportar a Excel
          </button>
        )}
      </div>

      {/* Pestañas */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'movements' ? 'active' : ''}`}
            onClick={() => setActiveTab('movements')}
          >
            <i className="bi bi-arrow-left-right me-2"></i>
            Movimientos
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <i className="bi bi-boxes me-2"></i>
            Inventario Actual
          </button>
        </li>
      </ul>

      {/* Contenido de la pestaña Movimientos */}
      {activeTab === 'movements' && (
        <>
          {/* Info */}
          <div className="alert alert-info">
            <strong>Total:</strong> {movements.length} movimientos | 
            <strong> Filtrados:</strong> {filteredMovements.length} | 
            <strong> Página:</strong> {currentPage} de {totalPages}
          </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
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
            <div className="col-md-5">
              <label className="form-label">Buscar</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Buscar en referencia, notas, usuario..."
                value={filterSearch} 
                onChange={(e) => { setFilterSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>
          <div className="mt-3">
            <button 
              className="btn btn-outline-success me-2" 
              onClick={exportToExcel}
            >
              <i className="bi bi-file-earmark-excel me-1"></i>
              Exportar Excel
            </button>
            {(filterWarehouse || filterType || filterAuth || filterSearch) && (
              <button 
                className="btn btn-outline-secondary"
                onClick={() => {
                  setFilterWarehouse('');
                  setFilterType('');
                  setFilterAuth('');
                  setFilterSearch('');
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
                    <th>Usuario</th>
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
                        <td>{movement.user?.email || 'N/A'}</td>
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
                          <td colSpan="8" className="bg-light">
                            <div className="p-3">
                              <strong>Detalles del movimiento:</strong>
                              <div className="row mt-2">
                                <div className="col-md-6">
                                  <small><strong>Referencia:</strong> {movement.reference_document || 'N/A'}</small>
                                </div>
                                <div className="col-md-6">
                                  <small><strong>Notas:</strong> {movement.notes || 'N/A'}</small>
                                </div>
                              </div>
                              {movement.details && movement.details.length > 0 && (
                                <div className="mt-2">
                                  <small><strong>Productos:</strong></small>
                                  <div className="table-responsive">
                                    <table className="table table-sm mt-1">
                                      <thead>
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
                                            <td>{detail.product_variant?.name || 'N/A'}</td>
                                            <td>{detail.quantity}</td>
                                            <td>${detail.price}</td>
                                            <td>${detail.total}</td>
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
      </>
      )}

      {/* Contenido de la pestaña Inventario Actual */}
      {activeTab === 'inventory' && (
        <>
          {/* Info del inventario */}
          <div className="alert alert-info">
            <strong>Total:</strong> {currentInventory.length} productos | 
            <strong> Filtrados:</strong> {getFilteredInventoryTab().length} |
            <strong> Valor Total:</strong> ${getFilteredInventoryTab().reduce((total, item) => 
              total + (parseFloat(item.total_stock || 0) * parseFloat(item.product_price || 0)), 0
            ).toFixed(2)}
          </div>

          {/* Filtros para inventario */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label">Almacén</label>
                  <select 
                    className="form-select"
                    value={inventoryFiltersTab.warehouse}
                    onChange={(e) => setInventoryFiltersTab({...inventoryFiltersTab, warehouse: e.target.value})}
                  >
                    <option value="">Todos los almacenes</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="col-md-3">
                  <label className="form-label">Estado de Stock</label>
                  <select 
                    className="form-select"
                    value={inventoryFiltersTab.stockStatus}
                    onChange={(e) => setInventoryFiltersTab({...inventoryFiltersTab, stockStatus: e.target.value})}
                  >
                    <option value="">Todos</option>
                    <option value="without">Sin Stock</option>
                    <option value="low">Stock Bajo</option>
                    <option value="normal">Stock Normal</option>
                  </select>
                </div>
                
                <div className="col-md-6">
                  <label className="form-label">Buscar</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="Buscar por producto, código, categoría, marca..."
                    value={inventoryFiltersTab.search}
                    onChange={(e) => setInventoryFiltersTab({...inventoryFiltersTab, search: e.target.value})}
                  />
                </div>
                
                <div className="col-md-3">
                  <label className="form-label">Stock Mínimo</label>
                  <input 
                    type="number" 
                    className="form-control"
                    placeholder="0"
                    value={inventoryFiltersTab.minStock}
                    onChange={(e) => setInventoryFiltersTab({...inventoryFiltersTab, minStock: e.target.value})}
                  />
                </div>
                
                <div className="col-md-3">
                  <label className="form-label">Stock Máximo</label>
                  <input 
                    type="number" 
                    className="form-control"
                    placeholder="∞"
                    value={inventoryFiltersTab.maxStock}
                    onChange={(e) => setInventoryFiltersTab({...inventoryFiltersTab, maxStock: e.target.value})}
                  />
                </div>
                
                <div className="col-md-6 d-flex align-items-end">
                  <button 
                    className="btn btn-warning me-2"
                    onClick={() => setInventoryFiltersTab({
                      warehouse: '', search: '', stockStatus: '', minStock: '', maxStock: ''
                    })}
                  >
                    <i className="bi bi-eraser me-1"></i>
                    Limpiar Filtros
                  </button>
                  <button 
                    className="btn btn-info"
                    onClick={loadInventoryTab}
                    disabled={loadingCurrentInventory}
                  >
                    <i className={`bi ${loadingCurrentInventory ? 'bi-arrow-clockwise spin' : 'bi-arrow-clockwise'} me-1`}></i>
                    Actualizar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de inventario */}
          <div className="card">
            <div className="card-body p-0">
              {loadingCurrentInventory ? (
                <div className="text-center p-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                  <p className="mt-2">Cargando inventario...</p>
                </div>
              ) : getFilteredInventoryTab().length === 0 ? (
                <div className="text-center p-5">
                  <i className="bi bi-box text-muted" style={{ fontSize: '3rem' }}></i>
                  <p className="text-muted mt-2">No hay productos en inventario</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Producto</th>
                        <th>Código</th>
                        <th>Categoría</th>
                        <th>Marca</th>
                        <th>Almacén</th>
                        <th>Stock</th>
                        <th>Stock Mín.</th>
                        <th>Precio</th>
                        <th>Valor Total</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredInventoryTab().map((item, index) => {
                        const stock = parseFloat(item.total_stock || 0);
                        const minStock = parseFloat(item.min_stock || 0);
                        const price = parseFloat(item.product_price || 0);
                        const totalValue = stock * price;
                        
                        let stockStatus = 'normal';
                        let stockClass = 'text-success';
                        if (stock === 0) {
                          stockStatus = 'Sin Stock';
                          stockClass = 'text-danger';
                        } else if (stock <= minStock) {
                          stockStatus = 'Stock Bajo';
                          stockClass = 'text-warning';
                        } else {
                          stockStatus = 'Normal';
                          stockClass = 'text-success';
                        }
                        
                        return (
                          <tr key={item.id}>
                            <td>
                              <div>
                                <strong>{item.product_name}</strong>
                                {item.variant_name && item.variant_name !== item.product_name && (
                                  <div><small className="text-muted">{item.variant_name}</small></div>
                                )}
                              </div>
                            </td>
                            <td>
                              <code>{item.product_code}</code>
                            </td>
                            <td>
                              <span className="badge bg-primary">{item.category_name}</span>
                            </td>
                            <td>
                              <span className="badge bg-info">{item.brand_name}</span>
                            </td>
                            <td>{item.warehouse_name}</td>
                            <td>
                              <strong className={stockClass}>{stock}</strong>
                            </td>
                            <td>
                              <small className="text-muted">{minStock}</small>
                            </td>
                            <td>${price.toFixed(2)}</td>
                            <td>
                              <strong>${totalValue.toFixed(2)}</strong>
                            </td>
                            <td>
                              <span className={`badge bg-${stockStatus === 'Sin Stock' ? 'danger' : stockStatus === 'Stock Bajo' ? 'warning' : 'success'}`}>
                                {stockStatus}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

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
                              {productVariants.filter(pv => pv.is_active).map(pv => (
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
    </div>
  );
};

export default InventoryMovements;
