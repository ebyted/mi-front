import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectCoverflow } from 'swiper/modules';
import { FixedSizeGrid } from 'react-window';
import { useDebounce } from 'use-debounce';

// Importar estilos de Swiper
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-coverflow';

const EnhancedTijuanaStore = ({ user }) => {
  // Estados principales
  const [allProducts, setAllProducts] = useState([]); // TODOS los productos (2000+)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tijuanaWarehouse, setTijuanaWarehouse] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Estados de filtros
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState('name');
  const [showOutOfStock, setShowOutOfStock] = useState(true);

  // Estados de vista
  const [viewMode, setViewMode] = useState('grid');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10000); // Mostrar todos por defecto

  // Estados del carrito y wishlist
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);

  // Estados de notificaciones
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // Estados de comparación
  const [compareList, setCompareList] = useState([]);
  const [showCompare, setShowCompare] = useState(false);

  // Estados de vista rápida
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [showQuickView, setShowQuickView] = useState(false);

  // Estados de checkout y venta
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    code: '',
    customer_type: 1
  });
  const [orderNotes, setOrderNotes] = useState('');
  
  // Estados para búsqueda de clientes
  const [allCustomers, setAllCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  
  // Estados para edición de clientes
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [customerFormErrors, setCustomerFormErrors] = useState({});
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);

  // Cargar marcas y categorías únicas desde allProducts
  const brands = useMemo(() => {
    if (!Array.isArray(allProducts)) return [];
    const uniqueBrands = [...new Set(allProducts.map(p => p.brand?.name).filter(Boolean))];
    return uniqueBrands.map(name => ({ name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allProducts]);

  const categories = useMemo(() => {
    if (!Array.isArray(allProducts)) return [];
    const uniqueCategories = [...new Set(allProducts.map(p => p.category?.name).filter(Boolean))];
    return uniqueCategories.map(name => ({ name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allProducts]);

  // Productos destacados (los primeros 8 con is_featured = true)
  const featuredProducts = useMemo(() => {
    if (!Array.isArray(allProducts)) return [];
    return allProducts.filter(p => p.is_featured).slice(0, 8);
  }, [allProducts]);

  // Verificar si hay ALGÚN filtro activo
  const hasActiveFilters = useMemo(() => {
    return Boolean(
      search || 
      selectedBrand || 
      selectedCategory || 
      priceRange.min || 
      priceRange.max ||
      !showOutOfStock
    );
  }, [search, selectedBrand, selectedCategory, priceRange.min, priceRange.max, showOutOfStock]);

  // Filtrar productos (solo cuando hay filtros activos)
  const filteredProducts = useMemo(() => {
    // Si NO hay filtros activos, mostrar solo productos destacados
    if (!hasActiveFilters) {
      return featuredProducts;
    }

    // Si hay filtros, aplicarlos sobre TODOS los productos
    return allProducts.filter(product => {
      // Filtro de búsqueda
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          product.name.toLowerCase().includes(searchLower) ||
          product.sku.toLowerCase().includes(searchLower) ||
          product.description?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Filtro de marca
      if (selectedBrand && String(product.brand.name) !== String(selectedBrand)) return false;

      // Filtro de categoría
      if (selectedCategory && String(product.category.name) !== String(selectedCategory)) return false;

      // Filtro de precio
      const finalPrice = product.discount > 0 ? getDiscountedPrice(product.price, product.discount) : product.price;
      if (priceRange.min && finalPrice < parseFloat(priceRange.min)) return false;
      if (priceRange.max && finalPrice > parseFloat(priceRange.max)) return false;

      // Filtro de stock
      if (!showOutOfStock && product.stock <= 0) return false;

      return true;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return (a.discount > 0 ? getDiscountedPrice(a.price, a.discount) : a.price) - 
                 (b.discount > 0 ? getDiscountedPrice(b.price, b.discount) : b.price);
        case 'price-desc':
          return (b.discount > 0 ? getDiscountedPrice(b.price, b.discount) : b.price) - 
                 (a.discount > 0 ? getDiscountedPrice(a.price, a.discount) : a.price);
        case 'stock':
          return b.stock - a.stock;
        case 'rating':
          return b.rating - a.rating;
        case 'discount':
          return b.discount - a.discount;
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [allProducts, featuredProducts, hasActiveFilters, search, selectedBrand, selectedCategory, priceRange, showOutOfStock, sortBy]);

  // Paginación - Mostrar todos si pageSize es muy grande
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const paginatedProducts = useMemo(() => {
    // Si pageSize >= 1000, mostrar todos sin paginar
    if (pageSize >= 1000) {
      return filteredProducts;
    }
    return filteredProducts.slice(
      (page - 1) * pageSize,
      page * pageSize
    );
  }, [filteredProducts, page, pageSize]);

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData();
    loadFromLocalStorage();
  }, []);

  // Auto-refresh cada 30 segundos para obtener cambios de inventario
  useEffect(() => {
    if (!tijuanaWarehouse) return;

    const refreshInterval = setInterval(() => {
      if (!loading) {
        refreshProducts();
      }
    }, 30000); // 30 segundos

    return () => clearInterval(refreshInterval);
  }, [tijuanaWarehouse, loading]);

  // Reset página cuando cambien los filtros
  useEffect(() => {
    setPage(1);
  }, [search, selectedBrand, selectedCategory, priceRange.min, priceRange.max, showOutOfStock, sortBy, pageSize]);

  // Cerrar dropdown de clientes al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCustomerDropdown && !event.target.closest('.position-relative')) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showCustomerDropdown]);

  // Guardar en localStorage cuando cambien cart y wishlist
  useEffect(() => {
    localStorage.setItem('tijuana_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('tijuana_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  // Cargar clientes cuando se abra el checkout
  useEffect(() => {
    if (showCheckout) {
      loadCustomers();
    }
  }, [showCheckout]);

  // Filtrar clientes cuando cambie la búsqueda
  useEffect(() => {
    if (customerSearch.length >= 2) {
      const searchLower = customerSearch.toLowerCase();
      const filtered = allCustomers.filter(customer =>
        customer.name?.toLowerCase().includes(searchLower) ||
        customer.email?.toLowerCase().includes(searchLower) ||
        customer.phone?.includes(customerSearch)
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers([]);
    }
  }, [customerSearch, allCustomers]);

  const loadFromLocalStorage = () => {
    const savedCart = localStorage.getItem('tijuana_cart');
    const savedWishlist = localStorage.getItem('tijuana_wishlist');
    
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Error loading cart from localStorage:', e);
      }
    }
    
    if (savedWishlist) {
      try {
        setWishlist(JSON.parse(savedWishlist));
      } catch (e) {
        console.error('Error loading wishlist from localStorage:', e);
      }
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Función para refrescar solo los productos (sin recargar todo)
  const refreshProducts = async () => {
    if (!tijuanaWarehouse) return;
    
    try {
      console.log('🔄 Refrescando productos...');
      const stockRes = await api.get(`product-warehouse-stocks/?warehouse=${tijuanaWarehouse.id}&page_size=10000`);
      
      let stockData = [];
      if (Array.isArray(stockRes.data)) {
        stockData = stockRes.data;
      } else if (stockRes.data && Array.isArray(stockRes.data.results)) {
        stockData = stockRes.data.results;
      }

      const productsData = Array.isArray(stockData) ? stockData.map(stock => ({
        id: stock.product_variant?.id || stock.product_variant?.product_id,
        variant_id: stock.product_variant?.id,
        name: stock.product_name || stock.product_variant?.name || 'Sin nombre',
        sku: stock.product_code || stock.product_variant?.sku || 'N/A',
        price: parseFloat(stock.sale_price || stock.product_variant?.price || 0),
        stock: parseFloat(stock.quantity || 0),
        brand: { id: stock.brand_id, name: stock.brand_name || 'Sin marca' },
        category: { id: stock.category_id, name: stock.category_name || 'Sin categoría' },
        image: stock.product_variant?.image || stock.image,
        description: stock.product_variant?.description || '',
        warehouse_name: stock.warehouse_name,
        is_active: true,
        is_featured: Math.random() > 0.85,
        rating: Math.floor(Math.random() * 5) + 1,
        discount: Math.random() > 0.9 ? Math.floor(Math.random() * 30) + 5 : 0
      })) : [];

      setAllProducts(Array.isArray(productsData) ? productsData : []);
      setLastUpdate(new Date());
      console.log(`✅ Productos actualizados: ${productsData.length}`);
    } catch (error) {
      console.error('❌ Error refrescando productos:', error);
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Cargar almacenes y encontrar TIJUANA
      const warehousesRes = await api.get('warehouses/');
      const warehousesData = Array.isArray(warehousesRes.data)
        ? warehousesRes.data
        : warehousesRes.data.results || [];
      const tijuana = warehousesData.find(w => 
        w.name.toLowerCase().includes('tijuana') || 
        w.code?.toLowerCase().includes('tij') ||
        w.address?.toLowerCase().includes('tijuana')
      );

      if (!tijuana) {
        throw new Error('No se encontró el almacén de TIJUANA');
      }

      setTijuanaWarehouse(tijuana);

      // Cargar TODOS los productos (sin límite de página)
      console.log('🔄 Cargando TODOS los productos del almacén TIJUANA...');
      const stockRes = await api.get(`product-warehouse-stocks/?warehouse=${tijuana.id}&page_size=10000`);
      
      // Mapear TODOS los productos
      const stockData = Array.isArray(stockRes.data) 
        ? stockRes.data 
        : (stockRes.data.results || []);

      console.log(`✅ Productos cargados: ${stockData.length}`);

      const productsData = stockData.map(stock => ({
        id: stock.product_variant?.id || stock.product_variant?.product_id,
        variant_id: stock.product_variant?.id,
        name: stock.product_name || stock.product_variant?.name || 'Sin nombre',
        sku: stock.product_code || stock.product_variant?.sku || 'N/A',
        price: parseFloat(stock.sale_price || stock.product_variant?.price || 0),
        stock: parseFloat(stock.quantity || 0),
        brand: {
          id: stock.brand_id,
          name: stock.brand_name || 'Sin marca'
        },
        category: {
          id: stock.category_id,
          name: stock.category_name || 'Sin categoría'
        },
        image: stock.product_variant?.image || stock.image,
        description: stock.product_variant?.description || '',
        warehouse_name: stock.warehouse_name,
        is_active: true,
        is_featured: Math.random() > 0.85, // 15% son destacados
        rating: Math.floor(Math.random() * 5) + 1,
        discount: Math.random() > 0.9 ? Math.floor(Math.random() * 30) + 5 : 0
      }));

      setAllProducts(productsData);

      // Cargar clientes
      const customersRes = await api.get('customers/');
      setAllCustomers(customersRes.data || []);

      console.log(`✅ Sistema listo: ${productsData.length} productos, ${productsData.filter(p => p.is_featured).length} destacados`);

    } catch (error) {
      console.error('❌ Error loading data:', error);
      setError(error.message || 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // Funciones del carrito
  const addToCart = (product, quantity = 1) => {
    // Validar que el producto existe
    if (!product) {
      showNotification('Producto no válido', 'error');
      return;
    }

    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      const newTotalQuantity = existingItem.quantity + quantity;
      updateCartQuantity(product.id, newTotalQuantity);
      
      if (product.stock === 0) {
        showNotification(`${product.name} agregado al carrito (Pedido especial - Sin stock)`, 'warning');
      } else if (newTotalQuantity > product.stock) {
        showNotification(`${product.name} agregado. Nota: Cantidad solicitada (${newTotalQuantity}) excede stock disponible (${product.stock})`, 'warning');
      } else {
        showNotification(`Cantidad de ${product.name} actualizada en el carrito`, 'success');
      }
    } else {
      setCart(prev => [...prev, { ...product, quantity: quantity }]);
      
      if (product.stock === 0) {
        showNotification(`${product.name} agregado al carrito (Pedido especial - Sin stock)`, 'warning');
      } else if (quantity > product.stock) {
        showNotification(`${product.name} agregado. Nota: Cantidad solicitada (${quantity}) excede stock disponible (${product.stock})`, 'warning');
      } else {
        showNotification(`${product.name} agregado al carrito`, 'success');
      }
    }
  };

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(prev => prev.map(item => 
      item.id === productId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
    showNotification('Producto eliminado del carrito', 'info');
  };

  const toggleWishlist = (product) => {
    const isInWishlist = wishlist.some(item => item.id === product.id);
    if (isInWishlist) {
      setWishlist(prev => prev.filter(item => item.id !== product.id));
      showNotification('Eliminado de favoritos', 'info');
    } else {
      setWishlist(prev => [...prev, product]);
      showNotification('Agregado a favoritos', 'success');
    }
  };

  const isInWishlist = (productId) => {
    return wishlist.some(item => item.id === productId);
  };

  const toggleCompare = (product) => {
    const isInCompare = compareList.some(item => item.id === product.id);
    if (isInCompare) {
      setCompareList(prev => prev.filter(item => item.id !== product.id));
      showNotification('Eliminado de comparación', 'info');
    } else if (compareList.length < 3) {
      setCompareList(prev => [...prev, product]);
      showNotification('Agregado a comparación', 'success');
    } else {
      showNotification('Máximo 3 productos para comparar', 'warning');
    }
  };

  const isInCompare = (productId) => {
    return compareList.some(item => item.id === productId);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0);
  };

  const getDiscountedPrice = (price, discount) => {
    return price * (1 - discount / 100);
  };

  const isValidUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const getLevelBadgeClass = (level) => {
    switch (level) {
      case 1:
        return 'bg-secondary';
      case 2:
        return 'bg-primary';
      case 3:
        return 'bg-warning text-dark';
      case 4:
        return 'bg-success';
      default:
        return 'bg-secondary';
    }
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => {
      const price = item.discount > 0 ? getDiscountedPrice(item.price, item.discount) : item.price;
      return sum + (price * item.quantity);
    }, 0);
  };

  const loadCustomers = async () => {
    try {
      console.log('📋 Cargando clientes...');
      const response = await api.get('/customers/');
      setAllCustomers(response.data || []);
      console.log('✅ Clientes cargados:', response.data?.length || 0);
    } catch (error) {
      console.error('❌ Error cargando clientes:', error);
      setAllCustomers([]);
    }
  };

  // Funciones de checkout y venta
  const createOrGetDefaultCustomer = async () => {
    try {
      console.log('🔍 Buscando clientes existentes...');
      
      if (selectedCustomer) {
        console.log('✅ Usando cliente seleccionado:', selectedCustomer);
        return selectedCustomer;
      }
      
      // Primero intentar buscar si existe un cliente por defecto
      const customersResponse = await api.get('/customers/');
      console.log('📋 Clientes encontrados:', customersResponse.data);
      
      let defaultCustomer = customersResponse.data.find(c => 
        c.email === 'cliente@tienda.com' || 
        c.name.toLowerCase().includes('tienda') ||
        c.name.toLowerCase().includes('cliente general')
      );
      
      if (!defaultCustomer) {
        console.log('👤 Cliente por defecto no encontrado, creando nuevo...');
        
        // Obtener customer types
        const customerTypesResponse = await api.get('/customer-types/');
        console.log('📋 Tipos de cliente:', customerTypesResponse.data);
        
        let defaultCustomerType = customerTypesResponse.data[0];
        
        if (!defaultCustomerType) {
          console.log('🏷️ Creando tipo de cliente por defecto...');
          const newCustomerType = await api.post('/customer-types/', {
            level: 1,
            discount_percentage: 0
          });
          defaultCustomerType = newCustomerType.data;
          console.log('✅ Tipo de cliente creado:', defaultCustomerType);
        }

        // Crear el cliente por defecto
        const customerName = customerData.name || 'Cliente de Tienda';
        const customerEmail = customerData.email || `cliente${Date.now()}@tienda.com`;
        
        const newCustomerData = {
          name: customerName,
          code: `TIENDA${Date.now()}`,
          email: customerEmail,
          phone: customerData.phone || '',
          address: customerData.address || '',
          customer_type: defaultCustomerType.id,
          is_active: true
        };
        
        console.log('👤 Creando cliente con datos:', newCustomerData);
        const customerResponse = await api.post('/customers/', newCustomerData);
        defaultCustomer = customerResponse.data;
        console.log('✅ Cliente creado exitosamente:', defaultCustomer);
      } else {
        console.log('✅ Cliente por defecto encontrado:', defaultCustomer);
      }
      
      return defaultCustomer;
    } catch (error) {
      console.error('❌ Error creating/getting default customer:', error);
      console.error('📄 Error response:', error.response?.data);
      throw new Error(`No se pudo crear el cliente para la venta: ${error.response?.data?.detail || error.message}`);
    }
  };

  const processSale = async () => {
    console.log('🎯 processSale() iniciado');
    console.log('🔍 Estado COMPLETO del componente en processSale:');
    console.log('  - cart:', cart);
    console.log('  - cart.length:', cart.length);
    console.log('  - selectedCustomer:', selectedCustomer);
    console.log('  - checkoutLoading:', checkoutLoading);
    console.log('  - showCheckout:', showCheckout);
    console.log('  - localStorage cart:', localStorage.getItem('tijuana_cart'));
    
    if (cart.length === 0) {
      console.log('❌ Carrito vacío en processSale()');
      console.log('🔍 Verificando localStorage:', localStorage.getItem('tijuana_cart'));
      showNotification('El carrito está vacío', 'error');
      return;
    }

    // Verificar que haya un cliente seleccionado
    if (!selectedCustomer) {
      console.log('❌ No hay cliente seleccionado');
      showNotification('Debe seleccionar un cliente para procesar la venta', 'error');
      return;
    }

    console.log('🛒 Iniciando proceso de venta con carrito:', cart);
    console.log('💰 Total del carrito:', getCartTotal());
    console.log('👤 Cliente seleccionado:', selectedCustomer);
    
    setCheckoutLoading(true);
    
    try {
      // Usar el cliente seleccionado
      const customer = selectedCustomer;
      console.log('✅ Cliente para la venta:', customer);
      
      // Preparar los items para la venta
      const items = cart.map(item => {
        const finalPrice = item.discount > 0 ? getDiscountedPrice(item.price, item.discount) : item.price;
        console.log(`📦 Item: ${item.name}, ID: ${item.id}, Precio: ${finalPrice}, Cantidad: ${item.quantity}`);
        return {
          product: item.id,  // ID del producto (que en realidad es variant ID)
          quantity: item.quantity,
          unit_price: finalPrice,
          total_price: finalPrice * item.quantity
        };
      });

      console.log('📦 Items preparados para la venta:', items);

      // Crear la orden de venta
      const salesOrderData = {
        customer: customer.id,
        total_amount: getCartTotal(),
        status: 'completed',
        notes: orderNotes || `Venta desde Tienda TIJUANA - Cliente: ${customer.name}`,
        items: items
      };

      console.log('📝 Datos de la orden de venta:', salesOrderData);
      console.log('🌐 Enviando petición a:', `${api.defaults.baseURL}sales-orders/`);

      const response = await api.post('/sales-orders/', salesOrderData);
      console.log('🎉 Respuesta del servidor:', response.data);
      console.log('📊 Status de respuesta:', response.status);
      
      // Crear movimiento de inventario tipo EGRESO, autorizado automáticamente para ventas de tienda
      try {
        const movementData = {
          movement_type: 'EGRESO',
          authorized: true,
          created_by_email: 'tienda@admin.com',
          authorized_by_email: 'tienda@admin.com',
          reference: `Venta Tienda TIJUANA - Orden #${response.data.id || response.data.order_number || 'N/A'}`,
          details: cart.map(item => ({
            product: item.id,
            quantity: item.quantity,
            price: item.price
          }))
        };
        await api.post('inventory-movements/', movementData);
        console.log('✅ Movimiento de inventario creado exitosamente como AUTORIZADO');
      } catch (err) {
        console.error('Error creando movimiento de inventario:', err);
      }

      // Limpiar carrito y mostrar éxito
      console.log('🧹 Limpiando carrito después de venta exitosa');
      console.log('🛒 Cart antes de limpiar:', cart);
      setCart([]);
      localStorage.removeItem('tijuana_cart');
      console.log('✅ Cart limpiado, cerrando modales');
      setShowCheckout(false);
      setShowCart(false);
      showNotification(`¡Venta procesada exitosamente! Orden #${response.data.id || response.data.order_number || 'N/A'} para ${customer.name}`, 'success');
      
      // Limpiar datos del formulario
      setCustomerData({ name: '', email: '', phone: '', address: '', level: 1 });
      setOrderNotes('');
      clearCustomerSelection();
      
    } catch (error) {
      console.error('❌ Error completo:', error);
      console.error('📄 Error response:', error.response);
      console.error('📄 Error response data:', error.response?.data);
      console.error('📄 Error response status:', error.response?.status);
      console.error('📄 Error response headers:', error.response?.headers);
      console.error('📄 Error message:', error.message);
      console.error('📄 Error config:', error.config);
      
      let errorMessage = 'Error al procesar la venta';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.errors) {
          // Manejar errores de validación
          const errorMessages = Object.entries(error.response.data.errors)
            .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
            .join('\n');
          errorMessage = `Errores de validación:\n${errorMessages}`;
        } else {
          // Si hay otros campos de error, mostrarlos
          errorMessage = JSON.stringify(error.response.data, null, 2);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.log('💬 Mensaje de error final:', errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setCheckoutLoading(false);
      console.log('🏁 processSale() terminado');
    }
  };

  const handleCustomerDataChange = (field, value) => {
    setCustomerData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Debounce para la búsqueda
  const [debouncedSearch] = useDebounce(search, 300);

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Cargando...</span>
          </div>
          <h4 className="text-primary">Cargando Tienda TIJUANA...</h4>
          <p className="text-muted">Cargando {allProducts.length > 0 ? allProducts.length : '2000+'} productos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="text-danger mb-3" style={{ fontSize: '4rem' }}>
            <i className="bi bi-exclamation-triangle"></i>
          </div>
          <h4 className="text-danger">Error al cargar la tienda</h4>
          <p className="text-muted">{error}</p>
          <button className="btn btn-primary" onClick={loadInitialData}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="enhanced-tijuana-store">
      <style jsx>{`
        .enhanced-tijuana-store {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          min-height: 100vh;
          padding-bottom: 2rem;
        }
        
        .hero-section {
          background: linear-gradient(rgba(255,255,255,0.9), rgba(240,240,240,0.9)), url('/img/store-bg.jpg');
          background-size: cover;
          background-position: center;
          color: #333;
          padding: 4rem 0;
          margin-bottom: 2rem;
        }
        
        .product-card {
          transition: all 0.3s ease;
          border: none;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 5px 25px rgba(0,0,0,0.1);
          height: 100%;
          background: white;
          position: relative;
        }
        
        .product-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 15px 45px rgba(0,0,0,0.2);
        }
        
        .product-card img {
          height: 220px;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        
        .product-card:hover img {
          transform: scale(1.05);
        }
        
        .product-actions {
          position: absolute;
          top: 10px;
          right: 10px;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .product-card:hover .product-actions {
          opacity: 1;
        }
        
        .discount-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          background: linear-gradient(45deg, #ff4757, #ff3742);
          color: white;
          padding: 0.3rem 0.6rem;
          border-radius: 15px;
          font-size: 0.8rem;
          font-weight: bold;
          z-index: 1;
        }
        
        .stock-badge {
          position: absolute;
          bottom: 10px;
          right: 10px;
          z-index: 1;
          font-size: 0.8rem;
          padding: 0.3rem 0.6rem;
        }
        
        .featured-carousel {
          margin: 2rem 0;
          padding: 2rem;
          background: rgba(255,255,255,0.95);
          border-radius: 20px;
          backdrop-filter: blur(10px);
        }
        
        .featured-product-card {
          background: white;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 8px 30px rgba(0,0,0,0.12);
          transition: all 0.3s ease;
          height: 100%;
        }
        
        .featured-product-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.2);
        }
        
        .swiper-slide {
          height: auto;
        }
        
        .rating {
          color: #ffc107;
        }
        
        .filters-section {
          background: rgba(255,255,255,0.95);
          border-radius: 15px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          backdrop-filter: blur(10px);
          box-shadow: 0 5px 25px rgba(0,0,0,0.1);
        }
        
        .floating-buttons {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .floating-btn {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: none;
          color: white;
          font-size: 1.5rem;
          transition: all 0.3s ease;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .floating-btn:hover {
          transform: scale(1.1);
        }
        
        .cart-btn {
          background: linear-gradient(45deg, #007bff, #0056b3);
          box-shadow: 0 4px 20px rgba(0, 123, 255, 0.4);
        }
        
        .wishlist-btn {
          background: linear-gradient(45deg, #e74c3c, #c0392b);
          box-shadow: 0 4px 20px rgba(231, 76, 60, 0.4);
        }
        
        .compare-btn {
          background: linear-gradient(45deg, #f39c12, #e67e22);
          box-shadow: 0 4px 20px rgba(243, 156, 18, 0.4);
        }
        
        .sidebar {
          position: fixed;
          top: 0;
          right: -400px;
          width: 400px;
          height: 100vh;
          background: white;
          z-index: 1050;
          transition: right 0.3s ease;
          box-shadow: -5px 0 25px rgba(0,0,0,0.2);
          overflow-y: auto;
        }
        
        .sidebar.show {
          right: 0;
        }
        
        .sidebar-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0,0,0,0.5);
          z-index: 1040;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
        }
        
        .sidebar-overlay.show {
          opacity: 1;
          visibility: visible;
        }
        
        .notification {
          position: fixed;
          top: 2rem;
          right: 2rem;
          z-index: 1060;
          min-width: 300px;
          border-radius: 10px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          transform: translateX(${notification.show ? '0' : '100%'});
          transition: transform 0.3s ease;
        }
        
        .quick-view-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0,0,0,0.8);
          z-index: 1070;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: ${showQuickView ? '1' : '0'};
          visibility: ${showQuickView ? 'visible' : 'hidden'};
          transition: all 0.3s ease;
        }
        
        .quick-view-content {
          background: white;
          border-radius: 20px;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          transform: scale(${showQuickView ? '1' : '0.8'});
          transition: transform 0.3s ease;
        }
        
        .customer-search-dropdown {
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 1000;
          max-height: 300px;
          overflow-y: auto;
        }
        
        .customer-search-item {
          padding: 12px 16px;
          border-bottom: 1px solid #f8f9fa;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        
        .customer-search-item:hover {
          background-color: #f8f9fa !important;
        }
        
        .customer-search-item:last-child {
          border-bottom: none;
        }
        
        .customer-search-item .fw-bold {
          color: #495057;
          font-size: 14px;
        }
        
        .customer-search-item .text-muted {
          font-size: 12px;
          color: #6c757d;
        }
        
        .customer-search-item .text-muted i {
          width: 12px;
          text-align: center;
        }
        
        .customer-item:hover {
          background-color: #f8f9fa !important;
          transform: translateX(2px);
        }
        
        .form-control:focus {
          border-color: #007bff;
          box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
        }
        
        .input-group:focus-within {
          box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
          border-radius: 6px;
        }
        
        .alert-success {
          background-color: rgba(25, 135, 84, 0.1);
          border-color: rgba(25, 135, 84, 0.2);
        }
        
        .border-start {
          border-left-width: 4px !important;
        }
      `}</style>

      {/* Notificación */}
      <div className={`notification alert alert-${notification.type}`}>
        <i className={`bi bi-${notification.type === 'success' ? 'check-circle' : notification.type === 'warning' ? 'exclamation-triangle' : 'info-circle'} me-2`}></i>
        {notification.message}
      </div>

      {/* Hero Section */}
      <div className="hero-section">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-8">
              <h1 className="display-4 fw-bold mb-4">
                🏪 Bienvenido a Tienda Virtual de Sancho Distribuciones 
              </h1>
              <p className="lead mb-4">
                Explora nuestra selección exclusiva de productos con la mejor calidad y precios. 
                ¡Ofertas especiales y envío gratuito disponible!
              </p>
              <div className="d-flex flex-wrap gap-3">
                <div className="badge bg-light text-dark p-3">
                  <i className="bi bi-geo-alt-fill me-2"></i>
                  {tijuanaWarehouse?.name}
                </div>
                <div className="badge bg-success p-3">
                  <i className="bi bi-box-seam me-2"></i>
                  {allProducts.length} productos disponibles
                </div>
                <div className="badge bg-warning p-3">
                  <i className="bi bi-star-fill me-2"></i>
                  {featuredProducts.length} productos destacados
                </div>
                <div className="badge bg-info p-3">
                  <i className="bi bi-percent me-2"></i>
                  {allProducts.filter(p => p.discount > 0).length} ofertas activas
                </div>
              </div>
            </div>
            <div className="col-lg-4 text-center">
              <div className="d-inline-block p-4 bg-white rounded-circle shadow">
                <i className="bi bi-shop" style={{ fontSize: '4rem', color: '#007bff' }}></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Carrusel de Productos Destacados */}
        {featuredProducts.length > 0 && (
          <div className="featured-carousel">
            <h2 className="text-center mb-4 fw-bold text-primary">
              ⭐ Productos Destacados
            </h2>
            <Swiper
              modules={[Navigation, Pagination, Autoplay, EffectCoverflow]}
              spaceBetween={20}
              slidesPerView={1}
              navigation
              pagination={{ clickable: true }}
              autoplay={{ delay: 4000, disableOnInteraction: false }}
              effect="coverflow"
              coverflowEffect={{
                rotate: 30,
                stretch: 0,
                depth: 100,
                modifier: 1,
                slideShadows: true,
              }}
              breakpoints={{
                640: { slidesPerView: 2 },
                768: { slidesPerView: 3 },
                1024: { slidesPerView: 4 },
              }}
            >
              {featuredProducts.map(product => (
                <SwiperSlide key={product.id}>
                  <div className="featured-product-card">
                    <div className="position-relative">
                      <span className="badge bg-warning stock-badge">
                        ⭐ Destacado
                      </span>
                      <img
                        loading="lazy"
                        src={isValidUrl(product.image) ? product.image : '/img/producto-fallback.svg'}
                        alt={product.name}
                        className="card-img-top"
                        style={{ height: '200px', objectFit: 'cover' }}
                        onError={e => { e.target.src = '/img/producto-fallback.svg'; }}
                      />
                    </div>
                    <div className="p-3">
                      <h6 className="fw-bold text-truncate">{product.name}</h6>
                      <p className="text-muted small mb-2">
                        {product.brand.name} | Stock: {product.stock}
                      </p>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="h6 text-success mb-0">{formatCurrency(product.price)}</span>
                        <div className="d-flex gap-1">
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => toggleWishlist(product.id)}
                            title={wishlist.includes(product.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                          >
                            <i className={`bi ${wishlist.includes(product.id) ? 'bi-heart-fill' : 'bi-heart'}`}></i>
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => addToCart(product)}
                          >
                            <i className="bi bi-cart-plus"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        )}

        {/* Filtros */}
        <div className="filters-section">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar productos, SKU..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
            
            <div className="col-md-2">
              <select
                className="form-select"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todas las categorías</option>
                {categories
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(cat => (
                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                  ))
                }
              </select>
            </div>
            
            <div className="col-md-2">
              <select
                className="form-select"
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todas las marcas</option>
                {brands
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(brand => (
                    <option key={brand.name} value={brand.name}>{brand.name}</option>
                  ))
                }
              </select>
            </div>
            
            <div className="col-md-2">
              <select
                className="form-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="name">Ordenar: Nombre</option>
                <option value="price">Precio: Menor a mayor</option>
                <option value="price-desc">Precio: Mayor a menor</option>
                <option value="stock">Mayor stock</option>
                <option value="rating">Mejor calificación</option>
                <option value="discount">Mayor descuento</option>
              </select>
            </div>
            
            <div className="col-md-2">
              <div className="btn-group w-100">
                <button
                  className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setViewMode('grid')}
                >
                  <i className="bi bi-grid-3x3-gap"></i>
                </button>
                <button
                  className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setViewMode('list')}
                >
                  <i className="bi bi-list"></i>
                </button>
              </div>
            </div>
          </div>
          
          {/* Filtros de precio */}
          <div className="row mt-3">
            <div className="col-md-3">
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Precio mín"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
                />
              </div>
            </div>
            <div className="col-md-3">
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Precio máx"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
                />
              </div>
            </div>
            <div className="col-md-2">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('');
                  setSelectedBrand('');
                  setPriceRange({ min: '', max: '' });
                  setShowOutOfStock(true);
                  setPage(1);
                }}
              >
                <i className="bi bi-eraser me-2"></i>
                Limpiar
              </button>
            </div>
            <div className="col-md-2">
              <button
                className="btn btn-success w-100"
                onClick={refreshProducts}
                disabled={loading || !tijuanaWarehouse}
                title="Actualizar inventario desde el servidor"
              >
                <i className="bi bi-arrow-clockwise me-2"></i>
                Actualizar
              </button>
            </div>
            <div className="col-md-2">
              <div className="form-check form-switch d-flex justify-content-center align-items-center">
                <input
                  className="form-check-input me-2"
                  type="checkbox"
                  role="switch"
                  id="showOutOfStockSwitch"
                  checked={showOutOfStock}
                  onChange={(e) => {
                    setShowOutOfStock(e.target.checked);
                    setPage(1);
                  }}
                />
                <label className="form-check-label" htmlFor="showOutOfStockSwitch">
                  <small>Mostrar sin stock</small>
                </label>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-muted text-center pt-2">
                {filteredProducts.length} {hasActiveFilters ? 'encontrados' : 'destacados'} de {allProducts.length} total
              </div>
            </div>
          </div>
        </div>

        {/* Indicador informativo */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className={`alert ${hasActiveFilters ? 'alert-info' : 'alert-success'} d-inline-flex align-items-center py-2 px-3 mb-0`} role="alert" style={{ fontSize: '0.9rem' }}>
            <i className={`bi ${hasActiveFilters ? 'bi-funnel' : 'bi-star-fill'} me-2`}></i>
            <span className="fw-medium">
              {hasActiveFilters 
                ? `Filtrando ${filteredProducts.length} producto(s)` 
                : `Mostrando ${featuredProducts.length} productos destacados`
              }
            </span>
            {hasActiveFilters && (
              <button 
                className="btn btn-sm btn-outline-secondary ms-3"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('');
                  setSelectedBrand('');
                  setPriceRange({ min: '', max: '' });
                  setShowOutOfStock(true);
                }}
              >
                <i className="bi bi-x me-1"></i>
                Ver destacados
              </button>
            )}
          </div>
          
          {lastUpdate && (
            <div className="alert alert-secondary d-inline-flex align-items-center py-2 px-3 mb-0" style={{ fontSize: '0.85rem' }}>
              <i className="bi bi-clock-history me-2"></i>
              <span>
                Última actualización: {lastUpdate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          )}
        </div>

        {/* Lista de productos */}
        {paginatedProducts.length === 0 ? (
          <div className="text-center py-5">
            <div className="mb-4" style={{ fontSize: '5rem', opacity: 0.3 }}>
              <i className="bi bi-search"></i>
            </div>
            <h4 className="text-secondary">
              {hasActiveFilters ? 'No se encontraron productos con esos filtros' : 'No hay productos destacados disponibles'}
            </h4>
            <p className="text-muted">
              {hasActiveFilters 
                ? 'Intenta ajustar los criterios de búsqueda' 
                : 'Los productos destacados aparecerán aquí cuando estén disponibles'
              }
            </p>
            {hasActiveFilters && (
              <button 
                className="btn btn-primary mt-3"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('');
                  setSelectedBrand('');
                  setPriceRange({ min: '', max: '' });
                  setShowOutOfStock(true);
                }}
              >
                <i className="bi bi-arrow-clockwise me-2"></i>
                Ver productos destacados
              </button>
            )}
          </div>
        ) : (
          <>
            <div className={viewMode === 'grid' ? 'row g-4' : ''}>
              {viewMode === 'grid' && paginatedProducts.map(product => {
                const stockColor = product.stock > 10 ? 'success' : 
                                   product.stock > 5 ? 'warning' : 
                                   product.stock > 0 ? 'danger' : 'secondary';
                const finalPrice = product.discount > 0 ? getDiscountedPrice(product.price, product.discount) : product.price;
                
                return (
                  <div key={product.id} className="col-md-6 col-lg-4 col-xl-3">
                    <div className="card product-card h-100">
                      {product.discount > 0 && (
                        <div className="discount-badge">
                          -{product.discount}%
                        </div>
                      )}
                      
                      <div className="product-actions">
                        <button
                          className={`btn btn-sm ${isInWishlist(product.id) ? 'btn-danger' : 'btn-outline-danger'} me-1`}
                          onClick={() => toggleWishlist(product)}
                          title="Agregar a favoritos"
                        >
                          <i className={`bi bi-heart${isInWishlist(product.id) ? '-fill' : ''}`}></i>
                        </button>
                        <button
                          className={`btn btn-sm ${isInCompare(product.id) ? 'btn-warning' : 'btn-outline-warning'} me-1`}
                          onClick={() => toggleCompare(product)}
                          title="Comparar producto"
                        >
                          <i className="bi bi-arrow-left-right"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-outline-info"
                          onClick={() => {
                            setQuickViewProduct(product);
                            setShowQuickView(true);
                          }}
                          title="Vista rápida"
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                      </div>
                      
                      <div className="position-relative">
                        <span className={`badge bg-${stockColor} stock-badge`}>
                          {product.stock > 0 ? `Stock: ${product.stock}` : 'Sin Stock'}
                          {product.stock === 0 && <i className="bi bi-x-circle ms-1"></i>}
                        </span>
                        <img
                          loading="lazy"
                          src={isValidUrl(product.image) ? product.image : '/img/producto-fallback.svg'}
                          alt={product.name}
                          className="card-img-top"
                          onError={e => { e.target.src = '/img/producto-fallback.svg'; }}
                        />
                      </div>
                      
                      <div className="card-body d-flex flex-column">
                        <h6 className="card-title fw-bold text-truncate" title={product.name}>
                          {product.name}
                        </h6>
                        <p className="text-muted small mb-2">
                          <i className="bi bi-tag me-1"></i>{product.brand.name}
                          <br />
                          <i className="bi bi-collection me-1"></i>{product.category.name}
                          <br />
                          <i className="bi bi-upc me-1"></i>{product.sku}
                        </p>
                        
                        <div className="rating mb-2">
                          {[...Array(5)].map((_, i) => (
                            <i key={i} className={`bi bi-star${i < product.rating ? '-fill' : ''}`}></i>
                          ))}
                          <small className="text-muted ms-2">({product.rating}/5)</small>
                        </div>
                        
                        <div className="mt-auto">
                          <div className="mb-3">
                            {product.discount > 0 ? (
                              <div>
                                <span className="h5 text-success mb-0">{formatCurrency(finalPrice)}</span>
                                <br />
                                <small className="text-muted text-decoration-line-through">
                                  {formatCurrency(product.price)}
                                </small>
                              </div>
                            ) : (
                              <span className="h5 text-success mb-0">{formatCurrency(product.price)}</span>
                            )}
                          </div>
                          
                          <button
                            className={`btn w-100 ${product.stock > 0 ? 'btn-primary' : 'btn-warning'}`}
                            onClick={() => addToCart(product)}
                          >
                            <i className={`bi ${product.stock > 0 ? 'bi-cart-plus' : 'bi-cart-dash'} me-2`}></i>
                            {product.stock > 0 ? 'Agregar al carrito' : 'Pedido especial'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {viewMode === 'list' && (
                <FixedSizeGrid
                  columnCount={1}
                  rowHeight={120}
                  height={Math.min(paginatedProducts.length * 120, 600)}
                  width="100%"
                  className="mb-4"
                >
                  {paginatedProducts.map((product, index) => {
                    const stockColor = product.stock > 10 ? 'success' : 
                                       product.stock > 5 ? 'warning' : 
                                       product.stock > 0 ? 'danger' : 'secondary';
                    const finalPrice = product.discount > 0 ? getDiscountedPrice(product.price, product.discount) : product.price;
                    
                    return (
                      <div key={product.id} className="card mb-3 product-card" style={{ cursor: 'pointer' }}>
                        <div className="row g-0">
                          <div className="col-md-4">
                            <div className="position-relative">
                              {product.discount > 0 && (
                                <div className="discount-badge">
                                  -{product.discount}%
                                </div>
                              )}
                              <span className={`badge bg-${stockColor} stock-badge`}>
                                {product.stock > 0 ? `Stock: ${product.stock}` : 'Sin Stock'}
                                {product.stock === 0 && <i className="bi bi-x-circle ms-1"></i>}
                              </span>
                              <img
                                loading="lazy"
                                src={isValidUrl(product.image) ? product.image : '/img/producto-fallback.svg'}
                                alt={product.name}
                                className="img-fluid rounded-start h-100"
                                style={{ objectFit: 'cover', minHeight: '200px' }}
                                onError={e => { e.target.src = '/img/producto-fallback.svg'; }}
                              />
                            </div>
                          </div>
                          <div className="col-md-8">
                            <div className="card-body d-flex flex-column h-100">
                              <div>
                                <h5 className="card-title fw-bold">{product.name}</h5>
                                <p className="text-muted">
                                  <i className="bi bi-tag me-1"></i>{product.brand.name} | 
                                  <i className="bi bi-collection ms-2 me-1"></i>{product.category.name} | 
                                  <i className="bi bi-upc ms-2 me-1"></i>{product.sku}
                                </p>
                                
                                <div className="rating mb-2">
                                  {[...Array(5)].map((_, i) => (
                                    <i key={i} className={`bi bi-star${i < product.rating ? '-fill' : ''}`}></i>
                                  ))}
                                  <small className="text-muted ms-2">({product.rating}/5)</small>
                                </div>
                                
                                {product.description && (
                                  <p className="card-text">{product.description}</p>
                                )}
                              </div>
                              <div className="mt-auto d-flex justify-content-between align-items-center">
                                <div>
                                  {product.discount > 0 ? (
                                    <div>
                                      <span className="h4 text-success">{formatCurrency(finalPrice)}</span>
                                      <br />
                                      <small className="text-muted text-decoration-line-through">
                                        {formatCurrency(product.price)}
                                      </small>
                                    </div>
                                  ) : (
                                    <span className="h4 text-success">{formatCurrency(product.price)}</span>
                                  )}
                                  <br />
                                  <small className="text-muted">Stock disponible: {product.stock}</small>
                                </div>
                                <div className="d-flex gap-2">
                                  <button
                                    className={`btn ${isInWishlist(product.id) ? 'btn-danger' : 'btn-outline-danger'}`}
                                    onClick={() => toggleWishlist(product)}
                                    title="Favoritos"
                                  >
                                    <i className={`bi bi-heart${isInWishlist(product.id) ? '-fill' : ''}`}></i>
                                  </button>
                                  <button
                                    className={`btn ${isInCompare(product.id) ? 'btn-warning' : 'btn-outline-warning'}`}
                                    onClick={() => toggleCompare(product)}
                                    title="Comparar"
                                  >
                                    <i className="bi bi-arrow-left-right"></i>
                                  </button>
                                  <button
                                    className={`btn btn-lg ${product.stock > 0 ? 'btn-primary' : 'btn-warning'}`}
                                    onClick={() => addToCart(product)}
                                  >
                                    <i className={`bi ${product.stock > 0 ? 'bi-cart-plus' : 'bi-cart-dash'} me-2`}></i>
                                    {product.stock > 0 ? 'Agregar al carrito' : 'Pedido especial'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </FixedSizeGrid>
              )}
            </div>

            {/* Información y controles de paginación */}
            {filteredProducts.length > 0 && (
              <div className="mt-4">
                {/* Contador de resultados y selector de items por página */}
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                  <div className="text-muted">
                    {pageSize >= 1000 
                      ? `Mostrando todos los ${filteredProducts.length} productos`
                      : `Mostrando ${((page - 1) * pageSize) + 1} - ${Math.min(page * pageSize, filteredProducts.length)} de ${filteredProducts.length} productos`
                    }
                  </div>
                  
                  <div className="d-flex align-items-center gap-2">
                    <label className="mb-0 text-muted small">Productos por página:</label>
                    <select 
                      className="form-select form-select-sm" 
                      style={{ width: 'auto' }}
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                    >
                      <option value="10000">Todos</option>
                      <option value="12">12</option>
                      <option value="24">24</option>
                      <option value="48">48</option>
                      <option value="96">96</option>
                    </select>
                  </div>
                </div>

                {/* Paginación mejorada - solo si no estamos mostrando todos */}
                {totalPages > 1 && pageSize < 1000 && (
                  <nav>
                    <ul className="pagination justify-content-center flex-wrap">
                      {/* Primera página */}
                      <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => setPage(1)}
                          disabled={page === 1}
                          title="Primera página"
                        >
                          <i className="bi bi-chevron-double-left"></i>
                        </button>
                      </li>

                      {/* Anterior */}
                      <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => setPage(page - 1)}
                          disabled={page === 1}
                        >
                          <i className="bi bi-chevron-left"></i> Anterior
                        </button>
                      </li>
                      
                      {/* Números de página (mostrar máximo 7 páginas) */}
                      {(() => {
                        const maxPagesToShow = 7;
                        let startPage = Math.max(1, page - Math.floor(maxPagesToShow / 2));
                        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
                        
                        // Ajustar si estamos cerca del final
                        if (endPage - startPage < maxPagesToShow - 1) {
                          startPage = Math.max(1, endPage - maxPagesToShow + 1);
                        }

                        const pages = [];
                        
                        // Mostrar "..." si no empezamos en 1
                        if (startPage > 1) {
                          pages.push(
                            <li key="start-ellipsis" className="page-item disabled">
                              <span className="page-link">...</span>
                            </li>
                          );
                        }

                        // Páginas numeradas
                        for (let i = startPage; i <= endPage; i++) {
                          pages.push(
                            <li key={i} className={`page-item ${page === i ? 'active' : ''}`}>
                              <button
                                className={`page-link ${page === i ? 'bg-primary border-primary text-white' : 'text-primary'}`}
                                onClick={() => setPage(i)}
                              >
                                {i}
                              </button>
                            </li>
                          );
                        }

                        // Mostrar "..." si no terminamos en la última
                        if (endPage < totalPages) {
                          pages.push(
                            <li key="end-ellipsis" className="page-item disabled">
                              <span className="page-link">...</span>
                            </li>
                          );
                        }

                        return pages;
                      })()}
                      
                      {/* Siguiente */}
                      <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => setPage(page + 1)}
                          disabled={page === totalPages}
                        >
                          Siguiente <i className="bi bi-chevron-right"></i>
                        </button>
                      </li>

                      {/* Última página */}
                      <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => setPage(totalPages)}
                          disabled={page === totalPages}
                          title="Última página"
                        >
                          <i className="bi bi-chevron-double-right"></i>
                        </button>
                      </li>
                    </ul>
                  </nav>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Botones flotantes */}
      <div className="floating-buttons">
        {compareList.length > 0 && (
          <button
            className="floating-btn compare-btn"
            onClick={() => setShowCompare(true)}
            title="Ver comparación"
          >
            <i className="bi bi-arrow-left-right"></i>
            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
              {compareList.length}
            </span>
          </button>
        )}
        
        <button
          className="floating-btn wishlist-btn"
          onClick={() => setShowWishlist(true)}
          title="Ver favoritos"
        >
          <i className="bi bi-heart"></i>
          {wishlist.length > 0 && (
            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-light text-dark">
              {wishlist.length}
            </span>
          )}
        </button>
        
        <button
          className="floating-btn cart-btn"
          onClick={() => setShowCart(true)}
          title="Ver carrito"
        >
          <i className="bi bi-cart3"></i>
          {cart.length > 0 && (
            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {/* Overlays y Sidebars se agregarían aquí */}
      {/* ... (continuaría con los componentes de carrito, wishlist, comparación y vista rápida) */}
      
      {/* Sidebar overlay */}
      <div className={`sidebar-overlay ${showCart || showWishlist || showCompare ? 'show' : ''}`} onClick={() => {
        setShowCart(false);
        setShowWishlist(false);
        setShowCompare(false);
      }}></div>

      {/* Carrito Sidebar */}
      <div className={`sidebar ${showCart ? 'show' : ''}`}>
        <div className="p-3 border-bottom bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0 text-dark">
              <i className="bi bi-cart3 me-2"></i>
              Mi Carrito ({cart.reduce((sum, item) => sum + item.quantity, 0)})
            </h5>
            <button
              className="btn btn-link text-dark p-0"
              onClick={() => setShowCart(false)}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        </div>

        <div className="p-3">
          {cart.length === 0 ? (
            <div className="text-center text-muted py-5">
              <i className="bi bi-cart-x" style={{ fontSize: '3rem' }}></i>
              <p className="mt-3">Tu carrito está vacío</p>
            </div>
          ) : (
            <>
              <div className="mb-3" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {cart.map(item => {
                  const finalPrice = item.discount > 0 ? getDiscountedPrice(item.price, item.discount) : item.price;
                  return (
                    <div key={item.id} className="d-flex align-items-center border-bottom py-3">
                      <img
                        src={isValidUrl(item.image) ? item.image : '/img/producto-fallback-small.svg'}
                        alt={item.name}
                        className="rounded me-3"
                        style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                        onError={e => { e.target.src = '/img/producto-fallback-small.svg'; }}
                      />
                      <div className="flex-grow-1">
                        <h6 className="mb-1 text-truncate">{item.name}</h6>
                        <div className="text-muted small">
                          {item.discount > 0 ? (
                            <>
                              {formatCurrency(finalPrice)}
                              <span className="text-decoration-line-through ms-2">{formatCurrency(item.price)}</span>
                            </>
                          ) : (
                            formatCurrency(item.price)
                          )}
                          {item.stock === 0 && (
                            <span className="badge bg-warning text-dark ms-2 small">
                              <i className="bi bi-exclamation-triangle-fill me-1"></i>
                              Pedido especial
                            </span>
                          )}
                          {item.quantity > item.stock && item.stock > 0 && (
                            <span className="badge bg-info text-dark ms-2 small">
                              <i className="bi bi-info-circle-fill me-1"></i>
                              Excede stock disponible
                            </span>
                          )}
                        </div>
                        <div className="d-flex align-items-center mt-2">
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                          >
                            <i className="bi bi-dash"></i>
                          </button>
                          <span className="mx-3 fw-bold">{item.quantity}</span>
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                          >
                            <i className="bi bi-plus"></i>
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm ms-3"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-top pt-3">
                {(() => {
                  const productsWithoutStock = cart.filter(item => item.stock === 0);
                  const productsExceedingStock = cart.filter(item => item.quantity > item.stock && item.stock > 0);
                  
                  return (productsWithoutStock.length > 0 || productsExceedingStock.length > 0) && (
                    <div className="mb-3">
                      {productsWithoutStock.length > 0 && (
                        <div className="alert alert-warning py-2 small mb-1">
                          <i className="bi bi-exclamation-triangle-fill me-2"></i>
                          {productsWithoutStock.length} producto(s) en pedido especial
                        </div>
                      )}
                      {productsExceedingStock.length > 0 && (
                        <div className="alert alert-info py-2 small mb-1">
                          <i className="bi bi-info-circle-fill me-2"></i>
                          {productsExceedingStock.length} producto(s) exceden stock disponible
                        </div>
                      )}
                    </div>
                  );
                })()}
                
                <div className="d-flex justify-content-between mb-3">
                  <strong>Total:</strong>
                  <strong className="text-success h5">{formatCurrency(getCartTotal())}</strong>
                </div>
                
                <div className="d-grid gap-2">
                  <button 
                    className="btn btn-success btn-lg"
                    onClick={() => {
                      console.log('🚀 Botón verde clickeado - Abriendo checkout');
                      console.log('🛒 Cart items:', cart.length);
                      console.log('⏳ Checkout loading:', checkoutLoading);
                      // Abrir modal de checkout para búsqueda de cliente
                      setShowCheckout(true);
                      console.log('✅ showCheckout establecido a true');
                    }}
                    disabled={cart.length === 0 || checkoutLoading}
                  >
                    {checkoutLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Procesando venta...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-person-plus me-2"></i>
                        Seleccionar Cliente y Finalizar ({formatCurrency(getCartTotal())})
                      </>
                    )}
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setCart([]);
                      localStorage.removeItem('tijuana_cart');
                    }}
                  >
                    <i className="bi bi-trash me-2"></i>
                    Vaciar carrito
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal de vista rápida */}
      <div className="quick-view-modal" onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowQuickView(false);
          setQuickViewProduct(null);
        }
      }}>
        {quickViewProduct && (
          <div className="quick-view-content p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="mb-0">Vista Rápida</h4>
              <button
                className="btn btn-link p-0"
                onClick={() => {
                  setShowQuickView(false);
                  setQuickViewProduct(null);
                }}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            
            <div className="row">
              <div className="col-md-6">
                <img
                  src={isValidUrl(quickViewProduct.image) ? quickViewProduct.image : '/img/producto-fallback.svg'}
                  alt={quickViewProduct.name}
                  className="img-fluid rounded"
                  onError={e => { e.target.src = '/img/producto-fallback.svg'; }}
                />
              </div>
              <div className="col-md-6">
                <h5 className="fw-bold">{quickViewProduct.name}</h5>
                <p className="text-muted">SKU: {quickViewProduct.sku}</p>
                
                <div className="rating mb-3">
                  {[...Array(5)].map((_, i) => (
                    <i key={i} className={`bi bi-star${i < quickViewProduct.rating ? '-fill' : ''}`}></i>
                  ))}
                  <small className="text-muted ms-2">({quickViewProduct.rating}/5)</small>
                </div>
                
                <div className="mb-3">
                  {quickViewProduct.discount > 0 ? (
                    <div>
                      <span className="h4 text-success">
                        {formatCurrency(getDiscountedPrice(quickViewProduct.price, quickViewProduct.discount))}
                      </span>
                      <br />
                      <span className="text-muted text-decoration-line-through">
                        {formatCurrency(quickViewProduct.price)}
                      </span>
                      <span className="badge bg-danger ms-2">-{quickViewProduct.discount}%</span>
                    </div>
                  ) : (
                    <span className="h4 text-success">{formatCurrency(quickViewProduct.price)}</span>
                  )}
                </div>
                
                <p><strong>Marca:</strong> {quickViewProduct.brand.name}</p>
                <p><strong>Categoría:</strong> {quickViewProduct.category.name}</p>
                <p><strong>Stock disponible:</strong> {quickViewProduct.stock} unidades</p>
                
                {quickViewProduct.description && (
                  <p><strong>Descripción:</strong> {quickViewProduct.description}</p>
                )}
                
                <div className="d-grid gap-2 mt-4">
                  <button
                    className={`btn btn-lg ${quickViewProduct?.stock > 0 ? 'btn-primary' : 'btn-warning'}`}
                    onClick={() => {
                      addToCart(quickViewProduct);
                      setShowQuickView(false);
                      setQuickViewProduct(null);
                    }}
                  >
                    <i className={`bi ${quickViewProduct?.stock > 0 ? 'bi-cart-plus' : 'bi-cart-dash'} me-2`}></i>
                    {quickViewProduct?.stock > 0 ? 'Agregar al carrito' : 'Pedido especial'}
                  </button>
                  <div className="row">
                    <div className="col">
                      <button
                        className={`btn w-100 ${isInWishlist(quickViewProduct.id) ? 'btn-danger' : 'btn-outline-danger'}`}
                        onClick={() => toggleWishlist(quickViewProduct)}
                      >
                        <i className={`bi bi-heart${isInWishlist(quickViewProduct.id) ? '-fill' : ''} me-2`}></i>
                        {isInWishlist(quickViewProduct.id) ? 'En favoritos' : 'Agregar a favoritos'}
                      </button>
                    </div>
                    <div className="col">
                      <button
                        className={`btn w-100 ${isInCompare(quickViewProduct.id) ? 'btn-warning' : 'btn-outline-warning'}`}
                        onClick={() => toggleCompare(quickViewProduct)}
                      >
                        <i className="bi bi-arrow-left-right me-2"></i>
                        {isInCompare(quickViewProduct.id) ? 'En comparación' : 'Comparar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Checkout */}
        {showCheckout && (
          <div 
            style={{ 
              backgroundColor: 'rgba(255,0,0,0.98)', 
              zIndex: 9999999,
             
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              visibility: 'visible',
              opacity: 1
            }}
            onClick={(e) => {
              console.log('🎯 Modal backdrop clickeado');
              if (e.target === e.currentTarget) {
                setShowCheckout(false);
              }
            }}
          >
            <div className="modal-dialog modal-lg" style={{ margin: 'auto', maxWidth: '800px', width: '90%' }}>
              <div className="modal-content" style={{ border: '3px solid #28a745', boxShadow: '0 0 30px rgba(0,0,0,0.5)' }}>
                <div className="modal-header bg-success text-white">
                  <h5 className="modal-title">
                    <i className="bi bi-credit-card me-2"></i>
                    Finalizar Compra
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => {
                      setShowCheckout(false);
                    }}
                  ></button>
                </div>
                
                <div className="modal-body">
                  {/* Resumen del pedido */}
                  <div className="row">
                    <div className="col-md-8">
                      <h6 className="border-bottom pb-2 mb-3">
                        <i className="bi bi-person-circle me-2"></i>
                        Información del Cliente
                      </h6>
                      
                      {/* Búsqueda de clientes mejorada */}
                      <div className="mb-4">
                        <label className="form-label fw-bold">
                          <i className="bi bi-search me-2 text-primary"></i>
                          Buscar Cliente Existente
                        </label>
                        <div className="position-relative">
                          <div className="input-group">
                            <span className="input-group-text bg-light">
                              <i className="bi bi-person-search"></i>
                            </span>
                            <input
                              type="text"
                              className="form-control form-control-lg"
                              value={customerSearchTerm}
                              onChange={(e) => handleCustomerSearch(e.target.value)}
                              placeholder="Escribe nombre, email, teléfono o dirección del cliente..."
                              onFocus={() => customerSearchTerm.length >= 2 && setShowCustomerDropdown(true)}
                              style={{ fontSize: '16px' }}
                              disabled={showNewCustomerForm}
                            />
                            {customerSearchTerm && !showNewCustomerForm && (
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={clearCustomerSelection}
                                title="Limpiar búsqueda"
                              >
                                <i className="bi bi-x-lg"></i>
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={startNewCustomer}
                              title="Crear cliente nuevo"
                            >
                              <i className="bi bi-person-plus"></i>
                            </button>
                          </div>
                          
                          {/* Indicador de búsqueda */}
                          {customerSearchTerm && customerSearchTerm.length >= 2 && (
                            <div className="mt-2">
                              <small className="text-muted">
                                <i className="bi bi-info-circle me-1"></i>
                                {filteredCustomers.length > 0 
                                  ? `${filteredCustomers.length} cliente(s) encontrado(s)` 
                                  : 'No se encontraron clientes con ese criterio'
                                }
                              </small>
                            </div>
                          )}
                          
                          {/* Dropdown de resultados mejorado */}
                          {showCustomerDropdown && filteredCustomers.length > 0 && (
                            <div className="position-absolute w-100 bg-white border rounded-3 shadow-lg mt-1" style={{ zIndex: 1000, maxHeight: '400px', overflowY: 'auto' }}>
                              <div className="p-2 bg-light border-bottom">
                                <small className="text-muted fw-bold">
                                  <i className="bi bi-people me-1"></i>
                                  Selecciona un cliente:
                                </small>
                              </div>
                              {filteredCustomers.map((customer, index) => (
                                <div
                                  key={customer.id}
                                  className="p-3 border-bottom cursor-pointer hover-bg-light customer-item"
                                  onClick={() => selectCustomer(customer)}
                                  style={{ 
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    borderLeft: '4px solid transparent'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                                    e.currentTarget.style.borderLeftColor = '#007bff';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'white';
                                    e.currentTarget.style.borderLeftColor = 'transparent';
                                  }}
                                >
                                  <div className="d-flex align-items-center">
                                    <div className="me-3">
                                      <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                                        <i className="bi bi-person-fill"></i>
                                      </div>
                                    </div>
                                    <div className="flex-grow-1">
                                      <div className="fw-bold text-dark">{customer.name}</div>
                                      <div className="text-muted small">
                                        {customer.email && (
                                          <div className="mb-1">
                                            <i className="bi bi-envelope me-1 text-primary"></i>
                                            {customer.email}
                                          </div>
                                        )}
                                        {customer.phone && (
                                          <div className="mb-1">
                                            <i className="bi bi-telephone me-1 text-success"></i>
                                            {customer.phone}
                                          </div>
                                        )}
                                        {customer.address && (
                                          <div className="mb-1">
                                            <i className="bi bi-geo-alt me-1 text-warning"></i>
                                            {customer.address}
                                          </div>
                                        )}
                                        {/* Mostrar nivel del cliente */}
                                        <div>
                                          <span className={`badge ${getLevelBadgeClass(customer.level || 1)} badge-sm`}>
                                            <i className="bi bi-star-fill me-1"></i>
                                            Nivel {customer.level || 1}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div>
                                      <i className="bi bi-chevron-right text-muted"></i>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {filteredCustomers.length === 10 && (
                                <div className="p-2 text-center bg-light">
                                  <small className="text-muted">
                                    <i className="bi bi-info-circle me-1"></i>
                                    Mostrando los primeros 10 resultados. Refina tu búsqueda para ver más.
                                  </small>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Cliente seleccionado */}
                        {selectedCustomer && (
                          <div className="alert alert-success mt-3 border-start border-4 border-success" style={{ borderLeft: '4px solid #198754 !important' }}>
                            <div className="d-flex align-items-center">
                              <div className="me-3">
                                <div className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px' }}>
                                  <i className="bi bi-person-check-fill fs-5"></i>
                                </div>
                              </div>
                              <div className="flex-grow-1">
                                <h6 className="mb-1 text-success">
                                  <i className="bi bi-check-circle me-2"></i>
                                  Cliente seleccionado exitosamente
                                </h6>
                                <div className="fw-bold text-dark">{selectedCustomer.name}</div>
                                <div className="text-muted small mb-2">
                                  {selectedCustomer.email && (
                                    <span className="me-3">
                                      <i className="bi bi-envelope me-1"></i>
                                      {selectedCustomer.email}
                                    </span>
                                  )}
                                  {selectedCustomer.phone && (
                                    <span>
                                      <i className="bi bi-telephone me-1"></i>
                                      {selectedCustomer.phone}
                                    </span>
                                  )}
                                </div>
                                {/* Mostrar nivel del cliente */}
                                <div className="mb-1">
                                  <span className={`badge ${getLevelBadgeClass(selectedCustomer.level || 1)}`}>
                                    <i className="bi bi-star-fill me-1"></i>
                                    Nivel {selectedCustomer.level || 1}
                                    {selectedCustomer.level === 1 && ' - Básico'}
                                    {selectedCustomer.level === 2 && ' - Estándar'}
                                    {selectedCustomer.level === 3 && ' - Premium'}
                                    {selectedCustomer.level === 4 && ' - VIP'}
                                  </span>
                                </div>
                              </div>
                              <div className="d-flex gap-2">
                                <button
                                  type="button"
                                  className="btn btn-outline-warning btn-sm"
                                  onClick={enableCustomerEditing}
                                  title="Editar cliente"
                                >
                                  <i className="bi bi-pencil me-1"></i>
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-success btn-sm"
                                  onClick={clearCustomerSelection}
                                  title="Cambiar cliente"
                                >
                                  <i className="bi bi-arrow-repeat me-1"></i>
                                  Cambiar
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Alerta cuando no hay cliente seleccionado */}
                        {!selectedCustomer && !showNewCustomerForm && (!customerSearchTerm || customerSearchTerm.length < 2) && (
                          <div className="alert alert-warning mt-3 border-start border-4 border-warning">
                            <div className="d-flex align-items-center">
                              <i className="bi bi-exclamation-triangle me-3 fs-4 text-warning"></i>
                              <div className="flex-grow-1">
                                <h6 className="mb-1 text-warning">
                                  <i className="bi bi-person-x me-2"></i>
                                  Cliente requerido para completar la venta
                                </h6>
                                <p className="mb-0 small">
                                  Debe seleccionar un cliente existente o crear uno nuevo para proceder con el checkout.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Opción para crear cliente nuevo */}
                        {!selectedCustomer && customerSearchTerm && customerSearchTerm.length >= 2 && filteredCustomers.length === 0 && (
                          <div className="alert alert-info mt-3">
                            <div className="d-flex align-items-center">
                              <i className="bi bi-info-circle me-3 fs-4 text-info"></i>
                              <div className="flex-grow-1">
                                <h6 className="mb-1">No se encontró el cliente</h6>
                                <p className="mb-2 small">No hay clientes registrados con el criterio "<strong>{customerSearchTerm}</strong>"</p>
                                <small className="text-muted">
                                  Puedes completar los campos a continuación para crear un cliente nuevo o continuar como venta sin cliente registrado.
                                </small>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Formulario de cliente */}
                      {(showNewCustomerForm || isEditingCustomer || !selectedCustomer) && (
                        <div className="border rounded-3 p-3 mb-4" style={{ backgroundColor: '#f8f9fa' }}>
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="mb-0">
                              <i className={`bi ${isEditingCustomer ? 'bi-pencil' : 'bi-person-plus'} me-2 text-primary`}></i>
                              {isEditingCustomer ? 'Editar Cliente' : 'Datos del Cliente'}
                            </h6>
                            {(showNewCustomerForm || isEditingCustomer) && (
                              <div className="d-flex gap-2">
                                <button
                                  type="button"
                                  className="btn btn-success btn-sm"
                                  onClick={saveCustomer}
                                  disabled={savingCustomer}
                                >
                                  {savingCustomer ? (
                                    <>
                                      <span className="spinner-border spinner-border-sm me-1"></span>
                                      Guardando...
                                    </>
                                  ) : (
                                    <>
                                      <i className="bi bi-check me-1"></i>
                                      Guardar
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary btn-sm"
                                  onClick={cancelCustomerEditing}
                                >
                                  <i className="bi bi-x me-1"></i>
                                  Cancelar
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="row g-3">
                            <div className="col-md-6">
                              <label className="form-label fw-bold">
                                Nombre *
                                {customerFormErrors.name && (
                                  <span className="text-danger ms-2 small">
                                    <i className="bi bi-exclamation-triangle"></i>
                                    {customerFormErrors.name}
                                  </span>
                                )}
                              </label>
                              <input
                                type="text"
                                className={`form-control ${customerFormErrors.name ? 'is-invalid' : ''}`}
                                value={customerData.name}
                                onChange={(e) => handleCustomerDataChange('name', e.target.value)}
                                placeholder="Nombre completo del cliente"
                                disabled={selectedCustomer && !isEditingCustomer}
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-bold">
                                Email
                                {customerFormErrors.email && (
                                  <span className="text-danger ms-2 small">
                                    <i className="bi bi-exclamation-triangle"></i>
                                    {customerFormErrors.email}
                                  </span>
                                )}
                              </label>
                              <input
                                type="email"
                                className={`form-control ${customerFormErrors.email ? 'is-invalid' : ''}`}
                                value={customerData.email}
                                onChange={(e) => handleCustomerDataChange('email', e.target.value)}
                                placeholder="cliente@email.com"
                                disabled={selectedCustomer && !isEditingCustomer}
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-bold">
                                Teléfono
                                {customerFormErrors.phone && (
                                  <span className="text-danger ms-2 small">
                                    <i className="bi bi-exclamation-triangle"></i>
                                    {customerFormErrors.phone}
                                  </span>
                                )}
                              </label>
                              <input
                                type="tel"
                                className={`form-control ${customerFormErrors.phone ? 'is-invalid' : ''}`}
                                value={customerData.phone}
                                onChange={(e) => handleCustomerDataChange('phone', e.target.value)}
                                placeholder="664-123-4567"
                                disabled={selectedCustomer && !isEditingCustomer}
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-bold">Dirección</label>
                              <input
                                type="text"
                                className="form-control"
                                value={customerData.address}
                                onChange={(e) => handleCustomerDataChange('address', e.target.value)}
                                placeholder="Dirección completa"
                                disabled={selectedCustomer && !isEditingCustomer}
                              />
                            </div>
                          </div>

                          {/* Fila adicional para el nivel */}
                          <div className="row g-3 mt-2">
                            <div className="col-md-6">
                              <label className="form-label fw-bold">
                                <i className="bi bi-star-fill me-2 text-warning"></i>
                                Nivel de Cliente
                              </label>
                              <select
                                className="form-select"
                                value={customerData.level}
                                onChange={(e) => handleCustomerDataChange('level', parseInt(e.target.value))}
                                disabled={selectedCustomer && !isEditingCustomer}
                              >
                                <option value={1}>🥉 Nivel 1 - Básico</option>
                                <option value={2}>🥈 Nivel 2 - Estándar</option>
                                <option value={3}>🥇 Nivel 3 - Premium</option>
                                <option value={4}>💎 Nivel 4 - VIP</option>
                              </select>
                              <div className="form-text">
                                <small className="text-muted">
                                  <i className="bi bi-info-circle me-1"></i>
                                  El nivel determina descuentos y beneficios especiales
                                </small>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="row g-3">
                        <div className="col-12">
                          <label className="form-label fw-bold">Notas del pedido</label>
                          <textarea
                            className="form-control"
                            rows="3"
                            value={orderNotes}
                            onChange={(e) => setOrderNotes(e.target.value)}
                            placeholder="Instrucciones especiales o comentarios..."
                          ></textarea>
                        </div>
                        
                        {!selectedCustomer && !showNewCustomerForm && (
                          <div className="col-12">
                            <div className="alert alert-info">
                              <i className="bi bi-info-circle me-2"></i>
                              <strong>Tip:</strong> Puedes buscar un cliente existente arriba, crear uno nuevo con el botón <strong>+</strong>, o proceder sin cliente específico.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="col-md-4">
                      <h6 className="border-bottom pb-2 mb-3">Resumen del Pedido</h6>
                      <div className="bg-light p-3 rounded">
                        {cart.map(item => (
                          <div key={item.id} className="d-flex justify-content-between mb-2 small">
                            <span>{item.name} x{item.quantity}</span>
                            <span>{formatCurrency((item.discount > 0 ? getDiscountedPrice(item.price, item.discount) : item.price) * item.quantity)}</span>
                          </div>
                        ))}
                        <hr />
                        <div className="d-flex justify-content-between fw-bold">
                          <span>Total:</span>
                          <span className="text-success">{formatCurrency(getCartTotal())}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCheckout(false)}
                  >
                    <i className="bi bi-x-circle me-2"></i>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={() => {
                      console.log('🔘 Botón de checkout clickeado');
                      console.log('🛒 Estado del cart antes de processSale:', cart);
                      console.log('💰 Total antes de processSale:', getCartTotal());
                      console.log('👤 Cliente seleccionado antes de processSale:', selectedCustomer);
                      console.log('📦 Contenido detallado del cart:', JSON.stringify(cart, null, 2));
                      processSale();
                    }}
                    disabled={checkoutLoading || cart.length === 0 || !selectedCustomer}
                  >
                    {checkoutLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i>
                        {selectedCustomer 
                          ? `Finalizar Compra (${formatCurrency(getCartTotal())})` 
                          : 'Seleccione un Cliente'
                        }
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedTijuanaStore;
