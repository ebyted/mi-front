import React, { useEffect, useState } from 'react';
import api from '../services/api';
import useDocumentTitle from '../hooks/useDocumentTitle';
import DiscountManager from '../components/DiscountManager';

function Products() {
  // Hook para cambiar el título de la pestaña
  useDocumentTitle('Productos - Maestro Inventario');
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const formRef = React.useRef(null);
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [currentBusiness, setCurrentBusiness] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    sku: '', 
    description: '',
    brand: '', 
    category: '', 
    barcode: '', 
    minimum_stock: '', 
    maximum_stock: '', 
    cantidad_corrugado: '', 
    status: 'REGULAR', 
    is_active: true, 
    group: '',
    image_url: ''
  });
  const [formError, setFormError] = useState('');
  const [editId, setEditId] = useState(null);
  
  // Estados para gestión de descuentos
  const [showDiscountManager, setShowDiscountManager] = useState(false);
  const [selectedProductForDiscount, setSelectedProductForDiscount] = useState(null);
  const [showDiscountModal, setShowDiscountModal] = useState({show: false, productId: null, productName: ''});
  
  // Estados para modal de inventario
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [inventoryProduct, setInventoryProduct] = useState(null);
  const [productInventory, setProductInventory] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [inventoryWarehouseFilter, setInventoryWarehouseFilter] = useState('');
  
  // Estado para stock por almacén de todos los productos
  const [productWarehouseStocks, setProductWarehouseStocks] = useState([]);
  
  // Estados para filtros avanzados
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    brand: '',
    category: '',
    warehouse: '',
    isActive: '',
    stockStatus: ''
  });

  // Estado para vista (cards o tabla)
  const [viewMode, setViewMode] = useState('auto'); // 'cards', 'table', 'auto'
  const [isMobile, setIsMobile] = useState(false);

  // Detectar si es móvil
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Determinar vista actual
  const getCurrentView = () => {
    if (viewMode === 'auto') {
      return isMobile ? 'cards' : 'table';
    }
    return viewMode;
  };

  useEffect(() => {
    fetchProducts();
    fetchCurrentBusiness();
    fetchProductWarehouseStocks();
    api.get('brands/').then(res => setBrands(res.data)).catch(() => setBrands([]));
    api.get('categories/').then(res => setCategories(res.data)).catch(() => setCategories([]));
    api.get('warehouses/').then(res => {
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setWarehouses(data);
    }).catch(() => setWarehouses([]));
  }, []);

  const fetchCurrentBusiness = () => {
    api.get('user/profile/')
      .then(res => {
        if (res.data && res.data.business) {
          setCurrentBusiness(res.data.business);
        }
      })
      .catch(() => {
        api.get('businesses/')
          .then(res => {
            if (res.data && res.data.length > 0) {
              setCurrentBusiness(res.data[0].id);
            }
          })
          .catch(() => {
            console.log('No se pudo obtener el negocio, usando el por defecto');
          });
      });
  };

  const fetchProducts = () => {
    setLoading(true);
    api.get('products/')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setProducts(data);
      })
      .catch(() => {
        setProducts([]);
        setError('No se pudo cargar la lista de productos.');
      })
      .finally(() => setLoading(false));
  };

  const fetchProductWarehouseStocks = () => {
    api.get('product-warehouse-stocks/')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setProductWarehouseStocks(data);
      })
      .catch(err => {
        console.error('Error al obtener stocks por almacén:', err);
        setProductWarehouseStocks([]);
      });
  };

  // Filtrado de productos (simplificado para el ejemplo)
  const filteredProducts = products.filter(p => {
    const matchesSearch = !search || 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    
    const matchesBrand = !filters.brand || String(typeof p.brand === 'object' ? p.brand?.id : p.brand) === filters.brand;
    const matchesCategory = !filters.category || String(typeof p.category === 'object' ? p.category?.id : p.category) === filters.category;
    const matchesActive = !filters.isActive || (filters.isActive === 'true' ? p.is_active : !p.is_active);
    
    return matchesSearch && matchesBrand && matchesCategory && matchesActive;
  });

  // Paginación
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const paginatedProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);

  React.useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(Math.max(1, totalPages));
    }
  }, [totalPages, page]);

  React.useEffect(() => {
    setPage(1);
  }, [search]);

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

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setFormError('');
    
    if (!formData.name.trim() || !formData.sku.trim() || !formData.brand || !formData.category) {
      setFormError('Los campos marcados con * son obligatorios');
      return;
    }
    
    setIsSubmitting(true);
    try {
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
      
      if (editId) {
        await api.put(`products/${editId}/`, dataToSend);
      } else {
        await api.post('products/', dataToSend);
      }
      
      setShowForm(false);
      setEditId(null);
      setFormData({ 
        name: '', sku: '', description: '', brand: '', category: '', 
        barcode: '', minimum_stock: '', maximum_stock: '', cantidad_corrugado: '',
        status: 'REGULAR', is_active: true, group: '', image_url: ''
      });
      fetchProducts();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Error al guardar el producto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProductWarehouseInfo = (productId) => {
    const productStocks = productWarehouseStocks.filter(stock => 
      (stock.product === productId || stock.product_id === productId)
    );
    
    if (productStocks.length === 0) {
      return { totalStock: 0, warehouses: [] };
    }
    
    const totalStock = productStocks.reduce((sum, stock) => sum + (stock.quantity || 0), 0);
    const warehouseInfo = productStocks.map(stock => ({
      name: stock.warehouse?.name || `Almacén ${stock.warehouse_id}`,
      quantity: stock.quantity || 0
    })).filter(w => w.quantity > 0);
    
    return { totalStock, warehouses: warehouseInfo };
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
            <h6 className="card-title mb-0 flex-grow-1">
              {product.name}
              {!product.is_active && (
                <span className="badge bg-secondary ms-2">Inactivo</span>
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
              <code className="bg-light px-2 py-1 rounded">{product.sku}</code>
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
                <div className="card card-body bg-light">
                  {warehouseInfo.warehouses.map((wh, idx) => (
                    <div key={idx} className="d-flex justify-content-between">
                      <small>{wh.name}</small>
                      <small className="fw-bold">{wh.quantity}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="d-flex gap-2">
            <button 
              className="btn btn-primary btn-sm flex-fill"
              onClick={() => handleEdit(product)}
            >
              <i className="bi bi-pencil me-1"></i>
              Editar
            </button>
            <button 
              className="btn btn-info btn-sm"
              onClick={() => handleViewInventory(product)}
              title="Ver inventario"
            >
              <i className="bi bi-box"></i>
            </button>
            <button 
              className="btn btn-warning btn-sm"
              onClick={() => setShowDiscountModal({show: true, productId: product.id, productName: product.name})}
              title="Descuentos"
            >
              <i className="bi bi-tag"></i>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleViewInventory = async (product) => {
    setInventoryProduct(product);
    setShowInventoryModal(true);
    setLoadingInventory(true);
    setProductInventory([]);
    
    try {
      const stockResponse = await api.get(`product-warehouse-stocks/?product=${product.id}`);
      const stockData = Array.isArray(stockResponse.data) ? 
        stockResponse.data : (stockResponse.data.results || []);
      
      if (stockData.length > 0) {
        const inventoryData = stockData.map(stock => ({
          warehouse: stock.warehouse || { id: stock.warehouse_id, name: `Almacén ${stock.warehouse_id}` },
          quantity: stock.quantity || 0,
          price: stock.price || 0,
          updated_at: stock.updated_at
        }));
        
        setProductInventory([{
          variant: { 
            id: product.id, 
            name: product.name, 
            sku: product.sku 
          },
          inventory: inventoryData
        }]);
      } else {
        setProductInventory([{
          variant: { 
            id: product.id, 
            name: product.name, 
            sku: product.sku 
          },
          inventory: []
        }]);
      }
      
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
    setInventoryWarehouseFilter('');
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
          <button className="btn btn-primary" onClick={handleNew}>
            <i className="bi bi-plus-circle me-1"></i>
            {isMobile ? 'Nuevo' : 'Nuevo Producto'}
          </button>
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
          <div className="input-group">
            <span className="input-group-text">
              <i className="bi bi-search"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar productos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
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
                  {brands.map(b => (
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
                  {categories.map(c => (
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

      {/* Loading */}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-3 text-muted">Cargando productos...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
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
                        <th>Producto</th>
                        <th>SKU</th>
                        <th>Marca</th>
                        <th>Categoría</th>
                        <th>Stock</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedProducts.map(product => {
                        const warehouseInfo = getProductWarehouseInfo(product.id);
                        let brandDesc = product.brand;
                        let categoryDesc = product.category;
                        
                        if (typeof product.brand === 'number' || typeof product.brand === 'string') {
                          const b = brands.find(br => String(br.id) === String(product.brand));
                          brandDesc = b ? (b.description || b.name || b.id) : product.brand;
                        }
                        
                        if (typeof product.category === 'number' || typeof product.category === 'string') {
                          const c = categories.find(cat => String(cat.id) === String(product.category));
                          categoryDesc = c ? (c.description || c.name || c.id) : product.category;
                        }

                        return (
                          <tr key={product.id}>
                            <td>
                              <div>
                                <strong>{product.name}</strong>
                                {!product.is_active && (
                                  <span className="badge bg-secondary ms-2">Inactivo</span>
                                )}
                                <br />
                                <small className="text-muted">{product.description}</small>
                              </div>
                            </td>
                            <td>
                              <code className="bg-light px-2 py-1 rounded">{product.sku}</code>
                            </td>
                            <td>{brandDesc}</td>
                            <td>{categoryDesc}</td>
                            <td>
                              <span className={`fw-bold ${warehouseInfo.totalStock > 0 ? 'text-success' : 'text-danger'}`}>
                                {warehouseInfo.totalStock}
                              </span>
                              <br />
                              <small className="text-muted">
                                Min: {product.minimum_stock || '-'} | Max: {product.maximum_stock || '-'}
                              </small>
                            </td>
                            <td>
                              <span className={`badge ${
                                product.status === 'REGULAR' ? 'bg-primary' :
                                product.status === 'NUEVO' ? 'bg-success' :
                                product.status === 'OFERTA' ? 'bg-warning text-dark' :
                                product.status === 'REMATE' ? 'bg-danger' :
                                'bg-secondary'
                              }`}>
                                {product.status || 'REGULAR'}
                              </span>
                            </td>
                            <td>
                              <div className="btn-group" role="group">
                                <button 
                                  className="btn btn-sm btn-primary"
                                  onClick={() => handleEdit(product)}
                                >
                                  <i className="bi bi-pencil"></i>
                                </button>
                                <button 
                                  className="btn btn-sm btn-info"
                                  onClick={() => handleViewInventory(product)}
                                >
                                  <i className="bi bi-box"></i>
                                </button>
                                <button 
                                  className="btn btn-sm btn-warning"
                                  onClick={() => setShowDiscountModal({show: true, productId: product.id, productName: product.name})}
                                >
                                  <i className="bi bi-tag"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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

      {/* Modal de formulario responsivo */}
      {showForm && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className={`modal-dialog ${isMobile ? 'modal-fullscreen' : 'modal-lg'}`}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-box-seam me-2"></i>
                  {editId ? 'Editar Producto' : 'Nuevo Producto'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowForm(false)}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {formError && (
                    <div className="alert alert-danger">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      {formError}
                    </div>
                  )}

                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">Nombre *</label>
                      <input
                        type="text"
                        name="name"
                        className="form-control"
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    
                    <div className="col-md-6">
                      <label className="form-label">SKU *</label>
                      <input
                        type="text"
                        name="sku"
                        className="form-control"
                        value={formData.sku}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    
                    <div className="col-md-6">
                      <label className="form-label">Código de barras</label>
                      <input
                        type="text"
                        name="barcode"
                        className="form-control"
                        value={formData.barcode}
                        onChange={handleChange}
                      />
                    </div>
                    
                    <div className="col-md-6">
                      <label className="form-label">Marca *</label>
                      <select
                        name="brand"
                        className="form-select"
                        value={formData.brand}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Seleccionar...</option>
                        {brands.map(b => (
                          <option key={b.id} value={b.id}>{b.description || b.name || b.id}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="col-md-6">
                      <label className="form-label">Categoría *</label>
                      <select
                        name="category"
                        className="form-select"
                        value={formData.category}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Seleccionar...</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.description || c.name || c.id}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="col-12">
                      <label className="form-label">Descripción</label>
                      <textarea
                        name="description"
                        className="form-control"
                        rows="3"
                        value={formData.description}
                        onChange={handleChange}
                      />
                    </div>
                    
                    <div className="col-md-4">
                      <label className="form-label">Stock Mínimo</label>
                      <input
                        type="number"
                        name="minimum_stock"
                        className="form-control"
                        value={formData.minimum_stock}
                        onChange={handleChange}
                        min="0"
                      />
                    </div>
                    
                    <div className="col-md-4">
                      <label className="form-label">Stock Máximo</label>
                      <input
                        type="number"
                        name="maximum_stock"
                        className="form-control"
                        value={formData.maximum_stock}
                        onChange={handleChange}
                        min="0"
                      />
                    </div>
                    
                    <div className="col-md-4">
                      <label className="form-label">Corrugado</label>
                      <input
                        type="number"
                        name="cantidad_corrugado"
                        className="form-control"
                        value={formData.cantidad_corrugado}
                        onChange={handleChange}
                        min="0"
                      />
                    </div>
                    
                    <div className="col-md-6">
                      <label className="form-label">Estado</label>
                      <select
                        name="status"
                        className="form-select"
                        value={formData.status}
                        onChange={handleChange}
                      >
                        <option value="REGULAR">Regular</option>
                        <option value="NUEVO">Nuevo</option>
                        <option value="OFERTA">Oferta</option>
                        <option value="REMATE">Remate</option>
                      </select>
                    </div>
                    
                    <div className="col-md-6">
                      <label className="form-label">Grupo</label>
                      <input
                        type="number"
                        name="group"
                        className="form-control"
                        value={formData.group}
                        onChange={handleChange}
                      />
                    </div>
                    
                    <div className="col-12">
                      <label className="form-label">URL de Imagen</label>
                      <input
                        type="url"
                        name="image_url"
                        className="form-control"
                        value={formData.image_url}
                        onChange={handleChange}
                      />
                    </div>
                    
                    <div className="col-12">
                      <div className="form-check">
                        <input
                          type="checkbox"
                          name="is_active"
                          className="form-check-input"
                          checked={formData.is_active}
                          onChange={handleChange}
                        />
                        <label className="form-check-label">
                          Producto activo
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowForm(false)}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i>
                        {editId ? 'Actualizar' : 'Guardar'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de inventario simplificado para móvil */}
      {showInventoryModal && inventoryProduct && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className={`modal-dialog ${isMobile ? 'modal-fullscreen' : 'modal-xl'}`}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-box me-2"></i>
                  {isMobile ? 'Inventario' : `Inventario - ${inventoryProduct.name}`}
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
                    <div className="spinner-border text-primary"></div>
                    <p className="mt-2">Cargando inventario...</p>
                  </div>
                ) : (
                  <>
                    {/* Info del producto */}
                    <div className="card mb-3">
                      <div className="card-body">
                        <h6 className="text-primary">{inventoryProduct.name}</h6>
                        <p className="mb-0">
                          <strong>SKU:</strong> <code>{inventoryProduct.sku}</code>
                          {inventoryProduct.barcode && (
                            <span className="ms-3">
                              <strong>Código:</strong> <code>{inventoryProduct.barcode}</code>
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Inventario */}
                    {productInventory.length > 0 && productInventory[0].inventory.length > 0 ? (
                      <>
                        {isMobile ? (
                          // Vista cards para móvil
                          <div>
                            {productInventory[0].inventory.map((inv, idx) => (
                              <div key={idx} className="card mb-2">
                                <div className="card-body py-2">
                                  <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                      <strong>{inv.warehouse?.name || `Almacén ${inv.warehouse_id}`}</strong>
                                      <br />
                                      <small className="text-muted">
                                        {inv.price && `$${parseFloat(inv.price).toFixed(2)}`}
                                      </small>
                                    </div>
                                    <div className="text-end">
                                      <span className={`h5 mb-0 ${inv.quantity > 0 ? 'text-success' : 'text-danger'}`}>
                                        {inv.quantity}
                                      </span>
                                      <br />
                                      <small className="text-muted">unidades</small>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          // Vista tabla para desktop
                          <div className="table-responsive">
                            <table className="table table-striped">
                              <thead>
                                <tr>
                                  <th>Almacén</th>
                                  <th>Cantidad</th>
                                  <th>Precio</th>
                                  <th>Actualizado</th>
                                </tr>
                              </thead>
                              <tbody>
                                {productInventory[0].inventory.map((inv, idx) => (
                                  <tr key={idx}>
                                    <td>
                                      <span className="badge bg-info">
                                        {inv.warehouse?.name || `Almacén ${inv.warehouse_id}`}
                                      </span>
                                    </td>
                                    <td>
                                      <span className={`fw-bold ${inv.quantity > 0 ? 'text-success' : 'text-danger'}`}>
                                        {inv.quantity}
                                      </span>
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
                                          new Date(inv.updated_at).toLocaleDateString() : 
                                          'N/A'
                                        }
                                      </small>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        
                        {/* Resumen */}
                        <div className="card bg-light mt-3">
                          <div className="card-body">
                            <div className="row text-center">
                              <div className="col-4">
                                <div className="h4 text-primary mb-0">
                                  {productInventory[0].inventory.reduce((sum, inv) => sum + (inv.quantity || 0), 0)}
                                </div>
                                <small className="text-muted">Total Stock</small>
                              </div>
                              <div className="col-4">
                                <div className="h4 text-info mb-0">
                                  {productInventory[0].inventory.length}
                                </div>
                                <small className="text-muted">Almacenes</small>
                              </div>
                              <div className="col-4">
                                <div className="h4 text-success mb-0">
                                  ${productInventory[0].inventory.reduce((sum, inv) => 
                                    sum + ((inv.quantity || 0) * (inv.price || 0)), 0
                                  ).toFixed(2)}
                                </div>
                                <small className="text-muted">Valor Total</small>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="alert alert-info text-center">
                        <i className="bi bi-info-circle display-4 text-muted"></i>
                        <h6 className="mt-3">Sin stock registrado</h6>
                        <p className="mb-0">Este producto no tiene stock en ningún almacén.</p>
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

      {/* Modales de descuentos */}
      {showDiscountManager && selectedProductForDiscount && (
        <DiscountManager
          productId={selectedProductForDiscount.id}
          productName={selectedProductForDiscount.name}
          onClose={() => setShowDiscountManager(false)}
        />
      )}

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
