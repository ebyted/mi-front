

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
  const [currentBusiness, setCurrentBusiness] = useState(1); // Business por defecto
  // Eliminado manejo de múltiples negocios
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
  const [inventoryWarehouseFilter, setInventoryWarehouseFilter] = useState(''); // Filtro por almacén en modal
  const [productMovements, setProductMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  
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

  // Estado para vista móvil
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
    // Cargar marcas, categorías y almacenes
    api.get('brands/').then(res => setBrands(res.data)).catch(() => setBrands([]));
    api.get('categories/').then(res => setCategories(res.data)).catch(() => setCategories([]));
    api.get('warehouses/').then(res => {
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setWarehouses(data);
    }).catch(() => setWarehouses([]));
  }, []);

  // Debug effect para el search - MEJORADO
  useEffect(() => {
    if (search && search.trim()) {
      console.log('=== ANÁLISIS DE BÚSQUEDA ===');
      console.log('Término:', search);
      console.log('Total productos cargados:', products.length);
      
      // Mostrar algunos productos para verificar estructura de datos
      if (products.length > 0) {
        console.log('Estructura del primer producto:', {
          name: products[0].name,
          sku: products[0].sku,
          brand: products[0].brand,
          category: products[0].category,
          barcode: products[0].barcode
        });
      }
      
      // Buscar productos que contengan el término en el nombre
      const searchLower = search.toLowerCase();
      const nameMatches = products.filter(p => 
        (p.name || '').toLowerCase().includes(searchLower)
      );
      
      console.log('Productos que contienen el término en el nombre:', nameMatches.length);
      if (nameMatches.length > 0) {
        console.log('Ejemplos:', nameMatches.slice(0, 3).map(p => p.name));
      }
      
      // Buscar por palabras específicas problemáticas
      if (searchLower.includes('ampicilina')) {
        const ampicilinaProducts = products.filter(p => 
          (p.name || '').toLowerCase().includes('ampicilina')
        );
        console.log('=== PRODUCTOS CON AMPICILINA ===');
        console.log('Encontrados:', ampicilinaProducts.length);
        ampicilinaProducts.forEach(p => {
          console.log('- ', p.name, '(SKU:', p.sku, ')');
        });
      }
      
      if (searchLower.includes('loferon')) {
        const loferonProducts = products.filter(p => 
          (p.name || '').toLowerCase().includes('loferon')
        );
        console.log('=== PRODUCTOS CON LOFERON ===');
        console.log('Encontrados:', loferonProducts.length);
        loferonProducts.forEach(p => {
          console.log('- ', p.name, '(SKU:', p.sku, ')');
        });
      }
    }
  }, [search, products]);

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
    // DEBUG ESPECÍFICO PARA AMPICILINA
    const isAmpicilina = (p.name || '').toLowerCase().includes('ampicilina');
    const isSearchingAmpicilina = search && search.toLowerCase().includes('ampicilina');
    
    if (isAmpicilina || isSearchingAmpicilina) {
      console.log('🔍 PRODUCTO AMPICILINA DETECTADO:', {
        nombre: p.name,
        sku: p.sku,
        id: p.id,
        is_active: p.is_active,
        brand: p.brand,
        category: p.category,
        search: search,
        isAmpicilina,
        isSearchingAmpicilina
      });
    }
    
    // Filtro de búsqueda general - SIMPLIFICADO Y ROBUSTO
    let matchesSearch = true;
    if (search && search.trim()) {
      const searchTerm = search.toLowerCase().trim();
      
      // Solo log para productos específicos para no saturar
      if (isAmpicilina || isSearchingAmpicilina) {
        console.log('=== BÚSQUEDA ACTIVA (AMPICILINA) ===');
        console.log('Término de búsqueda:', searchTerm);
        console.log('Evaluando producto:', p.name);
      }
      
      // Función simple de normalización
      const normalize = (text) => {
        if (!text) return '';
        return String(text).toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // quitar acentos
          .trim();
      };
      
      // Obtener todos los textos del producto
      const productName = normalize(p.name || '');
      const productSku = normalize(p.sku || '');
      const productBarcode = normalize(p.barcode || '');
      
      // Obtener marca
      let brandText = '';
      if (p.brand) {
        if (typeof p.brand === 'object') {
          brandText = normalize(p.brand.name || p.brand.description || '');
        } else {
          brandText = normalize(p.brand);
        }
      }
      
      // Obtener categoría
      let categoryText = '';
      if (p.category) {
        if (typeof p.category === 'object') {
          categoryText = normalize(p.category.name || p.category.description || '');
        } else {
          categoryText = normalize(p.category);
        }
      }
      
      // Normalizar término de búsqueda
      const searchNormalized = normalize(searchTerm);
      
      // BÚSQUEDA SIMPLE Y DIRECTA
      const nameMatch = productName.includes(searchNormalized);
      const skuMatch = productSku.includes(searchNormalized);
      const barcodeMatch = productBarcode.includes(searchNormalized);
      const brandMatch = brandText.includes(searchNormalized);
      const categoryMatch = categoryText.includes(searchNormalized);
      
      // BÚSQUEDA POR PALABRAS INDIVIDUALES
      const searchWords = searchNormalized.split(/\s+/).filter(w => w.length > 0);
      const wordMatches = searchWords.map(word => {
        return productName.includes(word) || 
               productSku.includes(word) || 
               brandText.includes(word) || 
               categoryText.includes(word) ||
               productBarcode.includes(word);
      });
      
      const wordMatch = searchWords.length > 0 && wordMatches.some(match => match);
      
      // Debug específico para productos problemáticos
      if (productName.includes('ampicilina') || productName.includes('loferon') || 
          searchNormalized.includes('ampicilina') || searchNormalized.includes('loferon')) {
        console.log('=== PRODUCTO ESPECÍFICO ENCONTRADO ===');
        console.log('Producto:', p.name);
        console.log('Búsqueda normalizada:', searchNormalized);
        console.log('Nombre normalizado:', productName);
        console.log('Name match:', nameMatch);
        console.log('SKU match:', skuMatch);
        console.log('Brand match:', brandMatch);
        console.log('Category match:', categoryMatch);
        console.log('Word match:', wordMatch);
        console.log('Palabras de búsqueda:', searchWords);
        console.log('Coincidencias por palabra:', wordMatches);
      }
      
      // El producto coincide si hay cualquier tipo de match
      matchesSearch = nameMatch || skuMatch || barcodeMatch || brandMatch || categoryMatch || wordMatch;
      
      // Log detallado solo para productos específicos
      if (isAmpicilina || isSearchingAmpicilina) {
        console.log('🎯 RESULTADO BÚSQUEDA AMPICILINA:', {
          producto: p.name,
          matchesSearch,
          nameMatch,
          skuMatch,
          barcodeMatch,
          brandMatch,
          categoryMatch,
          wordMatch
        });
      }
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
    
    // Debug final para productos específicos
    const finalResult = matchesSearch && matchesBrand && matchesCategory && matchesActive && matchesWarehouse && matchesStock;
    
    if (isAmpicilina || isSearchingAmpicilina) {
      console.log('🔧 FILTROS APLICADOS A AMPICILINA:', {
        producto: p.name,
        filtros: filters,
        matchesSearch,
        matchesBrand,
        matchesCategory,
        matchesActive,
        matchesWarehouse,
        matchesStock,
        finalResult
      });
    }
    
    return finalResult;
  });

  // DEBUG: Resumen de productos AMPICILINA
  React.useEffect(() => {
    if (search && search.toLowerCase().includes('ampicilina')) {
      const ampicilinaInProducts = products.filter(p => 
        (p.name || '').toLowerCase().includes('ampicilina')
      );
      const ampicilinaInFiltered = filteredProducts.filter(p => 
        (p.name || '').toLowerCase().includes('ampicilina')
      );
      
      console.log('📊 RESUMEN AMPICILINA:', {
        totalProductos: products.length,
        ampicilinaEnProductos: ampicilinaInProducts.length,
        ampicilinaEnFiltrados: ampicilinaInFiltered.length,
        productosAmpicilina: ampicilinaInProducts.map(p => ({
          nombre: p.name,
          id: p.id,
          activo: p.is_active
        })),
        filtrosActivos: filters
      });
    }
  }, [search, products, filteredProducts, filters]);

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
    console.log('=== ABRIENDO MODAL DE INVENTARIO ===');
    console.log('Producto seleccionado:', product);
    console.log('ID del producto:', product.id);
    
    // Limpiar estado anterior
    setInventoryProduct(product);
    setShowInventoryModal(true);
    setLoadingInventory(true);
    setProductInventory([]);
    setProductMovements([]); // Limpiar movimientos anteriores
    setLoadingMovements(false);
    
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
      // Cargar movimientos del producto
      console.log('=== LLAMANDO A LOAD PRODUCT MOVEMENTS ===');
      console.log('Product ID a enviar:', product.id);
      await loadProductMovements(product.id);
    }
  };

  const loadProductMovements = async (productId) => {
    setLoadingMovements(true);
    setProductMovements([]);
    
    try {
      console.log('=== CARGANDO MOVIMIENTOS ===');
      console.log('Product ID recibido:', productId);
      console.log('Tipo de productId:', typeof productId);
      
      // Probar diferentes parámetros de consulta
      const urls = [
        `/inventory-movements/?product_id=${productId}`,
        `/inventory-movements/?product=${productId}`,
        `/inventory-movements/?product_variant=${productId}`
      ];
      
      let response = null;
      let usedUrl = '';
      
      // Intentar cada URL hasta encontrar una que funcione
      for (const url of urls) {
        try {
          console.log('Intentando URL:', url);
          response = await api.get(url);
          usedUrl = url;
          console.log('✅ URL exitosa:', url);
          break;
        } catch (error) {
          console.log('❌ URL falló:', url, error.message);
          continue;
        }
      }
      
      if (!response) {
        throw new Error('No se pudo obtener movimientos con ningún parámetro');
      }
      const movements = response.data.results || response.data || [];
      
      console.log('=== RESPUESTA DEL API ===');
      console.log('Response completo:', response.data);
      console.log('Movimientos encontrados:', movements);
      console.log('Cantidad de movimientos:', movements.length);
      
      // Filtrar movimientos por producto en el frontend también (doble verificación)
      const filteredMovements = movements.filter(movement => {
        const movementProductId = movement.product_id || movement.product?.id || movement.product;
        const isMatch = String(movementProductId) === String(productId);
        console.log('Verificando movimiento:', {
          movementId: movement.id,
          movementProductId,
          productIdBuscado: productId,
          coincide: isMatch
        });
        return isMatch;
      });
      
      console.log('=== FILTRADO FRONTEND ===');
      console.log('Movimientos después del filtro:', filteredMovements.length);
      
      // Procesar y formatear los movimientos
      const formattedMovements = filteredMovements.map(movement => ({
        id: movement.id,
        date: movement.created_at || movement.date,
        type: movement.type || movement.movement_type,
        reference: movement.reference_document || `${movement.type || 'MOV'}-${String(movement.id).padStart(3, '0')}`,
        quantity: movement.details?.reduce((sum, detail) => sum + (detail.quantity || 0), 0) || movement.quantity || 0,
        balance: 0, // Se calculará después
        user: movement.created_by_email || movement.user || 'Sistema',
        notes: movement.notes || '',
        warehouse: movement.warehouse_name || movement.warehouse?.name || 'N/A',
        productId: movement.product_id || movement.product?.id || movement.product // Para debugging
      }));
      
      // Calcular balance acumulativo
      let runningBalance = 0;
      const movementsWithBalance = formattedMovements
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(movement => {
          const quantity = movement.quantity;
          const isInbound = movement.type === 'IN' || movement.type === 'INGRESO' || movement.type === 'ENTRADA';
          
          if (isInbound) {
            runningBalance += quantity;
          } else {
            runningBalance -= quantity;
          }
          
          return {
            ...movement,
            balance: runningBalance,
            isInbound
          };
        });
      
      console.log('=== RESULTADO FINAL ===');
      console.log('Movimientos finales a mostrar:', movementsWithBalance.length);
      console.log('Primeros 3 movimientos:', movementsWithBalance.slice(0, 3));
      
      setProductMovements(movementsWithBalance);
      
    } catch (err) {
      console.error('=== ERROR AL CARGAR MOVIMIENTOS ===');
      console.error('Product ID:', productId);
      console.error('Error completo:', err);
      console.error('Response del error:', err.response?.data);
      setProductMovements([]);
    } finally {
      setLoadingMovements(false);
    }
  };

  const closeInventoryModal = () => {
    setShowInventoryModal(false);
    setInventoryProduct(null);
    setProductInventory([]);
    setProductMovements([]);
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
              <div className="col-6">
                <button 
                  className="btn btn-info w-100 py-2"
                  onClick={() => handleViewInventory(product)}
                  title="Ver inventario"
                >
                  <i className="bi bi-box me-1"></i>
                  <span className="d-none d-sm-inline">Stock</span>
                </button>
              </div>
            </div>
            <button 
              className="btn btn-warning w-100 py-2"
              onClick={() => setShowDiscountModal({show: true, productId: product.id, productName: product.name})}
            >
              <i className="bi bi-tag me-1"></i>
              <span>Descuentos</span>
            </button>
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
          <button 
            className={`btn btn-primary ${isMobile ? 'btn-lg px-3' : ''}`} 
            onClick={handleNew}
          >
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
            {search && (
              <button 
                className="btn btn-outline-secondary"
                onClick={() => setSearch('')}
                title="Limpiar búsqueda"
              >
                <i className="bi bi-x"></i>
              </button>
            )}
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
        {search && (
          <div className="col-auto">
            <button 
              className="btn btn-outline-info btn-sm"
              onClick={() => {
                console.log('=== DEBUG MANUAL DE BÚSQUEDA ===');
                console.log('Búsqueda actual:', search);
                console.log('Productos totales:', products.length);
                console.log('Productos filtrados:', filteredProducts.length);
                
                // Verificar si existen productos con el término
                const searchLower = search.toLowerCase();
                const directMatches = products.filter(p => 
                  (p.name || '').toLowerCase().includes(searchLower)
                );
                
                console.log('Coincidencias directas en nombre:', directMatches.length);
                directMatches.forEach((p, i) => {
                  if (i < 10) console.log(`${i+1}. ${p.name} (ID: ${p.id})`);
                });
                
                // Verificar productos que no pasaron el filtro pero deberían
                const shouldMatch = products.filter(p => {
                  const name = (p.name || '').toLowerCase();
                  return name.includes(searchLower);
                });
                
                const actualFiltered = filteredProducts.map(p => p.id);
                const notFiltered = shouldMatch.filter(p => !actualFiltered.includes(p.id));
                
                console.log('Productos que deberían aparecer pero no aparecen:', notFiltered.length);
                notFiltered.forEach(p => {
                  console.log('- FALTANTE:', p.name);
                });
                
                alert(`Debug: ${directMatches.length} productos encontrados con "${search}". Ver consola para detalles.`);
              }}
              title="Debug de búsqueda"
            >
              <i className="bi bi-bug me-1"></i>
              Debug
            </button>
          </div>
        )}
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
                  ? (
                    <>
                      {search && (
                        <>
                          Búsqueda: "<strong>{search}</strong>" - No encontrada<br/>
                          <small>Intenta buscar por palabras clave más cortas o revisa la ortografía</small>
                        </>
                      )}
                      {getActiveFiltersCount() > 0 && !search && 'Intenta ajustar los filtros aplicados'}
                    </>
                  )
                  : 'No hay productos registrados aún'
                }
              </p>
              {(search || getActiveFiltersCount() > 0) && (
                <div className="d-flex gap-2 justify-content-center">
                  <button className="btn btn-outline-primary" onClick={clearFilters}>
                    <i className="bi bi-x-circle me-1"></i>
                    Limpiar filtros
                  </button>
                  {search && (
                    <button 
                      className="btn btn-outline-info" 
                      onClick={() => {
                        console.log('=== INFORMACIÓN DE DEBUG ===');
                        console.log('Productos totales:', products.length);
                        console.log('Búsqueda actual:', search);
                        console.log('Productos que contienen partes del término:');
                        
                        const debugMatches = products.filter(p => {
                          const name = (p.name || '').toLowerCase();
                          const searchLower = search.toLowerCase();
                          return name.includes(searchLower.substring(0, 5)) || 
                                 searchLower.includes(name.substring(0, 5));
                        });
                        
                        debugMatches.slice(0, 10).forEach(p => {
                          console.log(`- ${p.name} (SKU: ${p.sku})`);
                        });
                      }}
                    >
                      <i className="bi bi-info-circle me-1"></i>
                      Debug búsqueda
                    </button>
                  )}
                </div>
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
                          className="btn btn-sm btn-outline-info" 
                          title="Ver inventario"
                          onClick={() => handleViewInventory(p)}
                        >
                          🏭
                        </button>
                        <button 
                          className="btn btn-sm btn-outline-warning" 
                          title="Gestionar descuentos"
                          onClick={() => setShowDiscountModal({show: true, productId: p.id, productName: p.name})}
                        >
                          💰
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

                    {/* La sección de stock por almacén ha sido eliminada */}

                    {/* Kardex de Movimientos */}
                    <div className="mt-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="mb-0">
                          <i className="bi bi-card-list me-2"></i>
                          📋 4. Kardex de Movimientos
                        </h6>
                        <div className="d-flex gap-2">
                          <button 
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => loadProductMovements(inventoryProduct.id)}
                            disabled={loadingMovements}
                          >
                            <i className="bi bi-refresh me-1"></i>
                            {loadingMovements ? 'Actualizando...' : 'Actualizar'}
                          </button>
                          <button className="btn btn-outline-success btn-sm">
                            <i className="bi bi-funnel me-1"></i>
                            Filtros
                          </button>
                          <button className="btn btn-outline-info btn-sm">
                            <i className="bi bi-download me-1"></i>
                            Exportar
                          </button>
                        </div>
                      </div>

                      {loadingMovements ? (
                        <div className="text-center py-4">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Cargando movimientos...</span>
                          </div>
                          <p className="mt-2">Cargando historial de movimientos...</p>
                        </div>
                      ) : productMovements.length === 0 ? (
                        <div className="alert alert-info text-center">
                          <i className="bi bi-info-circle me-2"></i>
                          No se encontraron movimientos para este producto
                        </div>
                      ) : (
                        <>
                          {/* Información del Inventario */}
                          <div className="row mb-4">
                            <div className="col-md-3">
                              <div className="card bg-light border-0">
                                <div className="card-body text-center py-2">
                                  <div className="h5 text-primary mb-0">
                                    {productMovements[productMovements.length - 1]?.balance || 0}
                                  </div>
                                  <small className="text-muted">Stock Actual</small>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="card bg-light border-0">
                                <div className="card-body text-center py-2">
                                  <div className="h5 text-success mb-0">$0</div>
                                  <small className="text-muted">Precio Venta</small>
                                  <div><small className="text-muted">Costo: $0</small></div>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="card bg-light border-0">
                                <div className="card-body text-center py-2">
                                  <div className="h5 text-warning mb-0">
                                    {inventoryProduct.minimum_stock || 0}
                                  </div>
                                  <small className="text-muted">Mínimo</small>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="card bg-light border-0">
                                <div className="card-body text-center py-2">
                                  <div className="h5 text-info mb-0">
                                    {inventoryProduct.maximum_stock || 0}
                                  </div>
                                  <small className="text-muted">Máximo</small>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Tabla de Movimientos */}
                          <div className="table-responsive">
                            <table className="table table-hover table-sm">
                              <thead className="table-light">
                                <tr>
                                  <th>Fecha</th>
                                  <th>Tipo</th>
                                  <th>Referencia</th>
                                  <th className="text-center">Cantidad</th>
                                  <th className="text-center">Balance</th>
                                  <th>Usuario</th>
                                  <th>Notas</th>
                                </tr>
                              </thead>
                              <tbody>
                                {productMovements.slice(-10).reverse().map((movement, index) => (
                                  <tr key={movement.id}>
                                    <td>
                                      <small>
                                        {new Date(movement.date).toLocaleDateString('es-MX')}
                                        <br />
                                        <span className="text-muted">
                                          {new Date(movement.date).toLocaleTimeString('es-MX', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </span>
                                      </small>
                                    </td>
                                    <td>
                                      <span className={`badge ${
                                        movement.isInbound 
                                          ? 'bg-success' 
                                          : movement.type === 'AJUSTE' || movement.type === 'ADJUSTMENT'
                                            ? 'bg-info'
                                            : 'bg-danger'
                                      }`}>
                                        {movement.isInbound ? '✅ ENTRADA' : 
                                         movement.type === 'AJUSTE' || movement.type === 'ADJUSTMENT' ? '🔄 AJUSTE +' : '❌ SALIDA'}
                                      </span>
                                    </td>
                                    <td>
                                      <code className="bg-light px-2 py-1 rounded small">
                                        {movement.reference}
                                      </code>
                                    </td>
                                    <td className="text-center">
                                      <span className={`fw-bold ${
                                        movement.isInbound ? 'text-success' : 'text-danger'
                                      }`}>
                                        {movement.isInbound ? '+' : '-'}{Math.abs(movement.quantity)}
                                      </span>
                                    </td>
                                    <td className="text-center">
                                      <span className="fw-bold text-primary">
                                        {movement.balance}
                                      </span>
                                    </td>
                                    <td>
                                      <small className="text-muted">
                                        {movement.user}
                                      </small>
                                    </td>
                                    <td>
                                      <small className="text-muted">
                                        {movement.notes || '-'}
                                      </small>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Resumen de totales */}
                          <div className="row mt-3">
                            <div className="col-md-3">
                              <div className="card bg-success bg-opacity-10 border-success">
                                <div className="card-body text-center py-2">
                                  <div className="h6 text-success mb-0">
                                    +{productMovements
                                      .filter(m => m.isInbound)
                                      .reduce((sum, m) => sum + m.quantity, 0)}
                                  </div>
                                  <small className="text-success">Total Entradas</small>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="card bg-danger bg-opacity-10 border-danger">
                                <div className="card-body text-center py-2">
                                  <div className="h6 text-danger mb-0">
                                    {productMovements
                                      .filter(m => !m.isInbound && m.type !== 'AJUSTE')
                                      .reduce((sum, m) => sum + m.quantity, 0)}
                                  </div>
                                  <small className="text-danger">Total Salidas</small>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="card bg-primary bg-opacity-10 border-primary">
                                <div className="card-body text-center py-2">
                                  <div className="h6 text-primary mb-0">
                                    {productMovements[productMovements.length - 1]?.balance || 0}
                                  </div>
                                  <small className="text-primary">Balance Final</small>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="card bg-info bg-opacity-10 border-info">
                                <div className="card-body text-center py-2">
                                  <div className="h6 text-info mb-0">
                                    {productMovements.length}
                                  </div>
                                  <small className="text-info">Total Movimientos</small>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
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
