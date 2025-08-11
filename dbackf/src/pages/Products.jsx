

import React, { useEffect, useState } from 'react';
import api from '../services/api';
import useDocumentTitle from '../hooks/useDocumentTitle';

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
  const [currentBusiness, setCurrentBusiness] = useState(1); // Business por defecto
  // Eliminado manejo de múltiples negocios
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', sku: '', brand: '', category: '', barcode: '', minimum_stock: '', maximum_stock: '', price: '', is_active: true, group: '' });
  const [formError, setFormError] = useState('');
  const [editId, setEditId] = useState(null);
  
  // Estados para modal de inventario
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [inventoryProduct, setInventoryProduct] = useState(null);
  const [productInventory, setProductInventory] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [inventoryWarehouseFilter, setInventoryWarehouseFilter] = useState(''); // Filtro por almacén en modal
  
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

  useEffect(() => {
    fetchProducts();
    fetchCurrentBusiness();
    fetchProductWarehouseStocks();
    // Cargar marcas, categorías y almacenes
    api.get('brands/').then(res => setBrands(res.data)).catch(() => setBrands([]));
    api.get('categories/').then(res => setCategories(res.data)).catch(() => setCategories([]));
    api.get('warehouses/').then(res => {
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setWarehouses(data);
    }).catch(() => setWarehouses([]));
  }, []);

  // Debug effect para el search
  useEffect(() => {
    if (search && search.trim()) {
      console.log('Search changed to:', search);
    }
  }, [search]);

  const fetchCurrentBusiness = () => {
    // Intentar obtener el business del usuario actual
    api.get('user/profile/')
      .then(res => {
        if (res.data && res.data.business) {
          setCurrentBusiness(res.data.business.id || res.data.business);
        }
      })
      .catch(() => {
        // Si falla, intentar obtener el primer business disponible
        api.get('businesses/')
          .then(res => {
            if (res.data && res.data.length > 0) {
              setCurrentBusiness(res.data[0].id);
            }
          })
          .catch(() => {
            console.warn('No se pudo obtener business, usando valor por defecto (1)');
          });
      });
  };

  // Eliminada función fetchBusinesses

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
    // Obtener stock de todos los productos por almacén
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

  const filteredProducts = products.filter(p => {
    // Filtro de búsqueda general - mejorado y simplificado
    let matchesSearch = true;
    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim();
      
      // Función helper para limpiar y normalizar texto
      const normalizeText = (text) => {
        return (text || '').toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remover acentos
          .replace(/[^\w\s]/g, ' ') // Reemplazar caracteres especiales con espacios
          .replace(/\s+/g, ' ') // Normalizar espacios múltiples
          .trim();
      };
      
      const searchNormalized = normalizeText(searchLower);
      
      // Buscar en nombre del producto
      const nameMatch = normalizeText(p.name).includes(searchNormalized);
      
      // Buscar en SKU
      const skuMatch = normalizeText(p.sku).includes(searchNormalized);
      
      // Buscar en marca
      let brandMatch = false;
      if (p.brand) {
        if (typeof p.brand === 'object') {
          brandMatch = normalizeText(p.brand.name || p.brand.description).includes(searchNormalized);
        } else {
          brandMatch = normalizeText(String(p.brand)).includes(searchNormalized);
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
      
      // Buscar en precio
      const priceMatch = p.price && normalizeText(String(p.price)).includes(searchNormalized);
      
      matchesSearch = nameMatch || skuMatch || brandMatch || categoryMatch || barcodeMatch || priceMatch;
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
      brand: typeof product.brand === 'object' && product.brand !== null ? product.brand.id : product.brand || '',
      category: typeof product.category === 'object' && product.category !== null ? product.category.id : product.category || '',
      barcode: product.barcode || '',
      minimum_stock: product.minimum_stock || '',
      maximum_stock: product.maximum_stock || '',
      price: product.price || '',
      is_active: product.is_active ?? true,
      group: product.group || ''
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
      brand: '', 
      category: '', 
      barcode: '', 
      minimum_stock: '', 
      maximum_stock: '', 
      price: '',
      is_active: true, 
      group: ''
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
    if (formData.price && (isNaN(formData.price) || parseFloat(formData.price) < 0)) {
      errors.push('El precio debe ser un número positivo');
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
        price: formData.price ? Number(formData.price) : null,
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
      setFormData({ name: '', sku: '', brand: '', category: '', barcode: '', minimum_stock: '', maximum_stock: '', price: '', is_active: true, group: '' });
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
              placeholder="Buscar por nombre, SKU, marca, categoría o precio..."
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
      
      {/* Panel de filtros avanzados (sin negocio) */}
      {showFilters && (
        <div className="card mb-3">
          <div className="card-body">
            <h6 className="card-title">Filtros Avanzados</h6>
            {filters.warehouse && (
              <div className="alert alert-info small mb-3">
                <i className="fas fa-info-circle me-2"></i>
                <strong>Filtro por almacén activo:</strong> Solo se muestran productos que tienen stock disponible en el almacén seleccionado.
              </div>
            )}
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
                <label className="form-label">Almacén</label>
                <select 
                  className="form-select form-select-sm"
                  value={filters.warehouse}
                  onChange={e => handleFilterChange('warehouse', e.target.value)}
                >
                  <option value="">Todos los almacenes</option>
                  {warehouses
                    .sort((a, b) => {
                      const nameA = (a.name || a.description || a.id).toString().toLowerCase();
                      const nameB = (b.name || b.description || b.id).toString().toLowerCase();
                      return nameA.localeCompare(nameB);
                    })
                    .map(w => (
                      <option key={w.id} value={w.id}>{w.name || w.description || `Almacén ${w.id}`}</option>
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
            <input
              type="number"
              name="price"
              className="form-control"
              placeholder="Precio"
              step="0.01"
              min="0"
              value={formData.price}
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
            setFormData({ name: '', sku: '', brand: '', category: '', barcode: '', minimum_stock: '', maximum_stock: '', price: '', is_active: true, group: '' });
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
                {/* <th>Negocio</th> */}
                <th>Código de barras</th>
                <th>Precio</th>
                <th>Stock mínimo</th>
                <th>Stock máximo</th>
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
                      {p.price ? (
                        <span className="text-success fw-bold">
                          ${parseFloat(p.price).toFixed(2)}
                        </span>
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
                          className="btn btn-sm btn-outline-info" 
                          title="Ver inventario"
                          onClick={() => handleViewInventory(p)}
                        >
                          �
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
    </div>
  );
}

export default Products;
