import React, { useEffect, useState, useRef, useCallback } from 'react';
// import ProductSelect from '../components/ProductSelect';
import api from '../services/api';
import useDocumentTitle from '../hooks/useDocumentTitle';
import DiscountManager from '../components/DiscountManager';

function Products() {
  useDocumentTitle('Productos');
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ brand: '', category: '', warehouse: '', isActive: '', stockStatus: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState('table');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    productId: '',
    productVariantId: '',
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
    image_url: '',
    image_file: null,
    // Campos de precio para la variante
    price: '',
    cost_price: '',
    sale_price: ''
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState('');
  const [mainMessage, setMainMessage] = useState({ type: '', text: '' });
  const [showDiscountModal, setShowDiscountModal] = useState({ show: false, productId: null, productName: '' });
  const formRef = useRef();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    console.log('📦 Cargando datos de productos...');
    setLoading(true);

    // Timeout de seguridad
    const timeoutId = setTimeout(() => {
      console.warn('⏰ Timeout: Carga tomó más de 10 segundos');
      setLoading(false);
    }, 10000);

    Promise.all([
      api.get('products/search_all/'),
      api.get('brands/'),
      api.get('categories/'),
      api.get('warehouses/')
    ])
      .then(([productsRes, brandsRes, categoriesRes, warehousesRes]) => {
        clearTimeout(timeoutId);
        console.log('✅ Datos cargados:', {
          products: productsRes.data?.length || 0,
          brands: brandsRes.data?.length || 0,
          categories: categoriesRes.data?.length || 0,
          warehouses: warehousesRes.data?.length || 0
        });
        
        if (Array.isArray(productsRes.data)) {
          setProducts(productsRes.data);
        } else {
          console.warn('⚠️ Products data is not an array:', productsRes.data);
          setProducts([]);
        }
        setBrands(brandsRes.data || []);
        setCategories(categoriesRes.data || []);
        setWarehouses(warehousesRes.data || []);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        console.error('❌ Error cargando datos:', error);
        setProducts([]);
        setBrands([]);
        setCategories([]);
        setWarehouses([]);
      })
      .finally(() => {
        console.log('🏁 Carga finalizada');
        setLoading(false);
      });
  }, []);

  // Filtro y búsqueda mejorados
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchDebounce, setSearchDebounce] = useState('');
  
  // Debounce para búsqueda de texto
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchDebounce(search);
    }, 300); // 300ms de debounce
    
    return () => clearTimeout(timeoutId);
  }, [search]);

  const applyFilters = useCallback(() => {
    console.log('🔍 Aplicando filtros...', { 
      search: searchDebounce, 
      filters, 
      totalProducts: products.length 
    });
    
    const result = products.filter(p => {
      let matchesSearch = true;
      if (searchDebounce && searchDebounce.trim()) {
        const normalized = (txt) => String(txt || '').toLowerCase().trim();
        const s = normalized(searchDebounce);
        
        // Texto de marca (manejo robusto de objetos vs strings)
        const brandText = p.brand && typeof p.brand === 'object'
          ? (p.brand.description || p.brand.name || p.brand_name || '')
          : (p.brand || p.brand_name || '');
          
        // Texto de categoría (manejo robusto de objetos vs strings)
        const categoryText = p.category && typeof p.category === 'object'
          ? (p.category.description || p.category.name || p.category_name || '')
          : (p.category || p.category_name || '');
        
        // Búsqueda en múltiples campos
        matchesSearch = normalized(p.name).includes(s)
          || normalized(p.sku).includes(s)
          || normalized(p.barcode).includes(s)
          || normalized(p.description).includes(s)
          || normalized(brandText).includes(s)
          || normalized(categoryText).includes(s)
          // También buscar en variantes
          || (p.variants && p.variants.some(v => 
              normalized(v.name).includes(s) || 
              normalized(v.sku).includes(s)
            ));
      }
      
      // Filtro por marca
      const matchesBrand = !filters.brand || 
        String(typeof p.brand === 'object' ? p.brand?.id : p.brand) === filters.brand;
      
      // Filtro por categoría  
      const matchesCategory = !filters.category || 
        String(typeof p.category === 'object' ? p.category?.id : p.category) === filters.category;
      
      // Filtro por estado activo
      const matchesActive = !filters.isActive || 
        (filters.isActive === 'true' ? p.is_active === true : p.is_active === false);
      
      // Filtro por stock
      let matchesStock = true;
      if (filters.stockStatus) {
        const currentStock = p.current_stock || 0;
        const minStock = p.minimum_stock || 0;
        if (filters.stockStatus === 'low') {
          matchesStock = currentStock < minStock;
        } else if (filters.stockStatus === 'ok') {
          matchesStock = currentStock >= minStock;
        } else if (filters.stockStatus === 'zero') {
          matchesStock = currentStock === 0;
        }
      }
      
      return matchesSearch && matchesBrand && matchesCategory && matchesActive && matchesStock;
    });
    
    console.log('📊 Resultados filtrados:', result.length);
    setFilteredProducts(result);
    setPage(1);
  }, [products, searchDebounce, filters]);
  // Inicializar filteredProducts cuando se cargan los productos
  useEffect(() => {
    if (products.length > 0) {
      console.log('🔄 Inicializando productos filtrados...');
      setFilteredProducts(products);
    }
  }, [products]);

  // Auto-aplicar filtros cuando cambian los criterios de búsqueda (con debounce)
  useEffect(() => {
    console.log('🔄 Aplicando filtros automáticamente...');
    applyFilters();
  }, [applyFilters]);

  // Paginación local sobre los productos filtrados
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const paginatedProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);

  const handleEdit = (product) => {
    setEditId(product.id);
    setFormError('');
    const variant = product.variants?.[0]; // Tomar la primera variante
    setFormData({
      productId: product.id,
      productVariantId: variant?.id || '',
      name: product.name || '',
      sku: product.sku || '',
      description: product.description || '',
      brand: typeof product.brand === 'object' ? product.brand.id : product.brand || '',
      category: typeof product.category === 'object' ? product.category.id : product.category || '',
      barcode: product.barcode || '',
      minimum_stock: product.minimum_stock || '',
      maximum_stock: product.maximum_stock || '',
      cantidad_corrugado: product.cantidad_corrugado || '',
      status: product.status || 'REGULAR',
      is_active: product.is_active ?? true,
      group: product.group || '',
      image_url: product.image_url || '',
      // Cargar precios de la variante
      price: variant?.price || '',
      cost_price: variant?.cost_price || '',
      sale_price: variant?.sale_price || ''
    });
    setShowForm(true);
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleNew = () => {
    setEditId(null);
    setFormError('');
    setFormData({
      productId: '',
      productVariantId: '',
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
      image_url: '',
      price: '',
      cost_price: '',
      sale_price: ''
    });
    setShowForm(true);
  };

  const handleProductSelect = (product) => {
    setFormData(fd => ({
      ...fd,
      productId: product.id,
      productVariantId: product.variants?.[0]?.id || '',
      name: product.name,
      sku: product.sku,
      brand: typeof product.brand === 'object' ? product.brand.id : product.brand,
      category: typeof product.category === 'object' ? product.category.id : product.category
    }));
  };

  const handleChange = e => {
    const { name, value, type, checked, files } = e.target;
    if (name === 'image_file') {
      setFormData({ ...formData, image_file: files && files.length > 0 ? files[0] : null });
    } else {
      setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    }
  };

  const validateForm = () => {
    const errors = [];
    // Solo pedir variante en alta, no en edición
    // if (!editId && !formData.productVariantId) errors.push('Selecciona una variante');
    // Validar campos obligatorios
  if (!formData.name || !formData.name.trim()) errors.push('Nombre es obligatorio');
  if (!formData.sku || !formData.sku.trim()) errors.push('SKU es obligatorio');
  if (!formData.brand) errors.push('Marca es obligatoria');
  if (!formData.category) errors.push('Categoría es obligatoria');
    // Validar campos numéricos
    if (formData.minimum_stock && (isNaN(formData.minimum_stock) || parseFloat(formData.minimum_stock) < 0)) errors.push('Stock mínimo inválido');
    if (formData.maximum_stock && (isNaN(formData.maximum_stock) || parseFloat(formData.maximum_stock) < 0)) errors.push('Stock máximo inválido');
    if (formData.cantidad_corrugado && (isNaN(formData.cantidad_corrugado) || parseFloat(formData.cantidad_corrugado) < 0)) errors.push('Cantidad corrugado inválida');
    // Validar precios
    if (formData.price && (isNaN(formData.price) || parseFloat(formData.price) < 0)) errors.push('Precio inválido');
    if (formData.cost_price && (isNaN(formData.cost_price) || parseFloat(formData.cost_price) < 0)) errors.push('Precio de costo inválido');
    if (formData.sale_price && (isNaN(formData.sale_price) || parseFloat(formData.sale_price) < 0)) errors.push('Precio de venta inválido');
    // Validar imagen
    if (formData.image_url && formData.image_url.trim() && !/^https?:\/\/.+\.(jpg|jpeg|png|webp)$/i.test(formData.image_url)) errors.push('URL de imagen inválida');
    // Validar relación de stocks
    if (formData.minimum_stock && formData.maximum_stock && parseFloat(formData.maximum_stock) < parseFloat(formData.minimum_stock)) errors.push('Stock máximo debe ser mayor que mínimo');
    if (errors.length > 0) {
      setFormError(errors.join(', '));
      return false;
    }
    return true;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      let safeStatus = formData.status === 'NORMAL' ? 'REGULAR' : formData.status;
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('sku', formData.sku);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('brand', formData.brand);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('barcode', formData.barcode);
      formDataToSend.append('minimum_stock', formData.minimum_stock);
      formDataToSend.append('maximum_stock', formData.maximum_stock);
      formDataToSend.append('cantidad_corrugado', formData.cantidad_corrugado);
      formDataToSend.append('status', safeStatus);
      formDataToSend.append('is_active', formData.is_active);
      formDataToSend.append('group', formData.group);
      formDataToSend.append('image_url', formData.image_url);
      formDataToSend.append('business', 1);
      if (formData.image_file) {
        formDataToSend.append('image_file', formData.image_file);
      }
      let successMsg = '';
      if (editId) {
        // Actualizar producto
        await api.put(`products/${editId}/`, formDataToSend, { headers: { 'Content-Type': 'multipart/form-data' } });
        
        // Actualizar precios de la variante si existe
        if (formData.productVariantId && (formData.price || formData.cost_price || formData.sale_price)) {
          const variantData = {};
          if (formData.price) variantData.price = parseFloat(formData.price);
          if (formData.cost_price) variantData.cost_price = parseFloat(formData.cost_price);
          if (formData.sale_price) variantData.sale_price = parseFloat(formData.sale_price);
          
          try {
            await api.patch(`product-variants/${formData.productVariantId}/`, variantData);
          } catch (variantError) {
            console.warn('Error actualizando precios de variante:', variantError);
          }
        }
        
        successMsg = '¡Producto y precios actualizados correctamente!';
      } else {
        const productResponse = await api.post('products/', formDataToSend, { headers: { 'Content-Type': 'multipart/form-data' } });
        
        // Si es un producto nuevo y tiene precios, buscar y actualizar la variante creada automáticamente
        if (productResponse.data.id && (formData.price || formData.cost_price || formData.sale_price)) {
          try {
            // Obtener las variantes del producto recién creado
            const productDetail = await api.get(`products/${productResponse.data.id}/`);
            if (productDetail.data.variants && productDetail.data.variants.length > 0) {
              const firstVariant = productDetail.data.variants[0];
              const variantData = {};
              if (formData.price) variantData.price = parseFloat(formData.price);
              if (formData.cost_price) variantData.cost_price = parseFloat(formData.cost_price);
              if (formData.sale_price) variantData.sale_price = parseFloat(formData.sale_price);
              
              await api.patch(`product-variants/${firstVariant.id}/`, variantData);
            }
          } catch (variantError) {
            console.warn('Error actualizando precios de variante en producto nuevo:', variantError);
          }
        }
        
        successMsg = '¡Producto creado correctamente!';
      }
      setShowForm(false);
      setEditId(null);
      setFormData({
        productId: '', productVariantId: '', name: '', sku: '', description: '', brand: '', category: '', barcode: '', minimum_stock: '', maximum_stock: '', cantidad_corrugado: '', status: 'REGULAR', is_active: true, group: '', image_url: '', price: '', cost_price: '', sale_price: ''
      });
      // Refrescar productos usando el endpoint correcto tras guardar
      api.get('products/')
        .then(res => {
          if (Array.isArray(res.data)) {
            setProducts(res.data);
          } else if (res.data && Array.isArray(res.data.results)) {
            setProducts(res.data.results);
          } else {
            setProducts([]);
          }
        })
        .catch(() => setProducts([]));
      setMainMessage({ type: 'success', text: successMsg });
      setTimeout(() => setMainMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      let errorMsg = 'Error al guardar';
      if (err.response && err.response.data) {
        if (typeof err.response.data === 'string') {
          errorMsg = err.response.data;
        } else if (typeof err.response.data === 'object') {
          errorMsg = Object.entries(err.response.data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' | ');
        }
      }
      setFormError(errorMsg);
      setFormSuccess('');
      setMainMessage({ type: 'error', text: errorMsg });
      setTimeout(() => setMainMessage({ type: '', text: '' }), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container-fluid py-3">
      {/* Mensaje principal de éxito/falla */}
      {mainMessage.text && (
        <div className={`alert ${mainMessage.type === 'success' ? 'alert-success' : 'alert-danger'} mb-3`} role="alert">
          {mainMessage.text}
        </div>
      )}
      <div className="row align-items-center mb-4">
        <div className="col">
          <h1 className={`mb-0 text-primary ${isMobile ? 'h4' : 'display-6'}`}>
            <i className="bi bi-box-seam me-2"></i>
            Productos
          </h1>
        </div>
        <div className="col-auto">
          <button className={`btn btn-primary ${isMobile ? 'btn-lg px-3' : ''}`} onClick={handleNew}>
            <i className="bi bi-plus-circle me-1"></i>
            {isMobile ? 'Nuevo' : 'Nuevo Producto'}
          </button>
        </div>
      </div>
      <div className="row g-2 mb-4">
        <div className="col">
          <div className="d-flex gap-3">
            <span className="badge bg-primary">Total: {products.length}</span>
            <span className="badge bg-success">Activos: {products.filter(p => p.is_active).length}</span>
            <span className="badge bg-info">Filtrados: {filteredProducts.length}</span>
          </div>
        </div>
      </div>
      <div className="row g-2 mb-3">
        <div className="col-md-4 mb-2 mb-md-0">
          <div className="input-group">
            <span className="input-group-text">
              {search !== searchDebounce ? (
                <i className="bi bi-hourglass-split text-warning" title="Filtrando..."></i>
              ) : (
                <i className="bi bi-search"></i>
              )}
            </span>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Buscar por nombre, SKU, código de barras, marca..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="btn btn-outline-secondary" onClick={() => setSearch('')} title="Limpiar búsqueda">
                <i className="bi bi-x"></i>
              </button>
            )}
          </div>
          {searchDebounce && (
            <small className="text-muted mt-1 d-block">
              <i className="bi bi-funnel"></i>
              Mostrando {filteredProducts.length} de {products.length} productos
            </small>
          )}
        </div>
        <div className="col-md-3 mb-2 mb-md-0">
          <select className="form-select" value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
            <option value="">Todas las categorías</option>
            {categories
              .filter(c => c && c.id != null)
              .sort((a, b) => {
                const nameA = (a.description || a.name || '').toLowerCase();
                const nameB = (b.description || b.name || '').toLowerCase();
                return nameA.localeCompare(nameB);
              })
              .map(c => (
                <option key={c.id} value={c.id}>{c.description || c.name || `Categoría ${c.id}`}</option>
              ))}
          </select>
        </div>
        <div className="col-md-3 mb-2 mb-md-0">
          <select className="form-select" value={filters.brand} onChange={e => setFilters(f => ({ ...f, brand: e.target.value }))}>
            <option value="">Todas las marcas</option>
            {brands
              .filter(b => b && b.id != null)
              .sort((a, b) => {
                const nameA = (a.description || a.name || '').toLowerCase();
                const nameB = (b.description || b.name || '').toLowerCase();
                return nameA.localeCompare(nameB);
              })
              .map(b => (
                <option key={b.id} value={b.id}>{b.description || b.name || `Marca ${b.id}`}</option>
              ))}
          </select>
        </div>
          <div className="col-md-2 text-end d-flex gap-2">
            <button className="btn btn-outline-secondary" onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')} title="Cambiar vista">
              <i className={`bi ${viewMode === 'table' ? 'bi-grid-3x3-gap' : 'bi-table'}`}></i>
            </button>
            <button className="btn btn-outline-danger" onClick={() => {
              setFilters({ brand: '', category: '', warehouse: '', isActive: '', stockStatus: '' });
              setSearch('');
            }} title="Limpiar todos los filtros">
              <i className="bi bi-x-circle"></i> Limpiar
            </button>
          </div>
      </div>
      {/* Controles de paginación */}
      <div className="row mb-3">
        <div className="col d-flex justify-content-end align-items-center gap-2">
          <span>Página {page} de {products.length}</span>
          <button className="btn btn-outline-primary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>&lt; Anterior</button>
          <button className="btn btn-outline-primary btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Siguiente &gt;</button>
          <select className="form-select form-select-sm w-auto" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
            {[10, 20, 50, 100].map(size => <option key={size} value={size}>{size} por página</option>)}
          </select>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-hover">
          <thead className="table-primary">
            <tr>
              <th>Nombre</th>
              <th>SKU</th>
              <th style={{background:'#e3f2fd'}}>Marca</th>
              <th style={{background:'#e8f5e9'}}>Categoría</th>
              <th style={{background:'#fff3cd'}}>Precio</th>
              <th>Activo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (            
              <tr>
                <td colSpan="7" className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                  <p className="mt-2 text-secondary">Cargando Productos...</p>
                </td>
              </tr>
            ) : paginatedProducts.filter(p => p && typeof p === 'object' && p.id != null).map(p => {
              // Determinar la URL de la imagen a mostrar
              let imgSrc = '';
              if (p.image_file) {
                // Si es ruta relativa, anteponer el dominio si es necesario
                imgSrc = p.image_file.startsWith('http') ? p.image_file : `${process.env.REACT_APP_MEDIA_URL || ''}${p.image_file}`;
              } else if (p.image_url) {
                imgSrc = p.image_url;
              }
              return (
                <tr key={p.id}>
                  <td>{p.name ?? ''}</td>
                  <td>{p.sku ?? ''}</td>
                  <td style={{ background: '#e3f2fd', fontWeight: 'bold' }}>{(() => {
                    if (p.brand && typeof p.brand === 'object') return p.brand.name ?? p.brand.description ?? '';
                    if (p.brand != null) {
                      const b = brands.find(br => br.id === Number(p.brand));
                      return b ? (b.description || b.name || '') : '';
                    }
                    return '';
                  })()}</td>
                  <td style={{ background: '#e8f5e9', fontWeight: 'bold' }}>{(() => {
                    if (p.category && typeof p.category === 'object') return p.category.name ?? p.category.description ?? '';
                    if (p.category != null) {
                      const c = categories.find(cat => cat.id === Number(p.category));
                      return c ? (c.description || c.name || '') : '';
                    }
                    return '';
                  })()}</td>
                  <td style={{ background: '#fff3cd', fontWeight: 'bold', color: '#856404' }}>
                    {(() => {
                      const variant = p.variants && p.variants.length > 0 ? p.variants[0] : null;
                      if (variant && variant.price) {
                        return `$${parseFloat(variant.price).toFixed(2)}`;
                      }
                      return <span className="text-muted">Sin precio</span>;
                    })()}
                  </td>
                  <td><span className={`badge ${p.is_active ? 'bg-success' : 'bg-danger'}`}>{p.is_active ? 'Activo' : 'Inactivo'}</span></td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary" onClick={() => p && p.id != null ? handleEdit(p) : null} disabled={!p || p.id == null}>✏️</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Professional Footer Pagination */}
      <div className="row align-items-center mt-3 p-3 border-top bg-light">
        <div className="col-md-6">
          <div className="d-flex align-items-center gap-2">
            <small className="text-muted">Mostrar:</small>
            <select 
              className="form-select form-select-sm" 
              style={{width: 'auto'}}
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1); // Reset to first page when changing items per page
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <small className="text-muted">
              productos por página
            </small>
          </div>
        </div>
        
        <div className="col-md-6">
          <div className="d-flex justify-content-end align-items-center gap-2">
            <small className="text-muted me-3">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalProducts)} de {totalProducts} productos
            </small>
            
            {/* Pagination Controls */}
            <nav aria-label="Paginación de productos">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    title="Primera página"
                  >
                    <i className="fas fa-angle-double-left"></i>
                  </button>
                </li>
                
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    title="Página anterior"
                  >
                    <i className="fas fa-angle-left"></i>
                  </button>
                </li>

                {/* Page Numbers */}
                {(() => {
                  const totalPages = Math.ceil(totalProducts / itemsPerPage);
                  const maxVisiblePages = 5;
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                  
                  // Adjust start page if we're near the end
                  if (endPage - startPage + 1 < maxVisiblePages) {
                    startPage = Math.max(1, endPage - maxVisiblePages + 1);
                  }

                  const pages = [];
                  
                  // Show first page if not visible
                  if (startPage > 1) {
                    pages.push(
                      <li key={1} className="page-item">
                        <button className="page-link" onClick={() => setCurrentPage(1)}>1</button>
                      </li>
                    );
                    if (startPage > 2) {
                      pages.push(
                        <li key="start-ellipsis" className="page-item disabled">
                          <span className="page-link">...</span>
                        </li>
                      );
                    }
                  }

                  // Show visible page range
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => setCurrentPage(i)}
                        >
                          {i}
                        </button>
                      </li>
                    );
                  }

                  // Show last page if not visible
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pages.push(
                        <li key="end-ellipsis" className="page-item disabled">
                          <span className="page-link">...</span>
                        </li>
                      );
                    }
                    pages.push(
                      <li key={totalPages} className="page-item">
                        <button className="page-link" onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
                      </li>
                    );
                  }

                  return pages;
                })()}

                <li className={`page-item ${currentPage === Math.ceil(totalProducts / itemsPerPage) ? 'disabled' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === Math.ceil(totalProducts / itemsPerPage)}
                    title="Página siguiente"
                  >
                    <i className="fas fa-angle-right"></i>
                  </button>
                </li>
                
                <li className={`page-item ${currentPage === Math.ceil(totalProducts / itemsPerPage) ? 'disabled' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => setCurrentPage(Math.ceil(totalProducts / itemsPerPage))}
                    disabled={currentPage === Math.ceil(totalProducts / itemsPerPage)}
                    title="Última página"
                  >
                    <i className="fas fa-angle-double-right"></i>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>

      {showForm && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{backgroundColor: 'rgba(0,0,0,0.5)'}}
          onClick={e => {
            if (e.target === e.currentTarget) setShowForm(false);
          }}
        >
          <div
            className={`modal-dialog ${isMobile ? 'modal-fullscreen' : 'modal-lg modal-dialog-scrollable'}`}
          >
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h5 className="modal-title">{editId ? 'Editar producto' : 'Nuevo producto'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowForm(false)}></button>
              </div>
              {/* Mensaje de error arriba del modal */}
              {formError && <div className="alert alert-danger mx-3 mt-3 mb-0">{formError}</div>}
              <div className="modal-body" onClick={e => e.stopPropagation()}>
                {editId && (
                  <div className="mb-3 text-end">
                    <button
                      type="button"
                      className="btn btn-warning"
                      onClick={() => setFormData(fd => ({
                        ...fd,
                        description: fd.name,
                        minimum_stock: 0,
                        maximum_stock: 100,
                        barcode: fd.sku,
                        cantidad_corrugado: 0,
                        group:1,
                      }))}
                    >
                      Valida default
                    </button>
                  </div>
                )}
                <form ref={formRef} onSubmit={handleSubmit} onClick={e => e.stopPropagation()}>
                  <div className="row g-2">
                    {/* Campo Nombre */}
                    <div className="col-12">
                      <label className="form-label fw-bold">Nombre</label>
                      <input type="text" name="name" className="form-control" value={formData.name} onChange={handleChange} required />
                    </div>
                    {/* Eliminado ProductSelect. Si necesitas otro campo aquí, agrégalo debajo. */}
                    {/* Aquí podrías agregar un select para variantes si ProductSelect no lo maneja */}
                    <div className="col-12">
                      <label className="form-label fw-bold">SKU</label>
                      <input type="text" name="sku" className="form-control" value={formData.sku} onChange={handleChange} required />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold">Marca</label>
                      <select name="brand" className="form-select" value={formData.brand} onChange={handleChange} required>
                        <option value="">Selecciona marca</option>
                        {brands
                          .filter(b => b && b.id != null)
                          .sort((a, b) => {
                            const nameA = (a.description || a.name || '').toLowerCase();
                            const nameB = (b.description || b.name || '').toLowerCase();
                            return nameA.localeCompare(nameB);
                          })
                          .map(b => <option key={b.id} value={b.id}>{b.description || b.name || `Marca ${b.id}`}</option>)}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold">Categoría</label>
                      <select name="category" className="form-select" value={formData.category} onChange={handleChange} required>
                        <option value="">Selecciona categoría</option>
                        {categories
                          .filter(c => c && c.id != null)
                          .sort((a, b) => {
                            const nameA = (a.description || a.name || '').toLowerCase();
                            const nameB = (b.description || b.name || '').toLowerCase();
                            return nameA.localeCompare(nameB);
                          })
                          .map(c => <option key={c.id} value={c.id}>{c.description || c.name || `Categoría ${c.id}`}</option>)}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold">Descripción</label>
                      <textarea name="description" className="form-control" value={formData.description} onChange={handleChange} rows={isMobile ? 4 : 3} required />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold">Código de Barras</label>
                      <input type="text" name="barcode" className="form-control" value={formData.barcode} onChange={handleChange} required />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-bold">Stock Mínimo</label>
                      <input type="number" name="minimum_stock" className="form-control" value={formData.minimum_stock} onChange={handleChange} min="0" required />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-bold">Stock Máximo</label>
                      <input type="number" name="maximum_stock" className="form-control" value={formData.maximum_stock} onChange={handleChange} min="0" required />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-bold">Cantidad Corrugado</label>
                      <input type="number" name="cantidad_corrugado" className="form-control" value={formData.cantidad_corrugado} onChange={handleChange} min="0" required />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-bold">Grupo</label>
                      <input type="number" name="group" className="form-control" value={formData.group} onChange={handleChange} min="0" required />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-bold">Estado</label>
                      <select name="status" className="form-select" value={formData.status} onChange={handleChange} required>
                        <option value="REGULAR">Regular</option>
                        <option value="NUEVO">Nuevo</option>
                        <option value="OFERTA">Oferta</option>
                        <option value="REMATE">Remate</option>
                      </select>
                    </div>
                    
                    {/* Campos de precio */}
                    <div className="col-12">
                      <hr />
                      <h6 className="text-primary">
                        <i className="bi bi-currency-dollar me-2"></i>
                        Precios del Producto
                      </h6>
                    </div>
                    <div className="col-4">
                      <label className="form-label fw-bold">Precio Base</label>
                      <div className="input-group">
                        <span className="input-group-text">$</span>
                        <input 
                          type="number" 
                          name="price" 
                          className="form-control" 
                          value={formData.price} 
                          onChange={handleChange} 
                          min="0" 
                          step="0.01"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="col-4">
                      <label className="form-label fw-bold">Precio de Costo</label>
                      <div className="input-group">
                        <span className="input-group-text">$</span>
                        <input 
                          type="number" 
                          name="cost_price" 
                          className="form-control" 
                          value={formData.cost_price} 
                          onChange={handleChange} 
                          min="0" 
                          step="0.01"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="col-4">
                      <label className="form-label fw-bold">Precio de Venta</label>
                      <div className="input-group">
                        <span className="input-group-text">$</span>
                        <input 
                          type="number" 
                          name="sale_price" 
                          className="form-control" 
                          value={formData.sale_price} 
                          onChange={handleChange} 
                          min="0" 
                          step="0.01"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-bold">Activo</label>
                      <div className="form-check">
                        <input type="checkbox" name="is_active" className="form-check-input" id="is_active" checked={formData.is_active} onChange={handleChange} />
                        <label className="form-check-label" htmlFor="is_active">Producto Activo</label>
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold">Imagen</label>
                      <input type="file" name="image_file" className="form-control mb-2" accept="image/*" onChange={handleChange} />
                      {/* Vista previa de imagen seleccionada o actual */}
                      {formData.image_file ? (
                        <div className="mb-2">
                          <img src={URL.createObjectURL(formData.image_file)} alt="preview" style={{ maxWidth: 120, maxHeight: 120, borderRadius: 8, objectFit: 'cover', border: '1px solid #ddd' }} />
                        </div>
                      ) : (formData.image_url || (editId && products.find(p => p.id === editId)?.image_file)) ? (
                        <div className="mb-2">
                          <img src={formData.image_url || ((editId && products.find(p => p.id === editId)?.image_file) ? ((products.find(p => p.id === editId).image_file.startsWith('http') ? products.find(p => p.id === editId).image_file : `${process.env.REACT_APP_MEDIA_URL || ''}${products.find(p => p.id === editId).image_file}`)) : '')} alt="actual" style={{ maxWidth: 120, maxHeight: 120, borderRadius: 8, objectFit: 'cover', border: '1px solid #ddd' }} />
                        </div>
                      ) : null}
                      <label className="form-label fw-bold">URL de Imagen (opcional)</label>
                      <input type="url" name="image_url" className="form-control" value={formData.image_url} onChange={handleChange} />
                    </div>
                  </div>
                </form>
              </div>
              <div className="modal-footer" onClick={e => e.stopPropagation()}>
                <button type="button" className="btn btn-outline-secondary" disabled={isSubmitting} onClick={() => setShowForm(false)}>
                  ✖ Cancelar
                </button>
                <button type="button" className="btn btn-primary" disabled={isSubmitting} onClick={() => formRef.current?.requestSubmit()}>
                  {isSubmitting ? (<span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>) : '💾 Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
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
