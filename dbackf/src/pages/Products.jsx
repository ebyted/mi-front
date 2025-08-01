

import React, { useEffect, useState } from 'react';
import api from '../services/api';

function Products() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const formRef = React.useRef(null);
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [defaultBusinessId, setDefaultBusinessId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', sku: '', brand: '', category: '', barcode: '', minimum_stock: '', maximum_stock: '', is_active: true, group: '', business: '' });
  const [formError, setFormError] = useState('');
  const [editId, setEditId] = useState(null);
  
  // Estados para filtros avanzados
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    brand: '',
    category: '',
    business: '',
    isActive: '',
    stockStatus: ''
  });

  useEffect(() => {
    fetchBusinesses();
    fetchProducts();
    // Cargar marcas y categorías
    api.get('brands/').then(res => setBrands(res.data)).catch(() => setBrands([]));
    api.get('categories/').then(res => setCategories(res.data)).catch(() => setCategories([]));
  }, []);

  const fetchBusinesses = async () => {
    try {
      const response = await api.get('businesses/');
      const businessData = Array.isArray(response.data) ? response.data : (response.data.results || []);
      setBusinesses(businessData);
      
      // Set the first business as default
      if (businessData.length > 0) {
        const firstBusinessId = businessData[0].id;
        setDefaultBusinessId(firstBusinessId);
        console.log('Default business ID set to:', firstBusinessId);
      }
    } catch (error) {
      console.error('Error fetching businesses:', error);
      setBusinesses([]);
    }
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

  const filteredProducts = products.filter(p => {
    // Filtro de búsqueda general
    const matchesSearch = (p.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (p.sku?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (typeof p.brand === 'object' ? (p.brand?.name?.toLowerCase() || '') : (typeof p.brand === 'string' ? p.brand.toLowerCase() : String(p.brand || '').toLowerCase())).includes(search.toLowerCase()) ||
      (typeof p.category === 'object' ? (p.category?.name?.toLowerCase() || '') : (typeof p.category === 'string' ? p.category.toLowerCase() : String(p.category || '').toLowerCase())).includes(search.toLowerCase());
    
    // Filtros específicos
    const matchesBrand = !filters.brand || String(typeof p.brand === 'object' ? p.brand?.id : p.brand) === filters.brand;
    const matchesCategory = !filters.category || String(typeof p.category === 'object' ? p.category?.id : p.category) === filters.category;
    const matchesBusiness = !filters.business || String(typeof p.business === 'object' ? p.business?.id : p.business) === filters.business;
    const matchesActive = !filters.isActive || (filters.isActive === 'true' ? p.is_active : !p.is_active);
    
    // Filtro de estado de stock
    let matchesStock = true;
    if (filters.stockStatus) {
      if (filters.stockStatus === 'low' && p.minimum_stock) {
        // Aquí necesitaríamos el stock actual, por ahora usamos minimum_stock como referencia
        matchesStock = (p.minimum_stock || 0) < 10;
      } else if (filters.stockStatus === 'ok') {
        matchesStock = (p.minimum_stock || 0) >= 10;
      }
    }
    
    return matchesSearch && matchesBrand && matchesCategory && matchesBusiness && matchesActive && matchesStock;
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
    setPage(1); // Reset pagination when filtering
  };

  const clearFilters = () => {
    setFilters({
      brand: '',
      category: '',
      business: '',
      isActive: '',
      stockStatus: ''
    });
    setSearch('');
    setPage(1);
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value !== '').length + (search ? 1 : 0);
  };

  const handleEdit = product => {
    console.log('Editando producto:', product);
    setFormError('');
    setEditId(product.id);
    
    // Preparar datos del formulario con validación
    const editFormData = {
      name: product.name || '',
      sku: product.sku || '',
      brand: typeof product.brand === 'object' && product.brand !== null ? product.brand.id : product.brand || '',
      category: typeof product.category === 'object' && product.category !== null ? product.category.id : product.category || '',
      barcode: product.barcode || '',
      minimum_stock: product.minimum_stock || '',
      maximum_stock: product.maximum_stock || '',
      is_active: product.is_active ?? true,
      group: product.group || '',
      business: typeof product.business === 'object' && product.business !== null ? product.business.id : product.business || defaultBusinessId || ''
    };
    
    console.log('Datos del formulario preparados:', editFormData);
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
      brand: '', 
      category: '', 
      barcode: '', 
      minimum_stock: '', 
      maximum_stock: '', 
      is_active: true, 
      group: '', 
      business: defaultBusinessId || '' // Use default business ID for new products
    });
    setShowForm(true);
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
    
    if (!formData.business) {
      errors.push('El negocio es requerido');
    }
    
    // Validar números positivos
    if (formData.minimum_stock && (isNaN(formData.minimum_stock) || parseFloat(formData.minimum_stock) < 0)) {
      errors.push('Stock mínimo debe ser un número positivo');
    }
    
    if (formData.maximum_stock && (isNaN(formData.maximum_stock) || parseFloat(formData.maximum_stock) < 0)) {
      errors.push('Stock máximo debe ser un número positivo');
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
    
    console.log('Datos del formulario a enviar:', formData);
    console.log('EditId:', editId);
    
    // Usar la función de validación mejorada
    if (!validateForm()) {
      console.log('Validación del formulario falló');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Preparar datos para envío
      const dataToSend = {
        ...formData,
        // Asegurar que los campos numéricos sean números o null
        minimum_stock: formData.minimum_stock ? Number(formData.minimum_stock) : null,
        maximum_stock: formData.maximum_stock ? Number(formData.maximum_stock) : null,
        group: formData.group ? Number(formData.group) : null,
        // Asegurar que brand, category y business sean números
        brand: Number(formData.brand),
        category: Number(formData.category),
        business: Number(formData.business || defaultBusinessId)
      };
      
      console.log('Datos procesados para envío:', dataToSend);
      
      let response;
      if (editId) {
        console.log(`Editando producto con ID: ${editId}`);
        response = await api.put(`products/${editId}/`, dataToSend);
      } else {
        console.log('Creando nuevo producto');
        response = await api.post('products/', dataToSend);
      }
      
      console.log('Respuesta del servidor:', response.data);
      
      setShowForm(false);
      setEditId(null);
      setFormData({ name: '', sku: '', brand: '', category: '', barcode: '', minimum_stock: '', maximum_stock: '', is_active: true, group: '', business: defaultBusinessId || '' });
      fetchProducts();
    } catch (err) {
      console.error('Error al guardar producto:', err);
      
      let errorMessage = 'Error al guardar producto.';
      
      if (err.response) {
        console.error('Respuesta de error:', err.response.data);
        console.error('Status:', err.response.status);
        
        if (err.response.status === 400) {
          // Error de validación
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

  const selectedProduct = products.find(p => String(p.id) === String(selectedId));

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="display-5 mb-0 text-primary">
          📦 Productos
        </h1>
        <div className="d-flex gap-3">
          <div className="text-center">
            <div className="h4 mb-0 text-primary">{products.length}</div>
            <small className="text-muted">Total</small>
          </div>
          <div className="text-center">
            <div className="h4 mb-0 text-success">{products.filter(p => p.is_active).length}</div>
            <small className="text-muted">Activos</small>
          </div>
          <div className="text-center">
            <div className="h4 mb-0 text-warning">{filteredProducts.length}</div>
            <small className="text-muted">Filtrados</small>
          </div>
        </div>
      </div>
      <div className="row mb-3">
        <div className="col">
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por nombre, SKU, marca o categoría..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button 
              className="btn btn-outline-secondary" 
              type="button"
              onClick={() => setShowFilters(!showFilters)}
            >
              🔍 Filtros 
              {getActiveFiltersCount() > 0 && (
                <span className="badge bg-primary ms-1">{getActiveFiltersCount()}</span>
              )}
            </button>
            {getActiveFiltersCount() > 0 && (
              <button 
                className="btn btn-outline-danger" 
                type="button"
                onClick={clearFilters}
                title="Limpiar filtros"
              >
                ✖
              </button>
            )}
          </div>
        </div>
        <div className="col-auto">
          <button className="btn btn-primary" onClick={handleNew}>
            ➕ Nuevo producto
          </button>
        </div>
      </div>
      
      {/* Panel de filtros avanzados */}
      {showFilters && (
        <div className="card mb-3">
          <div className="card-body">
            <h6 className="card-title">Filtros Avanzados</h6>
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label">Marca</label>
                <select 
                  className="form-select form-select-sm"
                  value={filters.brand}
                  onChange={e => handleFilterChange('brand', e.target.value)}
                >
                  <option value="">Todas las marcas</option>
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
              <div className="col-md-3">
                <label className="form-label">Categoría</label>
                <select 
                  className="form-select form-select-sm"
                  value={filters.category}
                  onChange={e => handleFilterChange('category', e.target.value)}
                >
                  <option value="">Todas las categorías</option>
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
              <div className="col-md-3">
                <label className="form-label">Negocio</label>
                <select 
                  className="form-select form-select-sm"
                  value={filters.business}
                  onChange={e => handleFilterChange('business', e.target.value)}
                >
                  <option value="">Todos los negocios</option>
                  {businesses
                    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
                    .map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Estado</label>
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
            </div>
          </div>
        </div>
      )}
      {showForm && (
        <form ref={formRef} className="bg-white p-4 rounded shadow mb-4" onSubmit={handleSubmit} style={{maxWidth: 600}}>
          <h2 className="mb-3">{editId ? 'Editar producto' : 'Nuevo producto'}</h2>
          <div className="mb-3">
            <input
              type="text"
              name="name"
              className="form-control"
              placeholder="Nombre*"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="text"
              name="sku"
              className="form-control"
              placeholder="SKU*"
              value={formData.sku}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Marca*</label>
            <select
              name="brand"
              className="form-select"
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
          <div className="mb-3">
            <label className="form-label">Categoría*</label>
            <select
              name="category"
              className="form-select"
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
          <div className="mb-3">
            <label className="form-label">Negocio*</label>
            <select
              name="business"
              className="form-select"
              value={formData.business}
              onChange={handleChange}
              required
            >
              <option value="">Selecciona negocio</option>
              {businesses
                .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
                .map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
            </select>
          </div>
          <div className="mb-3">
            <input
              type="text"
              name="barcode"
              className="form-control"
              placeholder="Código de barras"
              value={formData.barcode}
              onChange={handleChange}
            />
          </div>
          <div className="mb-3">
            <input
              type="number"
              name="minimum_stock"
              className="form-control"
              placeholder="Stock mínimo"
              value={formData.minimum_stock}
              onChange={handleChange}
            />
          </div>
          <div className="mb-3">
            <input
              type="number"
              name="maximum_stock"
              className="form-control"
              placeholder="Stock máximo"
              value={formData.maximum_stock}
              onChange={handleChange}
            />
          </div>
          <div className="mb-3">
            <label className="form-check-label me-2">Activo</label>
            <input
              type="checkbox"
              name="is_active"
              className="form-check-input"
              checked={formData.is_active}
              onChange={handleChange}
            />
          </div>
          <div className="mb-3">
            <input
              type="number"
              name="group"
              className="form-control"
              placeholder="Grupo"
              value={formData.group}
              onChange={handleChange}
            />
          </div>
          {formError && <div className="alert alert-danger mb-2">{formError}</div>}
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
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
          <button type="button" className="btn btn-light ms-2" disabled={isSubmitting} onClick={() => {
            setShowForm(false);
            setEditId(null);
            setFormError('');
            setFormData({ name: '', sku: '', brand: '', category: '', barcode: '', minimum_stock: '', maximum_stock: '', is_active: true, group: '', business: defaultBusinessId || '' });
          }}>
            ✖ Cancelar
          </button>
        </form>
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
      {!loading && !error && (
        <div>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-5">
              🔍 <h5 className="text-muted">No se encontraron productos</h5>
              <p className="text-muted">
                {search || getActiveFiltersCount() > 0 
                  ? 'Intenta ajustar los criterios de búsqueda o filtros'
                  : 'No hay productos registrados aún'
                }
              </p>
              {(search || getActiveFiltersCount() > 0) && (
                <button className="btn btn-outline-primary" onClick={clearFilters}>
                  ✖ Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <>
              <table className="table table-bordered table-hover">
            <thead className="table-primary">
              <tr>
                <th>Nombre</th>
                <th>SKU</th>
                <th>Marca</th>
                <th>Categoría</th>
                <th>Negocio</th>
                <th>Código de barras</th>
                <th>Stock mínimo</th>
                <th>Stock máximo</th>
                <th>Activo</th>
                <th>Grupo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan="11" className="text-center py-4">
                    📪 <p className="text-muted mb-0">No hay productos en esta página</p>
                    <small className="text-muted">Intenta navegar a una página anterior</small>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map(p => {
                // Buscar descripción de marca, categoría y negocio por ID
                let brandDesc = p.brand;
                let categoryDesc = p.category;
                let businessDesc = p.business;
                
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
                
                if (typeof p.business === 'number' || typeof p.business === 'string') {
                  const bus = businesses.find(business => String(business.id) === String(p.business));
                  businessDesc = bus && typeof bus === 'object' ? bus.name : p.business;
                } else if (typeof p.business === 'object' && p.business !== null) {
                  businessDesc = p.business.name || p.business;
                }
                
                const stockStatus = getStockStatus(p);
                
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
                    <td>
                      <span className="badge bg-info">{businessDesc}</span>
                    </td>
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
                          className="btn btn-sm btn-outline-info" 
                          title="Ver detalles"
                          onClick={() => {/* TODO: Implementar vista de detalles */}}
                        >
                          👁️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
          <nav className="d-flex justify-content-between align-items-center mt-4">
            <div className="d-flex align-items-center">
              <span className="text-muted">
                {filteredProducts.length === 0 
                  ? 'No hay productos para mostrar'
                  : `Mostrando ${(page - 1) * pageSize + 1} - ${Math.min(page * pageSize, filteredProducts.length)} de ${filteredProducts.length} productos`
                }
              </span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button 
                className="btn btn-outline-secondary btn-sm" 
                disabled={page === 1} 
                onClick={() => setPage(1)}
                title="Primera página"
              >
                ⏮️
              </button>
              <button 
                className="btn btn-outline-secondary btn-sm" 
                disabled={page === 1} 
                onClick={() => setPage(page - 1)}
                title="Página anterior"
              >
                ⬅️
              </button>
              <span className="px-3">
                Página <strong>{page}</strong> de <strong>{totalPages}</strong>
              </span>
              <button 
                className="btn btn-outline-secondary btn-sm" 
                disabled={page === totalPages || totalPages === 0} 
                onClick={() => setPage(page + 1)}
                title="Página siguiente"
              >
                ➡️
              </button>
              <button 
                className="btn btn-outline-secondary btn-sm" 
                disabled={page === totalPages || totalPages === 0} 
                onClick={() => setPage(totalPages)}
                title="Última página"
              >
                ⏭️
              </button>
            </div>
            <div className="d-flex align-items-center">
              <label className="form-label me-2 mb-0">Mostrar:</label>
              <select 
                className="form-select form-select-sm" 
                style={{ width: 100 }} 
                value={pageSize} 
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              >
                {[5, 10, 20, 50, 100].map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
          </nav>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Products;
