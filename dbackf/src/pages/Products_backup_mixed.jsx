
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import useDocumentTitle from '../hooks/useDocumentTitle';

// Hook personalizado para debounce
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

function Products() {
  // Hook para cambiar el título de la pestaña
  useDocumentTitle('Productos - Maestro Inventario');
  const navigate = useNavigate();

  // Estados principales
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Paginación
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false
  });

  // Búsqueda y filtros
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  
  const [filters, setFilters] = useState({
    brand: '',
    category: '',
    isActive: 'all' // 'all', 'true', 'false'
  });

  // Ordenamiento
  const [sortConfig, setSortConfig] = useState({
    key: 'updated_at',
    direction: 'desc'
  });

  // Vista y estados UI
  const [viewMode, setViewMode] = useState('table');

  // Catálogos (cache)
  const [catalogs, setCatalogs] = useState({
    brands: [],
    categories: [],
    warehouses: []
  });

  // Estadísticas
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    filtered: 0
  });
  
  // Función principal para obtener productos con paginación
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        page_size: pagination.pageSize.toString(),
        ordering: sortConfig.direction === 'desc' ? `-${sortConfig.key}` : sortConfig.key
      });

      // Agregar búsqueda si existe
      if (debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim());
      }

      // Agregar filtros
      if (filters.brand) params.append('brand', filters.brand);
      if (filters.category) params.append('category', filters.category);
      if (filters.isActive !== 'all') params.append('is_active', filters.isActive);

      console.log('Fetching products with params:', params.toString());

      const response = await api.get(`/products/?${params.toString()}`);
      
      // Manejo de respuesta paginada
      const data = response.data;
      const results = data.results || data.items || data || [];
      
      setProducts(results);
      setPagination(prev => ({
        ...prev,
        total: data.count || data.total || results.length,
        totalPages: Math.ceil((data.count || data.total || results.length) / prev.pageSize),
        hasNext: !!data.next,
        hasPrevious: !!data.previous
      }));

      // Actualizar estadísticas
      setStats(prev => ({
        ...prev,
        filtered: data.count || data.total || results.length
      }));

    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Error al cargar los productos. Usando datos de ejemplo.');
      
      // Fallback a datos de ejemplo en caso de error
      const mockProducts = getMockProducts();
      setProducts(mockProducts);
      setPagination(prev => ({ 
        ...prev, 
        total: mockProducts.length, 
        totalPages: Math.ceil(mockProducts.length / prev.pageSize),
        hasNext: false,
        hasPrevious: false
      }));
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, debouncedSearch, filters, sortConfig]);

  // Función para obtener catálogos (cache)
  const fetchCatalogs = useCallback(async () => {
    try {
      const [brandsRes, categoriesRes, warehousesRes] = await Promise.all([
        api.get('/brands/').catch(() => ({ data: [] })),
        api.get('/categories/').catch(() => ({ data: [] })),
        api.get('/warehouses/').catch(() => ({ data: [] }))
      ]);

      setCatalogs({
        brands: brandsRes.data.results || brandsRes.data || getMockBrands(),
        categories: categoriesRes.data.results || categoriesRes.data || getMockCategories(),
        warehouses: warehousesRes.data.results || warehousesRes.data || getMockWarehouses()
      });
    } catch (error) {
      console.error('Error fetching catalogs:', error);
      setCatalogs({
        brands: getMockBrands(),
        categories: getMockCategories(),
        warehouses: getMockWarehouses()
      });
    }
  }, []);

  // Función para obtener estadísticas generales
  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/products/stats/');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({ total: 2600, active: 2580, filtered: pagination.total });
    }
  }, [pagination.total]);

  // Efectos
  useEffect(() => {
    fetchCatalogs();
    fetchStats();
  }, [fetchCatalogs, fetchStats]);

  useEffect(() => {
    // Reset página cuando cambian filtros o búsqueda
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [debouncedSearch, filters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handlers de paginación
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newPageSize) => {
    setPagination(prev => ({ 
      ...prev, 
      pageSize: parseInt(newPageSize),
      page: 1 
    }));
  };

  // Handlers de filtros
  const handleSearchChange = (value) => {
    setSearch(value);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  const clearFilters = () => {
    setSearch('');
    setFilters({ brand: '', category: '', isActive: 'all' });
    setSortConfig({ key: 'updated_at', direction: 'desc' });
  };

  // Handlers de ordenamiento
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Handlers de acciones
  const handleEdit = (product) => {
    navigate(`/products/${product.id}/edit`);
  };

  const handleInventoryConsultation = (product) => {
    navigate('/inventory-consultation', {
      state: { selectedProduct: product }
    });
  };

  const handleDiscounts = (product) => {
    navigate(`/products/${product.id}/discounts`);
  };

  // Componente de paginación
  const PaginationComponent = () => (
    <div className="d-flex justify-content-between align-items-center mt-4">
      <div className="d-flex align-items-center">
        <span className="text-muted me-3">
          Mostrando {((pagination.page - 1) * pagination.pageSize) + 1} - {Math.min(pagination.page * pagination.pageSize, pagination.total)} de {pagination.total} productos
        </span>
        
        <select 
          className="form-select form-select-sm" 
          style={{ width: 'auto' }}
          value={pagination.pageSize}
          onChange={(e) => handlePageSizeChange(e.target.value)}
        >
          <option value={10}>10 por página</option>
          <option value={25}>25 por página</option>
          <option value={50}>50 por página</option>
          <option value={100}>100 por página</option>
        </select>
      </div>

      <nav>
        <ul className="pagination pagination-sm mb-0">
          <li className={`page-item ${!pagination.hasPrevious ? 'disabled' : ''}`}>
            <button 
              className="page-link" 
              onClick={() => handlePageChange(1)}
              disabled={!pagination.hasPrevious}
            >
              ‹‹
            </button>
          </li>
          <li className={`page-item ${!pagination.hasPrevious ? 'disabled' : ''}`}>
            <button 
              className="page-link" 
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrevious}
            >
              ‹
            </button>
          </li>
          
          {/* Páginas numeradas */}
          {[...Array(Math.min(5, pagination.totalPages))].map((_, index) => {
            const pageNumber = Math.max(1, pagination.page - 2) + index;
            if (pageNumber <= pagination.totalPages) {
              return (
                <li key={pageNumber} className={`page-item ${pagination.page === pageNumber ? 'active' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => handlePageChange(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                </li>
              );
            }
            return null;
          })}
          
          <li className={`page-item ${!pagination.hasNext ? 'disabled' : ''}`}>
            <button 
              className="page-link" 
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
            >
              ›
            </button>
          </li>
          <li className={`page-item ${!pagination.hasNext ? 'disabled' : ''}`}>
            <button 
              className="page-link" 
              onClick={() => handlePageChange(pagination.totalPages)}
              disabled={!pagination.hasNext}
            >
              ››
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );

  // Componente de filtros avanzados
  const FiltersComponent = () => (
    <div className="card mb-4">
      <div className="card-body">
        <div className="row g-3">
          {/* Búsqueda principal */}
          <div className="col-md-4">
            <label className="form-label fw-bold">
              <i className="bi bi-search me-1"></i>
              Buscar Productos
            </label>
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por nombre, SKU o código..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              {search && (
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => handleSearchChange('')}
                >
                  <i className="bi bi-x"></i>
                </button>
              )}
            </div>
            {debouncedSearch !== search && (
              <small className="text-muted">
                <i className="bi bi-clock me-1"></i>
                Buscando...
              </small>
            )}
          </div>

          {/* Filtro por marca */}
          <div className="col-md-2">
            <label className="form-label fw-bold">
              <i className="bi bi-tag me-1"></i>
              Marca
            </label>
            <select
              className="form-select"
              value={filters.brand}
              onChange={(e) => handleFilterChange('brand', e.target.value)}
            >
              <option value="">Todas las marcas</option>
              {catalogs.brands.map(brand => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por categoría */}
          <div className="col-md-2">
            <label className="form-label fw-bold">
              <i className="bi bi-grid me-1"></i>
              Categoría
            </label>
            <select
              className="form-select"
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {catalogs.categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por estado */}
          <div className="col-md-2">
            <label className="form-label fw-bold">
              <i className="bi bi-toggle-on me-1"></i>
              Estado
            </label>
            <select
              className="form-select"
              value={filters.isActive}
              onChange={(e) => handleFilterChange('isActive', e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>

          {/* Botones de acción */}
          <div className="col-md-2">
            <label className="form-label fw-bold text-transparent">Acciones</label>
            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-secondary flex-fill"
                onClick={clearFilters}
                disabled={!search && !filters.brand && !filters.category && filters.isActive === 'all'}
              >
                <i className="bi bi-x-circle me-1"></i>
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* Indicadores de filtros activos */}
        {(search || filters.brand || filters.category || filters.isActive !== 'all') && (
          <div className="mt-3 pt-3 border-top">
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <small className="text-muted fw-bold">Filtros activos:</small>
              
              {search && (
                <span className="badge bg-primary">
                  Búsqueda: "{search}"
                  <button
                    className="btn-close btn-close-white ms-1"
                    style={{ fontSize: '0.6em' }}
                    onClick={() => handleSearchChange('')}
                  ></button>
                </span>
              )}
              
              {filters.brand && (
                <span className="badge bg-info">
                  Marca: {catalogs.brands.find(b => b.id == filters.brand)?.name}
                  <button
                    className="btn-close btn-close-white ms-1"
                    style={{ fontSize: '0.6em' }}
                    onClick={() => handleFilterChange('brand', '')}
                  ></button>
                </span>
              )}
              
              {filters.category && (
                <span className="badge bg-warning">
                  Categoría: {catalogs.categories.find(c => c.id == filters.category)?.name}
                  <button
                    className="btn-close btn-close-white ms-1"
                    style={{ fontSize: '0.6em' }}
                    onClick={() => handleFilterChange('category', '')}
                  ></button>
                </span>
              )}
              
              {filters.isActive !== 'all' && (
                <span className="badge bg-success">
                  Estado: {filters.isActive === 'true' ? 'Activos' : 'Inactivos'}
                  <button
                    className="btn-close btn-close-white ms-1"
                    style={{ fontSize: '0.6em' }}
                    onClick={() => handleFilterChange('isActive', 'all')}
                  ></button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Componente de skeleton loader
  const SkeletonLoader = () => (
    <div className="table-responsive">
      <table className="table table-hover">
        <thead>
          <tr>
            {Array.from({ length: 8 }).map((_, i) => (
              <th key={i}>
                <div className="placeholder-glow">
                  <span className="placeholder col-8"></span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: pagination.pageSize }).map((_, i) => (
            <tr key={i}>
              {Array.from({ length: 8 }).map((_, j) => (
                <td key={j}>
                  <div className="placeholder-glow">
                    <span className="placeholder col-10"></span>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Componente de fila de producto optimizada
  const ProductRow = React.memo(({ product, onEdit, onInventory, onDiscounts }) => (
    <tr>
      <td>
        <div className="d-flex align-items-center">
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.name} 
              className="rounded me-2"
              style={{ width: '32px', height: '32px', objectFit: 'cover' }}
              loading="lazy"
            />
          ) : (
            <div 
              className="bg-light rounded d-flex align-items-center justify-content-center me-2"
              style={{ width: '32px', height: '32px' }}
            >
              <i className="bi bi-image text-muted"></i>
            </div>
          )}
          <div>
            <div className="fw-medium text-truncate" style={{ maxWidth: '150px' }}>
              {product.name}
            </div>
            {product.description && (
              <small className="text-muted text-truncate d-block" style={{ maxWidth: '150px' }}>
                {product.description}
              </small>
            )}
          </div>
        </div>
      </td>
      <td>
        <code className="bg-light px-2 py-1 rounded small">
          {product.sku || 'N/A'}
        </code>
      </td>
      <td>
        <span className="badge bg-secondary">
          {product.brand?.name || product.brand_name || 'Sin marca'}
        </span>
      </td>
      <td>
        <span className="badge bg-info">
          {product.category?.name || product.category_name || 'Sin categoría'}
        </span>
      </td>
      <td>
        {product.barcode ? (
          <code className="small">{product.barcode}</code>
        ) : (
          <span className="text-muted">-</span>
        )}
      </td>
      <td className="text-center">
        {product.minimum_stock || '-'}
      </td>
      <td className="text-center">
        {product.maximum_stock || '-'}
      </td>
      <td className="text-center">
        <span className={`badge ${product.is_active ? 'bg-success' : 'bg-danger'}`}>
          {product.is_active ? 'ACTIVO' : 'INACTIVO'}
        </span>
      </td>
      <td className="text-center">
        <span className={`fw-bold ${(product.total_stock || 0) > 0 ? 'text-success' : 'text-warning'}`}>
          {product.total_stock || 0}
        </span>
      </td>
      <td>
        <div className="btn-group btn-group-sm">
          <button
            className="btn btn-outline-primary"
            onClick={() => onEdit(product)}
            title="Editar producto"
          >
            <i className="bi bi-pencil"></i>
          </button>
          <button
            className="btn btn-outline-success"
            onClick={() => onInventory(product)}
            title="Consulta de inventario"
          >
            <i className="bi bi-graph-up"></i>
          </button>
          <button
            className="btn btn-outline-warning"
            onClick={() => onDiscounts(product)}
            title="Gestionar descuentos"
          >
            <i className="bi bi-percent"></i>
          </button>
        </div>
      </td>
    </tr>
  ));

  // Componente de tabla optimizada
  const ProductTable = () => (
    <div className="table-responsive">
      <table className="table table-hover table-sm">
        <thead className="table-light sticky-top">
          <tr>
            <th style={{ width: '200px' }}>
              <button
                className="btn btn-sm btn-ghost d-flex align-items-center"
                onClick={() => handleSort('name')}
              >
                Nombre
                {sortConfig.key === 'name' && (
                  <i className={`bi bi-chevron-${sortConfig.direction === 'asc' ? 'up' : 'down'} ms-1`}></i>
                )}
              </button>
            </th>
            <th style={{ width: '120px' }}>
              <button
                className="btn btn-sm btn-ghost d-flex align-items-center"
                onClick={() => handleSort('sku')}
              >
                SKU
                {sortConfig.key === 'sku' && (
                  <i className={`bi bi-chevron-${sortConfig.direction === 'asc' ? 'up' : 'down'} ms-1`}></i>
                )}
              </button>
            </th>
            <th style={{ width: '100px' }}>Marca</th>
            <th style={{ width: '120px' }}>Categoría</th>
            <th style={{ width: '120px' }}>Código Barras</th>
            <th style={{ width: '80px' }} className="text-center">Stock Min</th>
            <th style={{ width: '80px' }} className="text-center">Stock Max</th>
            <th style={{ width: '80px' }} className="text-center">Estado</th>
            <th style={{ width: '100px' }} className="text-center">Stock Total</th>
            <th style={{ width: '120px' }} className="text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <ProductRow 
              key={product.id} 
              product={product}
              onEdit={handleEdit}
              onInventory={handleInventoryConsultation}
              onDiscounts={handleDiscounts}
            />
          ))}
        </tbody>
      </table>

      {products.length === 0 && !loading && (
        <div className="text-center py-5">
          <i className="bi bi-inbox display-1 text-muted"></i>
          <h5 className="text-muted mt-3">No se encontraron productos</h5>
          <p className="text-muted">
            {search || filters.brand || filters.category || filters.isActive !== 'all' 
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'No hay productos registrados en el sistema'
            }
          </p>
          {(search || filters.brand || filters.category || filters.isActive !== 'all') && (
            <button className="btn btn-outline-primary" onClick={clearFilters}>
              <i className="bi bi-arrow-clockwise me-2"></i>
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );

  // Render principal del componente
  return (
    <div className="container-fluid py-4">
      {/* Header con título y estadísticas */}
      <div className="row mb-4">
        <div className="col-md-8">
          <div className="d-flex align-items-center mb-3">
            <i className="bi bi-box-seam display-6 text-primary me-3"></i>
            <div>
              <h1 className="h3 mb-1">Productos</h1>
              <p className="text-muted mb-0">Gestión completa del catálogo de productos</p>
            </div>
          </div>
        </div>
        <div className="col-md-4 text-end">
          <div className="btn-group mb-3">
            <button
              className="btn btn-outline-success"
              onClick={() => navigate('/inventory-consultation')}
              title="Ir a consulta avanzada de inventario"
            >
              <i className="bi bi-search me-2"></i>
              Consulta Inventario
            </button>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/products/new')}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Nuevo Producto
            </button>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="mb-1">{stats.total.toLocaleString()}</h2>
                  <p className="mb-0">Total</p>
                </div>
                <i className="bi bi-boxes display-6 opacity-75"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card bg-success text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="mb-1">{stats.active.toLocaleString()}</h2>
                  <p className="mb-0">Activos</p>
                </div>
                <i className="bi bi-check-circle display-6 opacity-75"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card bg-info text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="mb-1">{pagination.total.toLocaleString()}</h2>
                  <p className="mb-0">Filtrados</p>
                </div>
                <i className="bi bi-funnel display-6 opacity-75"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <FiltersComponent />

      {/* Error state */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <div>
            <strong>Error:</strong> {error}
            <button 
              className="btn btn-sm btn-outline-danger ms-3"
              onClick={fetchProducts}
            >
              <i className="bi bi-arrow-clockwise me-1"></i>
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Controles de vista */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-3">
          <div className="btn-group btn-group-sm">
            <button
              className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setViewMode('table')}
            >
              <i className="bi bi-table me-1"></i>
              Tabla
            </button>
            <button
              className={`btn ${viewMode === 'cards' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setViewMode('cards')}
            >
              <i className="bi bi-grid-3x3-gap me-1"></i>
              Tarjetas
            </button>
          </div>

          {loading && (
            <div className="d-flex align-items-center text-muted">
              <div className="spinner-border spinner-border-sm me-2"></div>
              <small>Cargando productos...</small>
            </div>
          )}
        </div>

        <div className="text-muted small">
          {!loading && (
            <>
              Página {pagination.page} de {pagination.totalPages}
              {pagination.total > 0 && (
                <> • {pagination.total} producto{pagination.total !== 1 ? 's' : ''} total{pagination.total !== 1 ? 'es' : ''}</>
              )}
            </>
          )}
        </div>
      </div>

      {/* Contenido principal */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <SkeletonLoader />
          ) : (
            <ProductTable />
          )}
        </div>
      </div>

      {/* Paginación */}
      {!loading && products.length > 0 && <PaginationComponent />}
    </div>
  );
}

// Datos mock para desarrollo
const getMockProducts = () => [
  {
    id: 1,
    name: 'ABRUNT 5MG C/10 TABS DESLORATADINA (BRULUART)',
    sku: 'SKU000333',
    brand_name: 'BRULUART',
    category_name: 'ANTIHISTAMINICO',
    barcode: '1234567890123',
    is_active: true,
    minimum_stock: 5,
    maximum_stock: 50,
    total_stock: 25,
    description: 'Antihistamínico para alergias',
    image_url: null
  },
  {
    id: 2,
    name: 'ACC 600MG C/20 TABS EFERVECENTES ACETILCISTEINA (SANDOZ)',
    sku: 'SKU000337',
    brand_name: 'SANDOZ',
    category_name: 'ANTIHISTAMINICO',
    barcode: '2345678901234',
    is_active: true,
    minimum_stock: 10,
    maximum_stock: 100,
    total_stock: 45,
    description: 'Mucolítico para la tos',
    image_url: null
  },
  {
    id: 3,
    name: 'Acetafen 500mg c/12 Tabs Paracetamol (Rayere)',
    sku: 'SKU000339',
    brand_name: 'Rayere',
    category_name: 'ANALGESICO',
    barcode: '3456789012345',
    is_active: true,
    minimum_stock: 15,
    maximum_stock: 75,
    total_stock: 30,
    description: 'Analgésico y antipirético',
    image_url: null
  },
  {
    id: 4,
    name: 'Acetafen 750mg c/12 Tabs Paracetamol (Rayere)',
    sku: 'SKU000343',
    brand_name: 'Rayere',
    category_name: 'ANALGESICO',
    barcode: '4567890123456',
    is_active: true,
    minimum_stock: 20,
    maximum_stock: 80,
    total_stock: 50,
    description: 'Analgésico y antipirético concentrado',
    image_url: null
  },
  {
    id: 5,
    name: 'ACICLOVIR 400MG C/35 TABS (AMSA)',
    sku: 'SKU000356',
    brand_name: 'AMSA',
    category_name: 'ANTIVIRAL',
    barcode: '5678901234567',
    is_active: true,
    minimum_stock: 8,
    maximum_stock: 40,
    total_stock: 12,
    description: 'Antiviral para herpes',
    image_url: null
  }
];

const getMockBrands = () => [
  { id: 1, name: 'BRULUART' },
  { id: 2, name: 'SANDOZ' },
  { id: 3, name: 'Rayere' },
  { id: 4, name: 'AMSA' },
  { id: 5, name: 'ARMSTRONG' },
  { id: 6, name: 'INDIO PAPAGO' }
];

const getMockCategories = () => [
  { id: 1, name: 'ANTIHISTAMINICO' },
  { id: 2, name: 'ANALGESICO' },
  { id: 3, name: 'ANTIVIRAL' },
  { id: 4, name: 'ANTIBIOTICO' },
  { id: 5, name: 'CARDIOVASCULAR' }
];

const getMockWarehouses = () => [
  { id: 1, name: 'Almacén Principal' },
  { id: 2, name: 'Almacén Secundario' },
  { id: 3, name: 'Almacén de Tránsito' }
];

export default Products;
        }
      }
      
      // Buscar en categoría
      let categoryMatch = false;
      if (p.category) {
        if (typeof p.category === 'object') {
          categoryMatch = normalizeText(p.category.name || p.category.description).includes(searchNormalized);
        } else {
          categoryMatch = normalizeText(String(p.category)).includes(searchNormalized);
        }
      }
      
      // Buscar en código de barras
      const barcodeMatch = normalizeText(p.barcode).includes(searchNormalized);
      
      matchesSearch = nameMatch || skuMatch || brandMatch || categoryMatch || barcodeMatch;
    }
    
    // Filtros específicos
    const matchesBrand = !filters.brand || String(typeof p.brand === 'object' ? p.brand?.id : p.brand) === filters.brand;
    const matchesCategory = !filters.category || String(typeof p.category === 'object' ? p.category?.id : p.category) === filters.category;
    const matchesActive = !filters.isActive || (filters.isActive === 'true' ? p.is_active : !p.is_active);
    
    // Filtro por almacén - verificar si el producto tiene stock en el almacén seleccionado
    let matchesWarehouse = true;
    if (filters.warehouse) {
      const productStocks = productWarehouseStocks.filter(stock => stock.product === p.id || stock.product_id === p.id);
      if (productStocks.length > 0) {
        matchesWarehouse = productStocks.some(stock => {
          const warehouseId = typeof stock.warehouse === 'object' ? stock.warehouse.id : stock.warehouse;
          return String(warehouseId) === String(filters.warehouse) && (stock.quantity || 0) > 0;
        });
      } else {
        matchesWarehouse = false; // Si no hay stock registrado, no mostrar en filtro de almacén
      }
    }
    
    // Filtro de estado de stock
    let matchesStock = true;
    if (filters.stockStatus) {
      if (filters.stockStatus === 'low' && p.minimum_stock) {
        matchesStock = (p.minimum_stock || 0) < 10;
      } else if (filters.stockStatus === 'ok') {
        matchesStock = (p.minimum_stock || 0) >= 10;
      }
    }
    
    return matchesSearch && matchesBrand && matchesCategory && matchesActive && matchesWarehouse && matchesStock;
  });

  // Paginación
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const paginatedProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);

  // Auto-ajustar página si está fuera de rango
  React.useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(Math.max(1, totalPages));
    }
  }, [totalPages, page]);

  // Resetear página cuando cambia la búsqueda
  React.useEffect(() => {
    setPage(1);
  }, [search]);

  const handleSelect = e => {
    setSelectedId(e.target.value);
    setFormError('');
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      brand: '',
      category: '',
      warehouse: '',
      isActive: '',
      stockStatus: ''
    });
    setSearch('');
    setPage(1);
  };

  const getActiveFiltersCount = () => {
    return Object.entries(filters).filter(([k, value]) => value !== '').length + (search ? 1 : 0);
  };

  const handleEdit = product => {
    setFormError('');
    setEditId(product.id);
    const editFormData = {
      name: product.name || '',
      sku: product.sku || '',
      description: product.description || '',
      brand: typeof product.brand === 'object' && product.brand !== null ? product.brand.id : product.brand || '',
      category: typeof product.category === 'object' && product.category !== null ? product.category.id : product.category || '',
      barcode: product.barcode || '',
      minimum_stock: product.minimum_stock || '',
      maximum_stock: product.maximum_stock || '',
      cantidad_corrugado: product.cantidad_corrugado || '',
      status: product.status || 'NORMAL',
      is_active: product.is_active ?? true,
      group: product.group || '',
      image_url: product.image_url || ''
    };
    setFormData(editFormData);
    setShowForm(true);
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handleNew = () => {
    setFormError('');
    setEditId(null);
    setFormData({ 
      name: '', 
      sku: '', 
      description: '',
      brand: '', 
      category: '', 
      barcode: '', 
      minimum_stock: '', 
      maximum_stock: '', 
      cantidad_corrugado: '',
      status: 'NORMAL',
      is_active: true, 
      group: '',
      image_url: ''
    });
    setShowForm(true);
  };

  const handleViewInventory = async (product) => {
    setInventoryProduct(product);
    setShowInventoryModal(true);
    setLoadingInventory(true);
    setProductInventory([]);
    
    try {
      console.log('Buscando inventario para producto:', product.id);
      
      // Buscar stock consolidado por almacén
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const stockResponse = await api.get(`product-warehouse-stocks/?product=${product.id}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const stockData = Array.isArray(stockResponse.data) ? 
        stockResponse.data : (stockResponse.data.results || []);
      
      console.log('Stock por almacén encontrado:', stockData);
      
      if (stockData.length > 0) {
        // Agrupar y consolidar el stock por almacén REAL
        const warehouseStockMap = new Map();
        
        stockData.forEach(stock => {
          // Identificar el almacén correctamente
          let warehouseId, warehouseName;
          
          if (stock.warehouse && typeof stock.warehouse === 'object') {
            warehouseId = stock.warehouse.id;
            warehouseName = stock.warehouse.name || stock.warehouse.description || `Almacén ${warehouseId}`;
          } else if (stock.warehouse_id) {
            warehouseId = stock.warehouse_id;
            // Buscar el nombre del almacén en la lista de almacenes
            const warehouse = warehouses.find(w => w.id === warehouseId);
            warehouseName = warehouse ? (warehouse.name || warehouse.description) : `Almacén ${warehouseId}`;
          } else {
            // Si no tiene almacén definido, saltar este registro
            return;
          }
          
          const key = `warehouse_${warehouseId}`;
          
          if (warehouseStockMap.has(key)) {
            // Sumar al stock existente
            const existing = warehouseStockMap.get(key);
            existing.quantity += (stock.quantity || 0);
          } else {
            // Crear nueva entrada
            warehouseStockMap.set(key, {
              warehouse: {
                id: warehouseId,
                name: warehouseName
              },
              warehouse_id: warehouseId,
              quantity: stock.quantity || 0,
              price: stock.price || 0,
              updated_at: stock.updated_at || stock.last_updated,
              lote: stock.batch || stock.lote,
              expiration_date: stock.expiration_date
            });
          }
        });
        
        // Convertir a array y filtrar solo almacenes con stock > 0
        const consolidatedArray = Array.from(warehouseStockMap.values())
          .filter(stock => stock.quantity > 0)
          .sort((a, b) => b.quantity - a.quantity); // Ordenar por cantidad descendente
        
        console.log('Stock consolidado final:', consolidatedArray);
        
        setProductInventory([{
          variant: { 
            id: product.id, 
            name: product.name, 
            sku: product.sku 
          },
          inventory: consolidatedArray
        }]);
        
        return;
      }
      
      // Si no se encuentra stock, mostrar mensaje
      console.log('No se encontró stock para el producto');
      setProductInventory([{
        variant: { 
          id: product.id, 
          name: product.name, 
          sku: product.sku 
        },
        inventory: []
      }]);
      
    } catch (err) {
      console.error('Error al obtener inventario:', err.message);
      setProductInventory([{
        variant: { 
          id: product.id, 
          name: product.name, 
          sku: product.sku 
        },
        inventory: []
      }]);
    } finally {
      setLoadingInventory(false);
    }
  };

  const closeInventoryModal = () => {
    setShowInventoryModal(false);
    setInventoryProduct(null);
    setProductInventory([]);
    setInventoryWarehouseFilter(''); // Limpiar filtro
  };

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const validateForm = () => {
    const errors = [];
    if (!formData.name.trim()) {
      errors.push('El nombre del producto es requerido');
    }
    if (!formData.sku.trim()) {
      errors.push('El SKU es requerido');
    }
    if (!formData.brand) {
      errors.push('La marca es requerida');
    }
    if (!formData.category) {
      errors.push('La categoría es requerida');
    }
    // Validar números positivos
    if (formData.minimum_stock && (isNaN(formData.minimum_stock) || parseFloat(formData.minimum_stock) < 0)) {
      errors.push('Stock mínimo debe ser un número positivo');
    }
    if (formData.maximum_stock && (isNaN(formData.maximum_stock) || parseFloat(formData.maximum_stock) < 0)) {
      errors.push('Stock máximo debe ser un número positivo');
    }
    // Validar cantidad_corrugado
    if (formData.cantidad_corrugado && (isNaN(formData.cantidad_corrugado) || parseFloat(formData.cantidad_corrugado) < 0)) {
      errors.push('Cantidad corrugado debe ser un número positivo');
    }
    // Validar URL de imagen (opcional)
    if (formData.image_url && formData.image_url.trim()) {
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (!urlPattern.test(formData.image_url.trim())) {
        errors.push('URL de imagen no válida');
      }
    }
    // Validar que stock máximo sea mayor que mínimo
    if (formData.minimum_stock && formData.maximum_stock) {
      const minStock = parseFloat(formData.minimum_stock);
      const maxStock = parseFloat(formData.maximum_stock);
      if (maxStock <= minStock) {
        errors.push('Stock máximo debe ser mayor que stock mínimo');
      }
    }
    if (errors.length > 0) {
      setFormError(errors.join('. '));
      return false;
    }
    return true;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setFormError('');
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      // Preparar datos para envío (incluir business dinámico)
      const dataToSend = {
        ...formData,
        minimum_stock: formData.minimum_stock ? Number(formData.minimum_stock) : null,
        maximum_stock: formData.maximum_stock ? Number(formData.maximum_stock) : null,
        cantidad_corrugado: formData.cantidad_corrugado ? Number(formData.cantidad_corrugado) : 0,
        status: formData.status || 'REGULAR',
        group: formData.group ? Number(formData.group) : null,
        brand: Number(formData.brand),
        category: Number(formData.category),
        business: currentBusiness
      };
      
      console.log('Enviando datos del producto:', dataToSend);
      
      let response;
      if (editId) {
        response = await api.put(`products/${editId}/`, dataToSend);
      } else {
        response = await api.post('products/', dataToSend);
      }
      setShowForm(false);
      setEditId(null);
      setFormData({ name: '', sku: '', brand: '', category: '', barcode: '', description: '', image_url: '', minimum_stock: '', maximum_stock: '', cantidad_corrugado: '', status: 'REGULAR', is_active: true, group: '' });
      fetchProducts();
    } catch (err) {
      let errorMessage = 'Error al guardar producto.';
      if (err.response) {
        if (err.response.status === 400) {
          if (err.response.data) {
            if (typeof err.response.data === 'string') {
              errorMessage = err.response.data;
            } else if (typeof err.response.data === 'object') {
              const errors = [];
              Object.entries(err.response.data).forEach(([field, messages]) => {
                if (Array.isArray(messages)) {
                  errors.push(`${field}: ${messages.join(', ')}`);
                } else {
                  errors.push(`${field}: ${messages}`);
                }
              });
              errorMessage = errors.join(' | ');
              
              // Si el error menciona business, agregar contexto
              if (errorMessage.toLowerCase().includes('business')) {
                errorMessage += ' (Nota: Se asignó business automáticamente)';
              }
            }
          }
        } else if (err.response.status === 404) {
          errorMessage = 'Producto no encontrado.';
        } else if (err.response.status === 500) {
          errorMessage = 'Error interno del servidor.';
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      console.error('Error al guardar producto:', err);
      console.error('Datos enviados:', dataToSend);
      setFormError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStockStatus = (product) => {
    if (!product.minimum_stock && !product.maximum_stock) return null;
    
    // Por ahora usamos minimum_stock como referencia de stock actual
    const currentStock = product.minimum_stock || 0;
    const minStock = product.minimum_stock || 0;
    
    if (currentStock === 0) {
      return { status: 'empty', color: 'danger', text: 'Sin stock', icon: '⚠️' };
    } else if (currentStock <= minStock) {
      return { status: 'low', color: 'warning', text: 'Stock bajo', icon: '⚠️' };
    } else {
      return { status: 'ok', color: 'success', text: 'Stock OK', icon: '✅' };
    }
  };

  // Función para obtener información de stock por almacén del producto
  const getProductWarehouseInfo = (productId) => {
    const productStocks = productWarehouseStocks.filter(stock => 
      (stock.product === productId || stock.product_id === productId)
    );
    
    if (productStocks.length === 0) {
      return { totalStock: 0, warehouses: [] };
    }
    
    const totalStock = productStocks.reduce((sum, stock) => sum + (stock.quantity || 0), 0);
    const warehouseInfo = productStocks.map(stock => {
      const warehouse = typeof stock.warehouse === 'object' ? stock.warehouse : 
        warehouses.find(w => w.id === stock.warehouse);
      return {
        name: warehouse?.name || warehouse?.description || `Almacén ${stock.warehouse}`,
        quantity: stock.quantity || 0,
        id: warehouse?.id || stock.warehouse
      };
    }).filter(w => w.quantity > 0);
    
    return { totalStock, warehouses: warehouseInfo };
  };

  const selectedProduct = products.find(p => String(p.id) === String(selectedId));

  // Funciones para gestión de descuentos
  const handleOpenDiscountManager = (product) => {
    setSelectedProductForDiscount(product);
    setShowDiscountManager(true);
  };

  const handleCloseDiscountManager = () => {
    setShowDiscountManager(false);
    setSelectedProductForDiscount(null);
  };

  // Función para obtener badge de status del producto
  const getStatusBadge = (status) => {
    const statusConfig = {
      'NUEVO': { class: 'bg-primary', icon: 'bi-star', text: 'Nuevo' },
      'OFERTA': { class: 'bg-warning', icon: 'bi-tag', text: 'Oferta' },
      'REMATE': { class: 'bg-danger', icon: 'bi-fire', text: 'Remate' }
    };
    
    const config = statusConfig[status] || statusConfig['NUEVO'];
    
    return (
      <span className={`badge ${config.class} ms-1`}>
        <i className={`${config.icon} me-1`}></i>
        {config.text}
      </span>
    );
  };

  // Componente Card para vista móvil
  const ProductCard = ({ product }) => {
    const warehouseInfo = getProductWarehouseInfo(product.id);
    
    let brandDesc = product.brand;
    let categoryDesc = product.category;
    
    if (typeof product.brand === 'number' || typeof product.brand === 'string') {
      const b = brands.find(br => String(br.id) === String(product.brand));
      brandDesc = b ? (b.description || b.name || b.id) : product.brand;
    } else if (typeof product.brand === 'object' && product.brand !== null) {
      brandDesc = product.brand.description || product.brand.name || product.brand;
    }
    
    if (typeof product.category === 'number' || typeof product.category === 'string') {
      const c = categories.find(cat => String(cat.id) === String(product.category));
      categoryDesc = c ? (c.description || c.name || c.id) : product.category;
    } else if (typeof product.category === 'object' && product.category !== null) {
      categoryDesc = product.category.description || product.category.name || product.category;
    }

    return (
      <div className="card mb-3 shadow-sm">
        <div className="card-body">
          {/* Header con nombre y estado */}
          <div className="d-flex justify-content-between align-items-start mb-2">
            <h6 className="card-title mb-0 flex-grow-1 pe-2">
              {product.name}
              {!product.is_active && (
                <span className="badge bg-secondary ms-2 d-block d-sm-inline mt-1 mt-sm-0">Inactivo</span>
              )}
            </h6>
            <span className={`badge ${
              product.status === 'REGULAR' ? 'bg-primary' :
              product.status === 'NUEVO' ? 'bg-success' :
              product.status === 'OFERTA' ? 'bg-warning text-dark' :
              product.status === 'REMATE' ? 'bg-danger' :
              'bg-secondary'
            }`}>
              {product.status || 'REGULAR'}
            </span>
          </div>

          {/* SKU y código de barras */}
          <div className="row g-2 mb-2">
            <div className="col-6">
              <small className="text-muted d-block">SKU</small>
              <code className="bg-light px-2 py-1 rounded small">{product.sku}</code>
            </div>
            <div className="col-6">
              <small className="text-muted d-block">Código</small>
              {product.barcode ? (
                <code className="bg-light px-2 py-1 rounded small">{product.barcode}</code>
              ) : (
                <span className="text-muted">-</span>
              )}
            </div>
          </div>

          {/* Marca y categoría */}
          <div className="row g-2 mb-2">
            <div className="col-6">
              <small className="text-muted d-block">Marca</small>
              <span className="fw-medium">{brandDesc}</span>
            </div>
            <div className="col-6">
              <small className="text-muted d-block">Categoría</small>
              <span className="fw-medium">{categoryDesc}</span>
            </div>
          </div>

          {/* Stock info */}
          <div className="row g-2 mb-3">
            <div className="col-4">
              <small className="text-muted d-block">Stock Min</small>
              <span className="fw-bold">{product.minimum_stock || '-'}</span>
            </div>
            <div className="col-4">
              <small className="text-muted d-block">Stock Max</small>
              <span className="fw-bold">{product.maximum_stock || '-'}</span>
            </div>
            <div className="col-4">
              <small className="text-muted d-block">Total Stock</small>
              <span className={`fw-bold ${warehouseInfo.totalStock > 0 ? 'text-success' : 'text-danger'}`}>
                {warehouseInfo.totalStock}
              </span>
            </div>
          </div>

          {/* Stock por almacén - colapsible */}
          {warehouseInfo.warehouses.length > 0 && (
            <div className="mb-3">
              <button 
                className="btn btn-sm btn-outline-info w-100" 
                type="button" 
                data-bs-toggle="collapse" 
                data-bs-target={`#warehouse-${product.id}`}
              >
                <i className="bi bi-building me-1"></i>
                Ver stock por almacén ({warehouseInfo.warehouses.length})
              </button>
              <div className="collapse mt-2" id={`warehouse-${product.id}`}>
                <div className="card card-body bg-light p-2">
                  {warehouseInfo.warehouses.slice(0, 3).map((wh, idx) => (
                    <div key={idx} className="d-flex justify-content-between">
                      <small>{wh.name}</small>
                      <small className="fw-bold">{wh.quantity}</small>
                    </div>
                  ))}
                  {warehouseInfo.warehouses.length > 3 && (
                    <small className="text-muted text-center d-block">
                      +{warehouseInfo.warehouses.length - 3} almacenes más
                    </small>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Botones de acción - Touch friendly */}
          <div className="d-grid gap-2">
            <div className="row g-2">
              <div className="col-6">
                <button 
                  className="btn btn-primary w-100 py-2"
                  onClick={() => handleEdit(product)}
                >
                  <i className="bi bi-pencil me-1"></i>
                  <span className="d-none d-sm-inline">Editar</span>
                </button>
              </div>
            </div>
            <div className="row g-2">
              <div className="col-6">
                <button 
                  className="btn btn-warning w-100 py-2"
                  onClick={() => setShowDiscountModal({show: true, productId: product.id, productName: product.name})}
                  title="Gestionar descuentos y promociones del producto"
                >
                  <i className="bi bi-tag me-1"></i>
                  <span>Descuentos</span>
                </button>
              </div>
              <div className="col-6">
                <button 
                  className="btn btn-success w-100 py-2"
                  onClick={() => navigate('/inventory-consultation', { state: { selectedProduct: product } })}
                  title="Ver consulta detallada de inventario con Kardex"
                >
                  <i className="bi bi-graph-up me-1"></i>
                  <span>Consulta</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container-fluid py-3">
      {/* Header responsivo */}
      <div className="row align-items-center mb-4">
        <div className="col">
          <h1 className={`mb-0 text-primary ${isMobile ? 'h4' : 'display-6'}`}>
            <i className="bi bi-box-seam me-2"></i>
            Productos
          </h1>
        </div>
        <div className="col-auto">
          <div className="d-flex gap-2">
            <button 
              className={`btn btn-success ${isMobile ? 'btn-lg px-3' : ''}`} 
              onClick={() => navigate('/inventory-consultation')}
              title="Consulta completa de inventario"
            >
              <i className="bi bi-graph-up me-1"></i>
              {isMobile ? 'Consulta' : 'Consulta Inventario'}
            </button>
            <button 
              className={`btn btn-primary ${isMobile ? 'btn-lg px-3' : ''}`} 
              onClick={handleNew}
            >
              <i className="bi bi-plus-circle me-1"></i>
              {isMobile ? 'Nuevo' : 'Nuevo Producto'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats cards responsivos */}
      <div className="row g-2 mb-4">
        <div className="col-4">
          <div className="card bg-primary text-white text-center">
            <div className="card-body py-2">
              <div className={isMobile ? 'h5' : 'h4'}>{products.length}</div>
              <small>Total</small>
            </div>
          </div>
        </div>
        <div className="col-4">
          <div className="card bg-success text-white text-center">
            <div className="card-body py-2">
              <div className={isMobile ? 'h5' : 'h4'}>{products.filter(p => p.is_active).length}</div>
              <small>Activos</small>
            </div>
          </div>
        </div>
        <div className="col-4">
          <div className="card bg-info text-white text-center">
            <div className="card-body py-2">
              <div className={isMobile ? 'h5' : 'h4'}>{filteredProducts.length}</div>
              <small>Filtrados</small>
            </div>
          </div>
        </div>
      </div>
      {/* Barra de búsqueda y controles */}
      <div className="row g-2 mb-3">
        <div className="col">
          <ProductSearch
            onSelect={(product) => {
              if (product) {
                setSearch(product.name + ' ' + product.sku);
              } else {
                setSearch('');
              }
            }}
            placeholder="Buscar productos por nombre, SKU o código..."
            showDetails={false}
            size="md"
          />
        </div>
        <div className="col-auto">
          <button 
            className="btn btn-outline-secondary" 
            onClick={() => setShowFilters(!showFilters)}
          >
            <i className="bi bi-funnel me-1"></i>
            {getActiveFiltersCount() > 0 && (
              <span className="badge bg-primary ms-1">{getActiveFiltersCount()}</span>
            )}
          </button>
        </div>
        {!isMobile && (
          <div className="col-auto">
            <div className="btn-group" role="group">
              <button 
                className={`btn btn-outline-secondary ${getCurrentView() === 'cards' ? 'active' : ''}`}
                onClick={() => setViewMode('cards')}
              >
                <i className="bi bi-grid-3x3-gap"></i>
              </button>
              <button 
                className={`btn btn-outline-secondary ${getCurrentView() === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
              >
                <i className="bi bi-table"></i>
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Filtros colapsibles */}
      {showFilters && (
        <div className="card mb-3">
          <div className="card-body">
            <div className="row g-2">
              <div className={isMobile ? "col-12" : "col-md-3"}>
                <label className="form-label small">Marca</label>
                <select 
                  className="form-select form-select-sm"
                  value={filters.brand}
                  onChange={e => handleFilterChange('brand', e.target.value)}
                >
                  <option value="">Todas</option>
                  {brands
                    .sort((a, b) => {
                      const nameA = (a.description || a.name || a.id).toString().toLowerCase();
                      const nameB = (b.description || b.name || b.id).toString().toLowerCase();
                      return nameA.localeCompare(nameB);
                    })
                    .map(b => (
                      <option key={b.id} value={b.id}>{b.description || b.name || b.id}</option>
                    ))}
                </select>
              </div>
              <div className={isMobile ? "col-12" : "col-md-3"}>
                <label className="form-label small">Categoría</label>
                <select 
                  className="form-select form-select-sm"
                  value={filters.category}
                  onChange={e => handleFilterChange('category', e.target.value)}
                >
                  <option value="">Todas</option>
                  {categories
                    .sort((a, b) => {
                      const nameA = (a.description || a.name || a.id).toString().toLowerCase();
                      const nameB = (b.description || b.name || b.id).toString().toLowerCase();
                      return nameA.localeCompare(nameB);
                    })
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.description || c.name || c.id}</option>
                    ))}
                </select>
              </div>
              <div className={isMobile ? "col-12" : "col-md-3"}>
                <label className="form-label small">Estado</label>
                <select 
                  className="form-select form-select-sm"
                  value={filters.isActive}
                  onChange={e => handleFilterChange('isActive', e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="true">Activos</option>
                  <option value="false">Inactivos</option>
                </select>
              </div>
              <div className={isMobile ? "col-12" : "col-md-3"}>
                <label className="form-label small">&nbsp;</label>
                <button className="btn btn-outline-danger btn-sm d-block w-100" onClick={clearFilters}>
                  <i className="bi bi-x-circle me-1"></i>
                  Limpiar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showForm && (
        <div className={`modal fade show d-block`} tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}} onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className={`modal-dialog ${isMobile ? 'modal-fullscreen' : 'modal-lg modal-dialog-scrollable'}`}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editId ? 'Editar producto' : 'Nuevo producto'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowForm(false)}></button>
              </div>
              <div className="modal-body">
                <form ref={formRef} onSubmit={handleSubmit}>
                  <div className={`row ${isMobile ? 'g-3' : 'g-2'}`}>
                    <div className="col-12">
                      <label className="form-label fw-bold">Nombre del Producto *</label>
                      <input
                        type="text"
                        name="name"
                        className={`form-control ${isMobile ? 'form-control-lg' : ''}`}
                        placeholder="Ingrese el nombre del producto"
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    
                    <div className="col-12">
                      <label className="form-label fw-bold">Código SKU *</label>
                      <input
                        type="text"
                        name="sku"
                        className={`form-control ${isMobile ? 'form-control-lg' : ''}`}
                        placeholder="Código único del producto"
                        value={formData.sku}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    
                    <div className="col-12">
                      <label className="form-label fw-bold">Marca *</label>
                      <select
                        name="brand"
                        className={`form-select ${isMobile ? 'form-select-lg' : ''}`}
                        value={formData.brand}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Selecciona marca</option>
                        {brands
                          .sort((a, b) => {
                            const nameA = (a.description || a.name || a.id).toString().toLowerCase();
                            const nameB = (b.description || b.name || b.id).toString().toLowerCase();
                            return nameA.localeCompare(nameB);
                          })
                          .map(b => (
                            <option key={b.id} value={b.id}>{b.description || b.name || b.id}</option>
                          ))}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold">Categoría *</label>
                      <select
                        name="category"
                        className={`form-select ${isMobile ? 'form-select-lg' : ''}`}
                        value={formData.category}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Selecciona categoría</option>
                        {categories
                          .sort((a, b) => {
                            const nameA = (a.description || a.name || a.id).toString().toLowerCase();
                            const nameB = (b.description || b.name || b.id).toString().toLowerCase();
                            return nameA.localeCompare(nameB);
                          })
                          .map(c => (
                            <option key={c.id} value={c.id}>{c.description || c.name || c.id}</option>
                          ))}
                      </select>
                    </div>
                    
                    <div className="col-12">
                      <label className="form-label fw-bold">Código de Barras</label>
                      <input
                        type="text"
                        name="barcode"
                        className={`form-control ${isMobile ? 'form-control-lg' : ''}`}
                        placeholder="Código de barras del producto"
                        value={formData.barcode}
                        onChange={handleChange}
                      />
                    </div>
                    
                    <div className="col-12">
                      <label className="form-label fw-bold">Descripción</label>
                      <textarea
                        name="description"
                        className={`form-control ${isMobile ? 'form-control-lg' : ''}`}
                        placeholder="Descripción detallada del producto"
                        value={formData.description}
                        onChange={handleChange}
                        rows={isMobile ? "4" : "3"}
                      />
                    </div>
                    
                    <div className="col-12">
                      <label className="form-label fw-bold">URL de Imagen</label>
                      <input
                        type="url"
                        name="image_url"
                        className={`form-control ${isMobile ? 'form-control-lg' : ''}`}
                        placeholder="https://ejemplo.com/imagen.jpg"
                        value={formData.image_url}
                        onChange={handleChange}
                      />
                    </div>
                    
                    <div className={`col-${isMobile ? '12' : '6'}`}>
                      <label className="form-label fw-bold">Stock Mínimo</label>
                      <input
                        type="number"
                        name="minimum_stock"
                        className={`form-control ${isMobile ? 'form-control-lg' : ''}`}
                        placeholder="0"
                        value={formData.minimum_stock}
                        onChange={handleChange}
                        min="0"
                      />
                    </div>
                    <div className={`col-${isMobile ? '12' : '6'}`}>
                      <label className="form-label fw-bold">Stock Máximo</label>
                      <input
                        type="number"
                        name="maximum_stock"
                        className={`form-control ${isMobile ? 'form-control-lg' : ''}`}
                        placeholder="100"
                        value={formData.maximum_stock}
                        onChange={handleChange}
                        min="0"
                      />
                    </div>
                    
                    <div className={`col-${isMobile ? '12' : '6'}`}>
                      <label className="form-label fw-bold">Cantidad Corrugado</label>
                      <input
                        type="number"
                        name="cantidad_corrugado"
                        className={`form-control ${isMobile ? 'form-control-lg' : ''}`}
                        placeholder="0"
                        value={formData.cantidad_corrugado}
                        onChange={handleChange}
                        min="0"
                      />
                    </div>

                    <div className={`col-${isMobile ? '12' : '6'}`}>
                      <label className="form-label fw-bold">Estado del Producto</label>
                      <select
                        name="status"
                        className={`form-select ${isMobile ? 'form-select-lg' : ''}`}
                        value={formData.status}
                        onChange={handleChange}
                      >
                        <option value="REGULAR">🔸 Regular</option>
                        <option value="NUEVO">✨ Nuevo</option>
                        <option value="OFERTA">🔥 Oferta</option>
                        <option value="REMATE">💥 Remate</option>
                      </select>
                    </div>

                    <div className={`col-${isMobile ? '12' : '6'}`}>
                      <label className="form-label fw-bold">Grupo</label>
                      <input
                        type="number"
                        name="group"
                        className={`form-control ${isMobile ? 'form-control-lg' : ''}`}
                        placeholder="Número de grupo"
                        value={formData.group}
                        onChange={handleChange}
                        min="0"
                      />
                    </div>

                    <div className="col-12">
                      <div className={`form-check ${isMobile ? 'form-check-lg' : ''}`}>
                        <input
                          type="checkbox"
                          name="is_active"
                          className="form-check-input"
                          id="is_active"
                          checked={formData.is_active}
                          onChange={handleChange}
                        />
                        <label className="form-check-label fw-bold" htmlFor="is_active">
                          ✅ Producto Activo
                        </label>
                      </div>
                    </div>
                  </div>
                  
          {formError && <div className="alert alert-danger mb-3">{formError}</div>}
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" disabled={isSubmitting} onClick={() => {
                  setShowForm(false);
                  setEditId(null);
                  setFormError('');
                  setFormData({ name: '', sku: '', brand: '', category: '', barcode: '', description: '', image_url: '', minimum_stock: '', maximum_stock: '', cantidad_corrugado: '', status: 'REGULAR', is_active: true, group: '' });
                }}>
                  ✖ Cancelar
                </button>
                <button 
                  type="button"
                  className={`btn ${isMobile ? 'btn-primary btn-lg flex-fill' : 'btn-primary'}`} 
                  disabled={isSubmitting}
                  onClick={() => formRef.current?.requestSubmit()}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      {editId ? 'Actualizando...' : 'Guardando...'}
                    </>
                  ) : (
                    <>
                      💾 {editId ? 'Actualizar' : 'Guardar'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3 text-muted">Cargando productos...</p>
        </div>
      )}
      {!loading && error && (
        <div className="alert alert-danger d-flex align-items-center" role="alert">
          ⚠️ {error}
        </div>
      )}
      {/* Contenido principal */}
      {!loading && !error && (
        <>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-search display-1 text-muted"></i>
              <h5 className="text-muted mt-3">No se encontraron productos</h5>
              <p className="text-muted">
                {search || getActiveFiltersCount() > 0 
                  ? 'Intenta ajustar los criterios de búsqueda'
                  : 'No hay productos registrados aún'
                }
              </p>
              {(search || getActiveFiltersCount() > 0) && (
                <button className="btn btn-outline-primary" onClick={clearFilters}>
                  <i className="bi bi-x-circle me-1"></i>
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Vista Cards (móvil) */}
              {getCurrentView() === 'cards' && (
                <div>
                  {paginatedProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}

              {/* Vista Tabla (desktop) */}
              {getCurrentView() === 'table' && (
                <div className="table-responsive">
                  <table className="table table-hover">
            <thead className="table-primary">
              <tr>
                <th>Nombre</th>
                <th>SKU</th>
                <th>Marca</th>
                <th>Categoría</th>
                {/* <th>Negocio</th> */}
                <th>Código de barras</th>
                <th>Stock mínimo</th>
                <th>Stock máximo</th>
                <th>Corrugado</th>
                <th>Estado</th>
                <th>Stock por Almacén</th>
                <th>Activo</th>
                <th>Grupo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan="13" className="text-center py-4">
                    📪 <p className="text-muted mb-0">No hay productos en esta página</p>
                    <small className="text-muted">Intenta navegar a una página anterior</small>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map(p => {
                // Buscar descripción de marca y categoría por ID
                let brandDesc = p.brand;
                let categoryDesc = p.category;
                if (typeof p.brand === 'number' || typeof p.brand === 'string') {
                  const b = brands.find(br => String(br.id) === String(p.brand));
                  brandDesc = b && typeof b === 'object' ? (b.description || b.name || b.id) : p.brand;
                } else if (typeof p.brand === 'object' && p.brand !== null) {
                  brandDesc = p.brand.description || p.brand.name || p.brand;
                }
                if (typeof p.category === 'number' || typeof p.category === 'string') {
                  const c = categories.find(cat => String(cat.id) === String(p.category));
                  categoryDesc = c && typeof c === 'object' ? (c.description || c.name || c.id) : p.category;
                } else if (typeof p.category === 'object' && p.category !== null) {
                  categoryDesc = p.category.description || p.category.name || p.category;
                }
                const stockStatus = getStockStatus(p);
                const warehouseInfo = getProductWarehouseInfo(p.id);
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="d-flex align-items-center">
                        <span>{p.name}</span>
                        {!p.is_active && (
                          <span className="badge bg-secondary ms-2">Inactivo</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <code className="bg-light px-2 py-1 rounded">{p.sku}</code>
                    </td>
                    <td>{brandDesc}</td>
                    <td>{categoryDesc}</td>
                    {/* <td><span className="badge bg-info">{businessDesc}</span></td> */}
                    <td>
                      {p.barcode ? (
                        <code className="bg-light px-2 py-1 rounded">{p.barcode}</code>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <span>{p.minimum_stock || '-'}</span>
                        {stockStatus && (
                          <span className={`badge bg-${stockStatus.color} ms-2`} title={stockStatus.text}>
                            {stockStatus.icon}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{p.maximum_stock || '-'}</td>
                    <td>
                      {p.cantidad_corrugado ? (
                        <span className="fw-semibold text-primary">
                          {p.cantidad_corrugado.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${
                        p.status === 'REGULAR' ? 'bg-primary' :
                        p.status === 'NUEVO' ? 'bg-success' :
                        p.status === 'OFERTA' ? 'bg-warning text-dark' :
                        p.status === 'REMATE' ? 'bg-danger' :
                        'bg-secondary'
                      }`}>
                        {p.status || 'REGULAR'}
                      </span>
                    </td>
                    <td>
                      <div className="small">
                        {warehouseInfo.warehouses.length > 0 ? (
                          <>
                            <div className="fw-bold text-primary mb-1">
                              Total: {warehouseInfo.totalStock}
                            </div>
                            {warehouseInfo.warehouses.slice(0, 2).map((wh, idx) => (
                              <div key={idx} className="text-muted">
                                {wh.name}: <span className="text-dark">{wh.quantity}</span>
                              </div>
                            ))}
                            {warehouseInfo.warehouses.length > 2 && (
                              <div className="text-muted">
                                +{warehouseInfo.warehouses.length - 2} más...
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-muted">Sin stock</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${p.is_active ? 'bg-success' : 'bg-danger'}`}>
                        {p.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>{p.group || '-'}</td>
                    <td>
                      <div className="btn-group" role="group">
                        <button 
                          className="btn btn-sm btn-outline-primary" 
                          onClick={() => handleEdit(p)}
                          title="Editar producto"
                        >
                          ✏️
                        </button>
                        <button 
                          className="btn btn-sm btn-outline-warning" 
                          title="Gestionar descuentos"
                          onClick={() => setShowDiscountModal({show: true, productId: p.id, productName: p.name})}
                        >
                          💰
                        </button>
                        <button 
                          className="btn btn-sm btn-outline-success" 
                          title="Ver consulta detallada de inventario con Kardex y movimientos"
                          onClick={() => navigate('/inventory-consultation', { state: { selectedProduct: p } })}
                        >
                          📊
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Paginación responsiva */}
      {!loading && !error && filteredProducts.length > 0 && (
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mt-4 gap-2">
          <small className="text-muted">
            Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredProducts.length)} de {filteredProducts.length}
          </small>
          
          <div className="d-flex align-items-center gap-2">
            <button 
              className="btn btn-sm btn-outline-secondary" 
              disabled={page === 1} 
              onClick={() => setPage(page - 1)}
            >
              <i className="bi bi-chevron-left"></i>
            </button>
            
            <span className="px-2">
              {page} / {totalPages}
            </span>
            
            <button 
              className="btn btn-sm btn-outline-secondary" 
              disabled={page === totalPages} 
              onClick={() => setPage(page + 1)}
            >
              <i className="bi bi-chevron-right"></i>
            </button>
          </div>
          
          <select 
            className="form-select form-select-sm" 
            style={{ width: 'auto' }} 
            value={pageSize} 
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      )}
      
      {/* Modal de inventario */}
      {showInventoryModal && inventoryProduct && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  📦 Inventario de {inventoryProduct.name}
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
                    {/* Información del producto */}
                    <div className="card mb-4">
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-6">
                            <h6 className="text-primary mb-2">Información del Producto</h6>
                            <p><strong>Nombre:</strong> {inventoryProduct.name}</p>
                            <p><strong>SKU:</strong> <code>{inventoryProduct.sku}</code></p>
                            <p><strong>Código de barras:</strong> {inventoryProduct.barcode || 'N/A'}</p>
                          </div>
                          <div className="col-md-6">
                            <h6 className="text-success mb-2">Stock Configurado</h6>
                            <p><strong>Stock mínimo:</strong> {inventoryProduct.minimum_stock || 'No definido'}</p>
                            <p><strong>Stock máximo:</strong> {inventoryProduct.maximum_stock || 'No definido'}</p>
                            <p><strong>Estado:</strong> 
                              <span className={`badge ms-2 ${inventoryProduct.is_active ? 'bg-success' : 'bg-danger'}`}>
                                {inventoryProduct.is_active ? 'Activo' : 'Inactivo'}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Inventario por variantes */}
                    {productInventory.length === 0 ? (
                      <div className="alert alert-info">
                        <h6 className="alert-heading">🔍 Sin variantes o inventario</h6>
                        <p className="mb-0">
                          Este producto no tiene variantes creadas o no se encontró inventario asociado.
                          Para tener existencias, primero debes crear variantes del producto y luego registrar movimientos de inventario.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h6 className="mb-0">📋 Stock por Almacén</h6>
                          
                          {/* Filtro por almacén en modal */}
                          <div className="d-flex align-items-center">
                            <label className="form-label me-2 mb-0 small">Filtrar por almacén:</label>
                            <select 
                              className="form-select form-select-sm" 
                              style={{width: 'auto'}}
                              value={inventoryWarehouseFilter}
                              onChange={e => setInventoryWarehouseFilter(e.target.value)}
                            >
                              <option value="">Todos los almacenes</option>
                              {warehouses
                                .filter(w => {
                                  // Solo mostrar almacenes que tienen stock de este producto
                                  return productInventory.some(item => 
                                    item.inventory.some(inv => 
                                      (inv.warehouse?.id === w.id || inv.warehouse_id === w.id) && inv.quantity > 0
                                    )
                                  );
                                })
                                .sort((a, b) => (a.name || a.description).localeCompare(b.name || b.description))
                                .map(w => (
                                  <option key={w.id} value={w.id}>
                                    {w.name || w.description || `Almacén ${w.id}`}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                        
                        {/* Mostrar stock directamente sin agrupación por variantes */}
                        {productInventory.length > 0 && productInventory[0].inventory.length > 0 ? (
                          <div>
                            {/* Filtrar el inventario según el almacén seleccionado */}
                            {(() => {
                              const filteredInventory = inventoryWarehouseFilter 
                                ? productInventory[0].inventory.filter(inv => 
                                    (inv.warehouse?.id === parseInt(inventoryWarehouseFilter)) || 
                                    (inv.warehouse_id === parseInt(inventoryWarehouseFilter))
                                  )
                                : productInventory[0].inventory;
                              
                              if (filteredInventory.length === 0) {
                                return (
                                  <div className="alert alert-warning">
                                    <h6 className="alert-heading">📭 Sin stock en el almacén seleccionado</h6>
                                    <p className="mb-0">Este producto no tiene stock en el almacén seleccionado.</p>
                                  </div>
                                );
                              }
                              
                              return (
                                <div className="table-responsive">
                                  <table className="table table-striped table-hover">
                                    <thead className="table-dark">
                                      <tr>
                                        <th>🏢 Almacén</th>
                                        <th>📦 Cantidad</th>
                                        <th>🏷️ Lote</th>
                                        <th>📅 Vencimiento</th>
                                        <th>💰 Precio</th>
                                        <th>🕐 Actualizado</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {filteredInventory.map((inv, invIndex) => (
                                        <tr key={invIndex}>
                                          <td>
                                            <span className="badge bg-info fs-6">
                                              {inv.warehouse?.name || `Almacén ${inv.warehouse_id}`}
                                            </span>
                                          </td>
                                          <td>
                                            <span className={`fw-bold fs-5 ${inv.quantity > 0 ? 'text-success' : 'text-danger'}`}>
                                              {inv.quantity}
                                            </span>
                                          </td>
                                          <td>
                                            {inv.lote ? (
                                              <code className="bg-light px-2 py-1 rounded">{inv.lote}</code>
                                            ) : (
                                              <span className="text-muted">-</span>
                                            )}
                                          </td>
                                          <td>
                                            {inv.expiration_date ? (
                                              <span className="small">
                                                {new Date(inv.expiration_date).toLocaleDateString()}
                                              </span>
                                            ) : (
                                              <span className="text-muted">-</span>
                                            )}
                                          </td>
                                          <td>
                                            {inv.price ? (
                                              <span className="text-success fw-bold">
                                                ${parseFloat(inv.price).toFixed(2)}
                                              </span>
                                            ) : (
                                              <span className="text-muted">-</span>
                                            )}
                                          </td>
                                          <td>
                                            <small className="text-muted">
                                              {inv.updated_at ? 
                                                new Date(inv.updated_at).toLocaleString() : 
                                                'N/A'
                                              }
                                            </small>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="alert alert-info">
                            <h6 className="alert-heading">📭 Sin stock registrado</h6>
                            <p className="mb-0">
                              Este producto no tiene stock registrado en ningún almacén.
                            </p>
                          </div>
                        )}
                        
                        {/* Resumen total */}
                        <div className="card bg-light">
                          <div className="card-body">
                            <h6 className="text-primary mb-2">
                              📊 Resumen Total
                              {inventoryWarehouseFilter && (
                                <span className="badge bg-primary ms-2 small">Filtrado</span>
                              )}
                            </h6>
                            <div className="row">
                              <div className="col-md-3">
                                <div className="text-center">
                                  <div className="h4 text-primary mb-0">
                                    {(() => {
                                      if (productInventory.length === 0 || !productInventory[0].inventory) return 0;
                                      const inventory = inventoryWarehouseFilter 
                                        ? productInventory[0].inventory.filter(inv => 
                                            (inv.warehouse?.id === parseInt(inventoryWarehouseFilter)) || 
                                            (inv.warehouse_id === parseInt(inventoryWarehouseFilter))
                                          )
                                        : productInventory[0].inventory;
                                      return inventory.reduce((sum, inv) => sum + (inv.quantity || 0), 0);
                                    })()}
                                  </div>
                                  <small className="text-muted">Total en stock</small>
                                </div>
                              </div>
                              <div className="col-md-3">
                                <div className="text-center">
                                  <div className="h4 text-info mb-0">
                                    {(() => {
                                      if (productInventory.length === 0 || !productInventory[0].inventory) return 0;
                                      const inventory = inventoryWarehouseFilter 
                                        ? productInventory[0].inventory.filter(inv => 
                                            (inv.warehouse?.id === parseInt(inventoryWarehouseFilter)) || 
                                            (inv.warehouse_id === parseInt(inventoryWarehouseFilter))
                                          )
                                        : productInventory[0].inventory;
                                      return inventory.length;
                                    })()}
                                  </div>
                                  <small className="text-muted">
                                    {inventoryWarehouseFilter ? 'Almacén seleccionado' : 'Almacenes con stock'}
                                  </small>
                                </div>
                              </div>
                              <div className="col-md-3">
                                <div className="text-center">
                                  <div className="h4 text-success mb-0">
                                    {inventoryWarehouseFilter ? (
                                      warehouses.find(w => w.id === parseInt(inventoryWarehouseFilter))?.name || 'Almacén'
                                    ) : (
                                      productInventory.length > 0 && productInventory[0].inventory ? 
                                        productInventory[0].inventory.length : 0
                                    )}
                                  </div>
                                  <small className="text-muted">
                                    {inventoryWarehouseFilter ? 'Almacén filtrado' : 'Ubicaciones totales'}
                                  </small>
                                </div>
                              </div>
                              <div className="col-md-3">
                                <div className="text-center">
                                  <div className="h4 text-warning mb-0">
                                    ${(() => {
                                      if (productInventory.length === 0 || !productInventory[0].inventory) return '0.00';
                                      const inventory = inventoryWarehouseFilter 
                                        ? productInventory[0].inventory.filter(inv => 
                                            (inv.warehouse?.id === parseInt(inventoryWarehouseFilter)) || 
                                            (inv.warehouse_id === parseInt(inventoryWarehouseFilter))
                                          )
                                        : productInventory[0].inventory;
                                      const total = inventory.reduce((sum, inv) => 
                                        sum + ((inv.quantity || 0) * (inv.price || 0)), 0
                                      );
                                      return total.toFixed(2);
                                    })()}
                                  </div>
                                  <small className="text-muted">Valor total</small>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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

      {/* Modal de Gestión de Descuentos */}
      {showDiscountManager && selectedProductForDiscount && (
        <DiscountManager
          productId={selectedProductForDiscount.id}
          productName={selectedProductForDiscount.name}
          onClose={handleCloseDiscountManager}
        />
      )}

      {/* Modal de Gestión de Descuentos desde tabla */}
      {showDiscountModal.show && (
        <DiscountManager
          productId={showDiscountModal.productId}
          productName={showDiscountModal.productName}
          onClose={() => setShowDiscountModal({show: false, productId: null, productName: ''})}
        />
      )}
    </div>
  );
}

export default Products;
