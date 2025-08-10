import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

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

const ModernShop = ({ user }) => {
  console.log('ModernShop component mounted', { user }); // Debug log

  // Hook del tema
  const { theme, toggleTheme, getCardClasses, getBackgroundClasses, getBadgeClasses, getButtonClasses, isDark } = useTheme();

  // Estados principales
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [componentError, setComponentError] = useState(null);

  // Estados de filtros (simplificados)
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' o 'list'
  const [priceFilter, setPriceFilter] = useState({ min: '', max: '' });

  // Estados de paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12); // Aumentado para mejor experiencia, ahora configurable

  // Estados del carrusel
  const [currentSlide, setCurrentSlide] = useState(0);
  const [carouselProducts, setCarouselProducts] = useState([]);

  // Estados del carrito con persistencia
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem('modernShop_cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch {
      return [];
    }
  });
  const [favoriteProducts, setFavoriteProducts] = useState(() => {
    try {
      const savedFavorites = localStorage.getItem('modernShop_favorites');
      return savedFavorites ? JSON.parse(savedFavorites) : [];
    } catch {
      return [];
    }
  });
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerDiscount, setCustomerDiscount] = useState(0);

  // Estados de UI mejorados
  const [showQuickView, setShowQuickView] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [bulkOrderMode, setBulkOrderMode] = useState(false);
  const [bulkItems, setBulkItems] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [compareProducts, setCompareProducts] = useState([]);

  // Estados FASE 3: Funcionalidades Comerciales
  const [promotions, setPromotions] = useState([]);
  const [activePromotions, setActivePromotions] = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);
  const [showPromotions, setShowPromotions] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [dynamicPricing, setDynamicPricing] = useState({});
  const [flashSales, setFlashSales] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupons, setAppliedCoupons] = useState([]);

  // Estados FASE 4: Analytics y Métricas
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState({
    sessionStart: new Date(),
    pageViews: 0,
    productViews: new Set(),
    searchQueries: [],
    cartEvents: [],
    purchaseEvents: [],
    favoriteEvents: [],
    comparisonEvents: [],
    timeSpent: 0,
    clickEvents: []
  });
  const [userBehavior, setUserBehavior] = useState({
    mostViewedProducts: [],
    searchTrends: [],
    averageSessionTime: 0,
    conversionRate: 0,
    abandonedCarts: 0
  });
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    currentUsers: 1,
    pageViews: 0,
    activeProductViews: [],
    currentSearches: []
  });
  const [performanceMetrics, setPerformanceMetrics] = useState({
    loadTime: 0,
    interactionTime: 0,
    renderTime: 0,
    apiResponseTimes: []
  });

  // Debounce para búsquedas
  const debouncedSearch = useDebounce(search, 300);
  const debouncedCustomerSearch = useDebounce(customerSearch, 300);

  // Estados de checkout
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [checkoutAddress, setCheckoutAddress] = useState('');
  const [checkoutPayment, setCheckoutPayment] = useState('Efectivo');
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState('');
  const [orderError, setOrderError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [productsRes, brandsRes, categoriesRes, customersRes, stockRes] = await Promise.all([
          api.get('products/'),
          api.get('brands/'),
          api.get('categories/'),
          api.get('customers/?is_active=true'),
          api.get('product-warehouse-stocks/')
        ]);
        
        // Obtener stocks del almacén TIJUANA
        const allStocks = Array.isArray(stockRes.data) ? stockRes.data : (stockRes.data?.results || []);
        const tijuanaStocks = allStocks.filter(stock => {
          const warehouseName = stock.warehouse_name || stock.warehouse?.name || '';
          return warehouseName.toUpperCase().includes('TIJUANA') && parseFloat(stock.quantity || 0) > 0;
        });
        
        console.log('Stocks de TIJUANA con cantidad > 0:', tijuanaStocks.length);
        console.log('Ejemplo de stocks TIJUANA:', tijuanaStocks.slice(0, 3));
        
        // Crear un Set de productos que tienen stock en TIJUANA (usando multiple criterios de identificación)
        const productsWithTijuanaStockIds = new Set();
        tijuanaStocks.forEach(stock => {
          // Intentar múltiples formas de identificar el producto
          if (stock.product_variant_id) {
            productsWithTijuanaStockIds.add(`variant_${stock.product_variant_id}`);
          }
          if (stock.product_code) {
            productsWithTijuanaStockIds.add(`sku_${stock.product_code}`);
          }
          if (stock.product_variant?.sku) {
            productsWithTijuanaStockIds.add(`sku_${stock.product_variant.sku}`);
          }
          if (stock.product_name) {
            productsWithTijuanaStockIds.add(`name_${stock.product_name.toLowerCase()}`);
          }
        });
        
        // Filtrar productos que tienen stock en TIJUANA
        const allProducts = productsRes.data || [];
        const productsWithTijuanaStock = allProducts.filter(product => {
          return productsWithTijuanaStockIds.has(`sku_${product.sku}`) ||
                 productsWithTijuanaStockIds.has(`name_${product.name?.toLowerCase()}`) ||
                 productsWithTijuanaStockIds.has(`variant_${product.id}`);
        });
        
        console.log('Productos con stock en TIJUANA:', productsWithTijuanaStock.length, 'de', allProducts.length, 'totales');
        
        setProducts(productsWithTijuanaStock);
        setBrands(brandsRes.data || []);
        setCategories(categoriesRes.data || []);
        setCustomers(customersRes.data || []);
        
        // Preparar productos destacados para el carrusel (productos con mayor stock o precio)
        const featuredProducts = productsWithTijuanaStock
          .slice(0, 8) // Tomar los primeros 8 productos
          .map(product => ({
            ...product,
            featured: true,
            carouselBadge: Math.random() > 0.7 ? 'Destacado' : Math.random() > 0.5 ? 'Popular' : 'Nuevo'
          }));
        
        setCarouselProducts(featuredProducts);
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Error al cargar los datos. Por favor recarga la página.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Cargar órdenes recientes del cliente
  useEffect(() => {
    if (!selectedCustomer) {
      setRecentOrders([]);
      return;
    }
    api.get(`sales-orders/?customer=${selectedCustomer}&ordering=-order_date&page_size=3`)
      .then(res => setRecentOrders(res.data.results || res.data))
      .catch(() => setRecentOrders([]));
  }, [selectedCustomer]);

  // FASE 3: Cargar promociones y ofertas especiales
  useEffect(() => {
    const loadPromotions = async () => {
      try {
        // Simular carga de promociones activas
        const today = new Date();
        const mockPromotions = [
          {
            id: 1,
            type: 'percentage',
            value: 15,
            title: 'Descuento 15% en Electrónicos',
            description: 'Válido hasta fin de mes',
            category: 'Electrónicos',
            minAmount: 1000,
            validUntil: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
            isActive: true
          },
          {
            id: 2,
            type: 'fixed',
            value: 100,
            title: '$100 OFF en compras mayores a $2000',
            description: 'Promoción especial',
            minAmount: 2000,
            validUntil: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
            isActive: true
          },
          {
            id: 3,
            type: 'bogo',
            value: 1,
            title: '2x1 en productos seleccionados',
            description: 'Lleva 2 paga 1',
            brand: 'Marca Premium',
            validUntil: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000),
            isActive: true
          }
        ];

        setPromotions(mockPromotions);
        setActivePromotions(mockPromotions.filter(p => p.isActive));
        
        // Flash Sales
        const flashSaleItems = products
          .filter(p => Math.random() > 0.8) // 20% de productos en flash sale
          .slice(0, 3)
          .map(p => ({
            ...p,
            originalPrice: p.price,
            flashPrice: p.price * 0.7, // 30% descuento
            timeLeft: Math.floor(Math.random() * 24) + 1 // 1-24 horas
          }));
        
        setFlashSales(flashSaleItems);
        
      } catch (error) {
        console.warn('Error cargando promociones:', error);
      }
    };

    if (products.length > 0) {
      loadPromotions();
    }
  }, [products]);

  // Sistema de recomendaciones inteligente
  useEffect(() => {
    const generateRecommendations = () => {
      if (!selectedCustomer || cart.length === 0) {
        setRecommendations([]);
        return;
      }

      // Algoritmo de recomendaciones basado en:
      // 1. Productos del carrito actual
      // 2. Categorías favoritas
      // 3. Productos populares
      const cartCategories = [...new Set(cart.map(item => item.category))];
      const cartBrands = [...new Set(cart.map(item => item.brand))];
      
      const recommended = products
        .filter(p => 
          p.is_active && 
          !cart.some(item => item.id === p.id) &&
          (cartCategories.includes(p.category?.name) || 
           cartBrands.includes(p.brand?.name) ||
           favoriteProducts.includes(p.id))
        )
        .sort(() => Math.random() - 0.5) // Aleatorizar
        .slice(0, 4);

      setRecommendations(recommended);
    };

    generateRecommendations();
  }, [cart, selectedCustomer, products, favoriteProducts]);

  // FASE 4: Funciones de tracking (definidas antes de usar en useEffect)
  const trackEvent = useCallback((eventType, data = {}) => {
    const event = {
      type: eventType,
      timestamp: new Date(),
      data: data
    };

    setAnalytics(prev => {
      const updated = { ...prev };
      
      switch (eventType) {
        case 'product_view':
          updated.productViews.add(data.productId);
          updated.clickEvents.push(event);
          break;
        case 'search':
          updated.searchQueries.push(data.query);
          break;
        case 'add_to_cart':
          updated.cartEvents.push(event);
          break;
        case 'purchase':
          updated.purchaseEvents.push(event);
          break;
        case 'favorite':
          updated.favoriteEvents.push(event);
          break;
        case 'comparison':
          updated.comparisonEvents.push(event);
          break;
        default:
          updated.clickEvents.push(event);
      }
      
      return updated;
    });

    // Actualizar métricas en tiempo real
    if (eventType === 'product_view') {
      setRealTimeMetrics(prev => ({
        ...prev,
        activeProductViews: [...prev.activeProductViews.slice(-4), data]
      }));
    }
  }, []);

  const trackProductView = useCallback((product) => {
    trackEvent('product_view', {
      productId: product.id,
      productName: product.name,
      category: product.category?.name,
      brand: product.brand?.name,
      price: product.price
    });
  }, [trackEvent]);

  const trackSearch = useCallback((query) => {
    if (query && query.length > 2) {
      trackEvent('search', { query });
      setRealTimeMetrics(prev => ({
        ...prev,
        currentSearches: [...prev.currentSearches.slice(-4), { query, timestamp: new Date() }]
      }));
    }
  }, [trackEvent]);

  const trackAddToCart = useCallback((product, quantity = 1) => {
    trackEvent('add_to_cart', {
      productId: product.id,
      productName: product.name,
      quantity,
      price: product.price,
      totalValue: product.price * quantity
    });
  }, [trackEvent]);

  const trackPurchase = useCallback((orderData) => {
    trackEvent('purchase', {
      orderId: orderData.id,
      totalAmount: orderData.total_amount,
      itemCount: orderData.items?.length || 0,
      customer: orderData.customer,
      paymentMethod: orderData.payment_method
    });
  }, [trackEvent]);

  // FASE 4: Sistema de Analytics y Tracking (ahora que trackEvent está definido)
  useEffect(() => {
    // Registrar inicio de sesión
    const sessionStart = new Date();
    trackEvent('session_start', { timestamp: sessionStart });
    
    // Tracking de performance
    const loadTime = performance.now();
    setPerformanceMetrics(prev => ({ ...prev, loadTime }));
    
    // Simular métricas en tiempo real
    const interval = setInterval(() => {
      setRealTimeMetrics(prev => ({
        ...prev,
        pageViews: prev.pageViews + Math.floor(Math.random() * 3),
        currentUsers: Math.max(1, prev.currentUsers + Math.floor(Math.random() * 5) - 2)
      }));
    }, 10000);

    return () => {
      clearInterval(interval);
      const sessionEnd = new Date();
      const timeSpent = (sessionEnd - sessionStart) / 1000;
      trackEvent('session_end', { 
        duration: timeSpent,
        timestamp: sessionEnd 
      });
    };
  }, [trackEvent]);

  // Calcular métricas de comportamiento
  useEffect(() => {
    const calculateBehaviorMetrics = () => {
      // Productos más vistos
      const productViewCounts = {};
      analytics.clickEvents
        .filter(event => event.type === 'product_view')
        .forEach(event => {
          const productId = event.data.productId;
          productViewCounts[productId] = (productViewCounts[productId] || 0) + 1;
        });

      const mostViewedProducts = Object.entries(productViewCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([productId, views]) => {
          const product = products.find(p => p.id.toString() === productId);
          return { product, views };
        })
        .filter(item => item.product);

      // Tendencias de búsqueda
      const searchCounts = {};
      analytics.searchQueries.forEach(query => {
        if (query && query.length > 2) {
          searchCounts[query.toLowerCase()] = (searchCounts[query.toLowerCase()] || 0) + 1;
        }
      });

      const searchTrends = Object.entries(searchCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);

      // Tasa de conversión
      const conversionRate = analytics.purchaseEvents.length > 0 && analytics.productViews.size > 0
        ? (analytics.purchaseEvents.length / analytics.productViews.size) * 100
        : 0;

      // Carritos abandonados
      const abandonedCarts = Math.max(0, analytics.cartEvents.length - analytics.purchaseEvents.length);

      setUserBehavior({
        mostViewedProducts,
        searchTrends,
        averageSessionTime: analytics.timeSpent,
        conversionRate,
        abandonedCarts
      });
    };

    if (analytics.clickEvents.length > 0 || analytics.searchQueries.length > 0) {
      calculateBehaviorMetrics();
    }
  }, [analytics, products]);

  // Precios dinámicos basados en promociones
  useEffect(() => {
    const calculateDynamicPricing = () => {
      const pricing = {};
      
      products.forEach(product => {
        let finalPrice = Number(product.price) || 0;
        let applicablePromotions = [];

        // Aplicar promociones activas
        activePromotions.forEach(promo => {
          let applies = false;

          if (promo.category && product.category?.name === promo.category) {
            applies = true;
          } else if (promo.brand && product.brand?.name === promo.brand) {
            applies = true;
          } else if (!promo.category && !promo.brand) {
            applies = true; // Promoción general
          }

          if (applies) {
            applicablePromotions.push(promo);
            
            if (promo.type === 'percentage') {
              finalPrice = finalPrice * (1 - promo.value / 100);
            } else if (promo.type === 'fixed') {
              finalPrice = Math.max(0, finalPrice - promo.value);
            }
          }
        });

        // Verificar flash sales
        const flashSale = flashSales.find(fs => fs.id === product.id);
        if (flashSale) {
          finalPrice = flashSale.flashPrice;
          applicablePromotions.push({
            type: 'flash',
            title: 'Flash Sale',
            value: Math.round((1 - flashSale.flashPrice / flashSale.originalPrice) * 100)
          });
        }

        pricing[product.id] = {
          originalPrice: Number(product.price) || 0,
          finalPrice: finalPrice,
          discount: ((Number(product.price) - finalPrice) / Number(product.price)) * 100,
          promotions: applicablePromotions
        };
      });

      setDynamicPricing(pricing);
    };

    if (products.length > 0) {
      calculateDynamicPricing();
    }
  }, [products, activePromotions, flashSales]);

  // Persistir carrito en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('modernShop_cart', JSON.stringify(cart));
    } catch (error) {
      console.warn('No se pudo guardar el carrito en localStorage:', error);
    }
  }, [cart]);

  // Persistir favoritos en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('modernShop_favorites', JSON.stringify(favoriteProducts));
    } catch (error) {
      console.warn('No se pudo guardar favoritos en localStorage:', error);
    }
  }, [favoriteProducts]);

  // Filtrar productos optimizado con useMemo
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Filtro de búsqueda
      const matchesSearch = !debouncedSearch || 
        p.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.sku?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.brand?.name?.toLowerCase().includes(debouncedSearch.toLowerCase());
      
      // Filtro de marca
      const matchesBrand = !selectedBrand || p.brand?.id === selectedBrand;
      
      // Filtro de categoría
      const matchesCategory = !selectedCategory || p.category?.id === selectedCategory;
      
      // Filtro de precio
      const price = Number(p.price) || 0;
      const matchesMinPrice = !priceFilter.min || price >= Number(priceFilter.min);
      const matchesMaxPrice = !priceFilter.max || price <= Number(priceFilter.max);
      
      // Filtro de favoritos
      const matchesFavorites = !showFavorites || favoriteProducts.includes(p.id);
      
      return matchesSearch && matchesBrand && matchesCategory && 
             matchesMinPrice && matchesMaxPrice && matchesFavorites && p.is_active;
    });
  }, [products, debouncedSearch, selectedBrand, selectedCategory, priceFilter, showFavorites, favoriteProducts]);

  // Filtrar clientes con debounce
  const filteredCustomers = useMemo(() => {
    if (!debouncedCustomerSearch) return [];
    
    return customers
      .filter(c =>
        c.name.toLowerCase().includes(debouncedCustomerSearch.toLowerCase()) ||
        c.code.toLowerCase().includes(debouncedCustomerSearch.toLowerCase()) ||
        c.email?.toLowerCase().includes(debouncedCustomerSearch.toLowerCase())
      )
      .slice(0, 5);
  }, [customers, debouncedCustomerSearch]);

  // Paginación robusta
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  // Si el filtro cambia y la página actual queda fuera de rango, regresa a la primera página
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [filteredProducts, totalPages, page]);

  const currentPage = Math.max(1, Math.min(page, totalPages));
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Funciones del carrito (sin restricción de stock)
  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      updateCartQuantity(product.id, existingItem.quantity + 1);
    } else {
      // Aplicar precio dinámico si existe
      const pricing = dynamicPricing[product.id];
      const finalPrice = pricing ? pricing.finalPrice : (Number(product.price) || 0);
      
      const newItem = {
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: finalPrice,
        originalPrice: Number(product.price) || 0,
        quantity: 1,
        brand: product.brand?.name,
        category: product.category?.name,
        image: product.image,
        appliedPromotions: pricing?.promotions || []
      };
      setCart(prev => [...prev, newItem]);
      setOrderSuccess(`${product.name} agregado al carrito`);
      setTimeout(() => setOrderSuccess(''), 3000);
      
      // FASE 4: Tracking de agregar al carrito
      trackAddToCart(product, 1);
    }
  };

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Funciones de favoritos
  const toggleFavorite = useCallback((productId) => {
    setFavoriteProducts(prev => {
      const isFavorite = prev.includes(productId);
      if (isFavorite) {
        // FASE 4: Tracking remover favorito
        trackEvent('favorite', { productId, action: 'remove' });
        return prev.filter(id => id !== productId);
      } else {
        // FASE 4: Tracking agregar favorito
        trackEvent('favorite', { productId, action: 'add' });
        return [...prev, productId];
      }
    });
  }, [trackEvent]);

  const isFavorite = useCallback((productId) => {
    return favoriteProducts.includes(productId);
  }, [favoriteProducts]);

  // Productos relacionados
  const getRelatedProducts = useCallback((product, count = 4) => {
    if (!product) return [];
    
    return products
      .filter(p => 
        p.id !== product.id && 
        p.is_active && 
        (p.category?.id === product.category?.id || p.brand?.id === product.brand?.id)
      )
      .sort((a, b) => {
        // Priorizar misma categoría, luego misma marca
        const aScore = (a.category?.id === product.category?.id ? 2 : 0) + 
                      (a.brand?.id === product.brand?.id ? 1 : 0);
        const bScore = (b.category?.id === product.category?.id ? 2 : 0) + 
                      (b.brand?.id === product.brand?.id ? 1 : 0);
        return bScore - aScore;
      })
      .slice(0, count);
  }, [products]);

  // Quick View
  const openQuickView = useCallback((product) => {
    setQuickViewProduct(product);
    setShowQuickView(true);
    // Cargar productos relacionados
    const related = getRelatedProducts(product);
    setRelatedProducts(related);
    
    // FASE 4: Tracking vista rápida de producto
    trackProductView(product);
  }, [getRelatedProducts, trackProductView]);

  const closeQuickView = useCallback(() => {
    setShowQuickView(false);
    setQuickViewProduct(null);
  }, []);

  // Comparador de productos
  const toggleCompareProduct = useCallback((product) => {
    setCompareProducts(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) {
        // FASE 4: Tracking remover de comparación
        trackEvent('comparison', { productId: product.id, action: 'remove' });
        return prev.filter(p => p.id !== product.id);
      } else if (prev.length < 3) { // Máximo 3 productos para comparar
        // FASE 4: Tracking agregar a comparación
        trackEvent('comparison', { productId: product.id, action: 'add' });
        return [...prev, product];
      } else {
        return prev; // No agregar más si ya hay 3
      }
    });
  }, [trackEvent]);

  // Bulk ordering
  const addToBulk = useCallback((product, quantity = 1) => {
    setBulkItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        return [...prev, { ...product, quantity }];
      }
    });
  }, []);

  const processBulkOrder = useCallback(() => {
    bulkItems.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        addToCart(item);
      }
    });
    setBulkItems([]);
    setBulkOrderMode(false);
    setOrderSuccess(`${bulkItems.length} productos agregados al carrito`);
    setTimeout(() => setOrderSuccess(''), 3000);
  }, [bulkItems, addToCart]);

  // Funciones de utilidad
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0);
  };

  // Cálculos del carrito
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = selectedCustomer ? cartTotal * (customerDiscount / 100) : 0;
  
  // Calcular descuentos por cupones
  const couponDiscount = appliedCoupons.reduce((total, coupon) => {
    if (coupon.type === 'percentage') {
      return total + (cartTotal * coupon.value / 100);
    } else if (coupon.type === 'fixed') {
      return total + coupon.value;
    }
    return total;
  }, 0);
  
  // Calcular descuentos por promociones
  const promoDiscount = cart.reduce((total, item) => {
    return total + (item.originalPrice - item.price) * item.quantity;
  }, 0);
  
  const totalDiscount = discountAmount + couponDiscount + promoDiscount;
  const totalWithDiscount = Math.max(0, cartTotal - totalDiscount);

  // FASE 3: Funciones comerciales avanzadas
  const applyCoupon = useCallback((code) => {
    const validCoupons = {
      'WELCOME10': { type: 'percentage', value: 10, minAmount: 500 },
      'SAVE50': { type: 'fixed', value: 50, minAmount: 200 },
      'FIRST20': { type: 'percentage', value: 20, minAmount: 1000 }
    };

    const coupon = validCoupons[code.toUpperCase()];
    if (!coupon) {
      setOrderError('Cupón no válido');
      setTimeout(() => setOrderError(''), 3000);
      return false;
    }

    if (cartTotal < coupon.minAmount) {
      setOrderError(`Monto mínimo requerido: ${formatCurrency(coupon.minAmount)}`);
      setTimeout(() => setOrderError(''), 3000);
      return false;
    }

    const isAlreadyApplied = appliedCoupons.some(c => c.code === code.toUpperCase());
    if (isAlreadyApplied) {
      setOrderError('Cupón ya aplicado');
      setTimeout(() => setOrderError(''), 3000);
      return false;
    }

    setAppliedCoupons(prev => [...prev, { ...coupon, code: code.toUpperCase() }]);
    setCouponCode('');
    setOrderSuccess(`Cupón ${code.toUpperCase()} aplicado exitosamente`);
    setTimeout(() => setOrderSuccess(''), 3000);
    return true;
  }, [cartTotal, appliedCoupons, formatCurrency]);

  const removeCoupon = useCallback((code) => {
    setAppliedCoupons(prev => prev.filter(c => c.code !== code));
  }, []);

  const calculatePromoDiscount = useCallback((product, quantity = 1) => {
    const pricing = dynamicPricing[product.id];
    if (!pricing) return 0;
    
    const originalTotal = pricing.originalPrice * quantity;
    const discountedTotal = pricing.finalPrice * quantity;
    return originalTotal - discountedTotal;
  }, [dynamicPricing]);

  const getRecommendationsForProduct = useCallback((product, count = 3) => {
    return products
      .filter(p => 
        p.id !== product.id && 
        p.is_active && 
        (p.category?.id === product.category?.id || p.brand?.id === product.brand?.id)
      )
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
  }, [products]);

  const getStockBadge = (stock) => {
    // Siempre mostrar como disponible para la tienda
    return { color: 'success', text: 'Disponible', icon: '✅' };
  };

  // Manejo del cliente
  const handleCustomerSelect = (customer) => {
    console.log('Cliente seleccionado:', customer); // Para debugging
    setSelectedCustomer(customer.code);
    setCustomerSearch(`${customer.name} (${customer.code})`);
    setCustomerDiscount(customer.customer_type?.discount_percentage || 0);
  };

  // ============ FUNCIONES DEL CARRUSEL ============
  
  // Navegación del carrusel
  const nextSlide = useCallback(() => {
    setCurrentSlide(prev => (prev + 1) % Math.max(1, carouselProducts.length - 2));
  }, [carouselProducts.length]);
  
  const prevSlide = useCallback(() => {
    setCurrentSlide(prev => prev === 0 ? Math.max(0, carouselProducts.length - 3) : prev - 1);
  }, [carouselProducts.length]);
  
  const goToSlide = useCallback((index) => {
    setCurrentSlide(index);
  }, []);
  
  // Auto-play del carrusel
  useEffect(() => {
    if (carouselProducts.length <= 3) return;
    
    const interval = setInterval(() => {
      nextSlide();
    }, 4000); // Cambiar cada 4 segundos
    
    return () => clearInterval(interval);
  }, [nextSlide, carouselProducts.length]);
  
  // Calcular slides visibles
  const getVisibleSlides = useCallback(() => {
    if (carouselProducts.length === 0) return [];
    
    const slides = [];
    for (let i = 0; i < Math.min(3, carouselProducts.length); i++) {
      const index = (currentSlide + i) % carouselProducts.length;
      slides.push({
        ...carouselProducts[index],
        isActive: i === 1, // El slide del medio es el activo
        slideIndex: i
      });
    }
    return slides;
  }, [carouselProducts, currentSlide]);

  // Crear orden (sin validación de stock)
  const handleCreateOrder = async () => {
    if (!selectedCustomer || cart.length === 0) return;
    
    setLoadingOrder(true);
    setOrderError(''); // Limpiar errores previos
    
    try {
      // Buscar el ID del customer basado en el código seleccionado
      const selectedCustomerObj = customers.find(c => c.code === selectedCustomer);
      if (!selectedCustomerObj) {
        throw new Error('Cliente no encontrado');
      }

      const orderData = {
        customer: selectedCustomerObj.id, // Enviar el ID en lugar del código
        items: cart.map(item => ({
          product: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        notes: checkoutNotes,
        delivery_address: checkoutAddress,
        payment_method: checkoutPayment,
        total_amount: parseFloat(totalWithDiscount.toFixed(2)),
        status: 'pending',
        order_date: new Date().toISOString()
      };

      console.log('Enviando datos de orden:', orderData); // Para debugging
      console.log('Cliente seleccionado:', selectedCustomerObj); // Para debugging

      const response = await api.post('sales-orders/', orderData);
      console.log('Respuesta del servidor:', response.data); // Para debugging
      
      // FASE 4: Tracking de compra exitosa
      trackPurchase(response.data);
      
      setOrderSuccess(`¡Orden #${response.data.id} creada exitosamente!`);
      clearCart();
      setShowCheckout(false);
      setShowConfirm(false);
      setCheckoutNotes('');
      setCheckoutAddress('');
      setSelectedCustomer('');
      setCustomerSearch('');
      setCustomerDiscount(0);
      setTimeout(() => setOrderSuccess(''), 5000);
    } catch (error) {
      console.error('Error detallado al crear orden:', error);
      console.error('Response data:', error.response?.data);
      console.error('Status:', error.response?.status);
      
      let errorMessage = 'Error al crear la orden. Intenta nuevamente.';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.customer) {
          errorMessage = `Error en cliente: ${Array.isArray(error.response.data.customer) ? error.response.data.customer[0] : error.response.data.customer}`;
        } else if (error.response.data.items) {
          errorMessage = `Error en productos: ${Array.isArray(error.response.data.items) ? error.response.data.items[0] : error.response.data.items}`;
        } else if (error.response.data.total_amount) {
          errorMessage = `Error en total: ${Array.isArray(error.response.data.total_amount) ? error.response.data.total_amount[0] : error.response.data.total_amount}`;
        } else {
          // Mostrar el primer error encontrado
          const firstError = Object.values(error.response.data)[0];
          if (Array.isArray(firstError)) {
            errorMessage = firstError[0];
          } else {
            errorMessage = firstError;
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setOrderError(errorMessage);
      setTimeout(() => setOrderError(''), 8000);
    } finally {
      setLoadingOrder(false);
    }
  };

  const isValidUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    if (/\s|…|[^\x00-\x7F]/.test(url)) return false;
    if (url.includes('via.placeholder.com') && !/^https?:\/\//.test(url)) return false;
    try {
      const u = new URL(url);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Función para generar imágenes placeholder consistentes
  const getProductImage = (product, size = 'medium') => {
    // Si tiene imagen válida en product.images[size], usarla
    if (product && product.images && product.images[size] && isValidUrl(product.images[size])) {
      return product.images[size];
    }
    // Si tiene imagen directa, usarla
    if (product.image && isValidUrl(product.image)) {
      return product.image;
    }
    // Configuración de tamaños
    const sizes = {
      small: { width: 40, height: 40 },
      medium: { width: 200, height: 200 },
      large: { width: 400, height: 400 }
    };
    const { width, height } = sizes[size] || sizes.medium;
    // Iniciales
    const productName = product.name || 'Producto';
    const words = productName.split(' ').filter(word => word.length > 0);
    const initials = words.length >= 2 
      ? `${words[0][0]}${words[1][0]}` 
      : words[0] ? words[0].substring(0, 2) : 'PR';
    // Si tiene imagen válida en product.images[size], usarla (nunca via.placeholder.com)
    if (product && product.images && product.images[size] && isValidUrl(product.images[size]) && !product.images[size].includes('via.placeholder.com')) {
      return product.images[size];
    }
    // Si tiene imagen directa, usarla (nunca via.placeholder.com)
    if (product.image && isValidUrl(product.image) && !product.image.includes('via.placeholder.com')) {
      return product.image;
    }
    // Color de fondo
    const colors = [
      '#4F46E5', '#7C3AED', '#EC4899', '#EF4444', '#F59E0B',
      '#10B981', '#06B6D4', '#8B5CF6', '#F97316', '#84CC16'
    ];
    const colorIndex = productName.length % colors.length;
    const bgColor = colors[colorIndex];
    // SVG base64
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'><rect width='100%' height='100%' fill='${bgColor}'/><text x='50%' y='55%' text-anchor='middle' fill='white' font-size='${width/2}' font-family='Arial' dy='.3em'>${initials.toUpperCase()}</text></svg>`;
    let base64;
    if (typeof window !== 'undefined' && window.btoa) {
      base64 = window.btoa(unescape(encodeURIComponent(svg)));
    } else if (typeof Buffer !== 'undefined') {
      base64 = Buffer.from(svg, 'utf-8').toString('base64');
    } else {
      base64 = btoa(svg);
    }
    return `data:image/svg+xml;base64,${base64}`;
  };

  return (
    <div className={`py-4 animate__animated animate__fadeIn ${getBackgroundClasses()}`} style={{ maxWidth: '100%', width: '100%' }}>
      {/* CSS Styles */}
      <style>{`
        /* Tienda optimizada con mejores animaciones y efectos */
        .product-card {
          transition: all 0.3s ease;
          cursor: pointer;
          border: 1px solid #e9ecef;
        }
        .product-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 30px rgba(0,0,0,0.15);
          border-color: #007bff;
        }
        .stock-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 1;
        }
        .cart-sidebar {
          position: sticky;
          top: 20px;
          max-height: calc(100vh - 40px);
          overflow-y: auto;
        }
        .customer-search-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          z-index: 1000;
          max-height: 300px;
          overflow-y: auto;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        
        /* Animaciones para favoritos */
        .btn-danger {
          animation: heartbeat 0.3s ease-in-out;
        }
        
        @keyframes heartbeat {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        /* Lazy loading placeholder */
        img[loading="lazy"] {
          transition: opacity 0.3s ease;
        }
        
        /* Quick view hover effect */
        .product-card img:hover {
          opacity: 0.9;
        }
        
        /* Price filter inputs */
        input[type="number"] {
          transition: border-color 0.2s ease;
        }
        input[type="number"]:focus {
          border-color: #007bff;
          box-shadow: 0 0 0 0.2rem rgba(0,123,255,.25);
        }

        /* Carousel Styles */
        .product-carousel {
          position: relative;
          overflow: hidden;
          border-radius: 15px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 30px 0;
          margin-bottom: 30px;
          box-shadow: 0 15px 35px rgba(0,0,0,0.1);
        }
        
        .carousel-container {
          display: flex;
          transition: transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          will-change: transform;
        }
        
        .carousel-slide {
          min-width: 320px;
          margin: 0 15px;
          opacity: 0.7;
          transform: scale(0.85);
          transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        
        .carousel-slide.active {
          opacity: 1;
          transform: scale(1);
        }
        
        .carousel-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 25px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .carousel-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          transition: left 0.6s;
        }
        
        .carousel-card:hover::before {
          left: 100%;
        }
        
        .carousel-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 30px 60px rgba(0,0,0,0.15);
        }
        
        .carousel-controls {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255, 255, 255, 0.9);
          border: none;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          z-index: 10;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        .carousel-controls:hover {
          background: white;
          transform: translateY(-50%) scale(1.1);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
        
        .carousel-controls.prev {
          left: 20px;
        }
        
        .carousel-controls.next {
          right: 20px;
        }
        
        .carousel-dots {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 25px;
        }
        
        .carousel-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
        }
        
        .carousel-dot.active {
          background: white;
          transform: scale(1.2);
        }
        
        .carousel-product-image {
          width: 100%;
          height: 160px;
          object-fit: cover;
          border-radius: 12px;
          margin-bottom: 15px;
        }
        
        .carousel-badge {
          position: absolute;
          top: 15px;
          right: 15px;
          background: linear-gradient(45deg, #ff6b6b, #ee5a24);
          color: white;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 0.8em;
          font-weight: bold;
          text-transform: uppercase;
          box-shadow: 0 3px 10px rgba(0,0,0,0.2);
        }
        
        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .carousel-slide-enter {
          animation: slideInFromRight 0.6s ease-out;
        }
        
        /* Partículas flotantes */
        .carousel-particles {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
        }
        
        .particle {
          position: absolute;
          background: rgba(255, 255, 255, 0.6);
          border-radius: 50%;
          animation: float 6s infinite ease-in-out;
        }
        
        .particle:nth-child(1) { width: 6px; height: 6px; left: 10%; animation-delay: 0s; }
        .particle:nth-child(2) { width: 8px; height: 8px; left: 20%; animation-delay: 1s; }
        .particle:nth-child(3) { width: 4px; height: 4px; left: 30%; animation-delay: 2s; }
        .particle:nth-child(4) { width: 10px; height: 10px; left: 40%; animation-delay: 3s; }
        .particle:nth-child(5) { width: 6px; height: 6px; left: 50%; animation-delay: 4s; }
        .particle:nth-child(6) { width: 8px; height: 8px; left: 60%; animation-delay: 1.5s; }
        .particle:nth-child(7) { width: 4px; height: 4px; left: 70%; animation-delay: 2.5s; }
        .particle:nth-child(8) { width: 7px; height: 7px; left: 80%; animation-delay: 3.5s; }
        .particle:nth-child(9) { width: 5px; height: 5px; left: 90%; animation-delay: 0.5s; }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(100vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
            opacity: 0.8;
          }
        }
        
        /* Efecto de brillo en el carrusel */
        .product-carousel::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
          animation: shine 8s infinite;
          pointer-events: none;
        }
        
        @keyframes shine {
          0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
          50% { transform: translateX(100%) translateY(100%) rotate(45deg); }
          100% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
        }
      `}</style>

      <h2 className={`fw-bold mb-4 d-flex align-items-center justify-content-between px-3 ${isDark ? 'text-light' : 'text-primary'}`}>
        <span>
          <i className="bi bi-shop me-2"></i>
          Sancho Distribuciones
          <span className={getBadgeClasses('warning') + ' ms-2 fs-6'}>
            <i className="bi bi-geo-alt-fill me-1"></i>
            Solo TIJUANA
          </span>
        </span>
        <div className="d-flex gap-2 align-items-center">
          <span className={getBadgeClasses('info') + ' fs-6'}>{filteredProducts.length} productos</span>
          
          {/* Botón de cambio de tema */}
          <button 
            className={getButtonClasses('outline-secondary') + ' btn-sm'}
            onClick={toggleTheme}
            title={`Cambiar a modo ${isDark ? 'claro' : 'oscuro'}`}
          >
            <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'} me-1`}></i>
            {isDark ? 'Claro' : 'Oscuro'}
          </button>
          
          <button 
            className={`btn btn-sm ${showFavorites ? 'btn-danger' : 'btn-outline-danger'}`}
            onClick={() => setShowFavorites(!showFavorites)}
            title={showFavorites ? 'Mostrar todos' : 'Solo favoritos'}
          >
            <i className="fas fa-heart me-1"></i>
            Favoritos {favoriteProducts.length > 0 && `(${favoriteProducts.length})`}
          </button>
          <button 
            className={`btn btn-sm ${bulkOrderMode ? 'btn-warning' : 'btn-outline-warning'}`}
            onClick={() => setBulkOrderMode(!bulkOrderMode)}
            title="Modo orden en lote"
          >
            <i className="fas fa-boxes me-1"></i>
            Lote
          </button>
          <button 
            className={`btn btn-sm ${showComparison ? 'btn-info' : 'btn-outline-info'}`}
            onClick={() => setShowComparison(!showComparison)}
            title="Comparar productos"
            disabled={compareProducts.length === 0}
          >
            <i className="fas fa-balance-scale me-1"></i>
            Comparar {compareProducts.length > 0 && `(${compareProducts.length})`}
          </button>
          <button 
            className={`btn btn-sm ${showPromotions ? 'btn-success' : 'btn-outline-success'}`}
            onClick={() => setShowPromotions(!showPromotions)}
            title="Ver promociones activas"
          >
            <i className="fas fa-tags me-1"></i>
            Promociones
          </button>
          <button 
            className={`btn btn-sm ${showAnalytics ? 'btn-dark' : 'btn-outline-dark'}`}
            onClick={() => setShowAnalytics(!showAnalytics)}
            title="Ver analytics y métricas"
          >
            <i className="fas fa-chart-line me-1"></i>
            Analytics
          </button>
        </div>
      </h2>

      {/* Sección de Flash Sales */}
      {flashSales.length > 0 && (
        <div className="px-3 mb-4">
          <div className="alert alert-warning" style={{ background: 'linear-gradient(45deg, #ff6b6b, #ffa500)', border: 'none' }}>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h5 className="text-white mb-2">
                  <i className="fas fa-bolt me-2"></i>
                  ⚡ Flash Sales - Ofertas Relámpago
                </h5>
                <p className="text-white mb-0">Descuentos especiales por tiempo limitado</p>
              </div>
              <div className="text-white">
                <i className="fas fa-clock fa-2x"></i>
              </div>
            </div>
            <div className="row mt-3">
              {flashSales.map(product => (
                <div key={product.id} className="col-md-4 mb-2">
                  <div className={getCardClasses() + ' border-0'}>
                    <div className="card-body p-3">
                      <div className="d-flex align-items-center">
                        <img
                          src={getProductImage(product, 'small')}
                          alt={product.name}
                          className="rounded me-3"
                          style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                          loading="lazy"
                          onError={e => { 
                            e.target.src = getProductImage(product, 'small');
                          }}
                        />
                        <div className="flex-grow-1">
                          <h6 className="mb-1">{product.name}</h6>
                          <div className="d-flex align-items-center">
                            <span className="text-decoration-line-through text-muted me-2">
                              {formatCurrency(product.originalPrice)}
                            </span>
                            <span className="text-danger fw-bold">
                              {formatCurrency(product.flashPrice)}
                            </span>
                            <span className="badge bg-danger ms-2">
                              -{Math.round((1 - product.flashPrice / product.originalPrice) * 100)}%
                            </span>
                          </div>
                          <small className="text-muted">
                            <i className="fas fa-clock me-1"></i>
                            {product.timeLeft}h restantes
                          </small>
                        </div>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => addToCart(product)}
                        >
                          <i className="fas fa-cart-plus"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sección de Promociones Activas */}
      {showPromotions && activePromotions.length > 0 && (
        <div className="px-3 mb-4">
          <div className="alert alert-success">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="mb-0">
                <i className="fas fa-gift me-2"></i>
                Promociones Activas
              </h5>
              <button
                className="btn btn-sm btn-outline-success"
                onClick={() => setShowPromotions(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="row">
              {activePromotions.map(promo => (
                <div key={promo.id} className="col-md-6 mb-3">
                  <div className="card border-success">
                    <div className="card-body">
                      <h6 className="card-title text-success">
                        <i className="fas fa-tag me-2"></i>
                        {promo.title}
                      </h6>
                      <p className="card-text">{promo.description}</p>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          {promo.type === 'percentage' && (
                            <span className="badge bg-success">{promo.value}% OFF</span>
                          )}
                          {promo.type === 'fixed' && (
                            <span className="badge bg-success">{formatCurrency(promo.value)} OFF</span>
                          )}
                          {promo.type === 'bogo' && (
                            <span className="badge bg-success">2x1</span>
                          )}
                          {promo.minAmount && (
                            <small className="text-muted ms-2">
                              Min: {formatCurrency(promo.minAmount)}
                            </small>
                          )}
                        </div>
                        <small className="text-muted">
                          Válido hasta: {new Date(promo.validUntil).toLocaleDateString()}
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FASE 4: Panel de Analytics */}
      {showAnalytics && (
        <div className="px-3 mb-4">
          <div className="alert alert-dark">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="mb-0">
                <i className="fas fa-chart-line me-2"></i>
                Analytics Dashboard
              </h5>
              <button
                className="btn btn-sm btn-outline-light"
                onClick={() => setShowAnalytics(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="row g-3">
              {/* Métricas en tiempo real */}
              <div className="col-md-3">
                <div className="card bg-primary text-white">
                  <div className="card-body text-center">
                    <i className="fas fa-users fa-2x mb-2"></i>
                    <h4 className="mb-1">{realTimeMetrics.currentUsers}</h4>
                    <small>Usuarios Activos</small>
                  </div>
                </div>
              </div>
              
              <div className="col-md-3">
                <div className="card bg-success text-white">
                  <div className="card-body text-center">
                    <i className="fas fa-eye fa-2x mb-2"></i>
                    <h4 className="mb-1">{analytics.productViews.size}</h4>
                    <small>Productos Vistos</small>
                  </div>
                </div>
              </div>
              
              <div className="col-md-3">
                <div className="card bg-info text-white">
                  <div className="card-body text-center">
                    <i className="fas fa-shopping-cart fa-2x mb-2"></i>
                    <h4 className="mb-1">{analytics.cartEvents.length}</h4>
                    <small>Agregados al Carrito</small>
                  </div>
                </div>
              </div>
              
              <div className="col-md-3">
                <div className="card bg-warning text-dark">
                  <div className="card-body text-center">
                    <i className="fas fa-percentage fa-2x mb-2"></i>
                    <h4 className="mb-1">{userBehavior.conversionRate.toFixed(1)}%</h4>
                    <small>Tasa de Conversión</small>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="row g-3 mt-3">
              {/* Productos más vistos */}
              <div className="col-md-6">
                <div className="card">
                  <div className="card-header">
                    <h6 className="mb-0">
                      <i className="fas fa-fire me-2"></i>
                      Productos Más Vistos
                    </h6>
                  </div>
                  <div className="card-body p-2">
                    {userBehavior.mostViewedProducts.length > 0 ? (
                      userBehavior.mostViewedProducts.slice(0, 5).map((item, idx) => (
                        <div key={item.product.id} className="d-flex align-items-center mb-2 p-2 border-bottom">
                          <span className="badge bg-primary me-2">{idx + 1}</span>
                          <img
                            src={getProductImage(item.product, 'small')}
                            alt={item.product.name}
                            className="rounded me-2"
                            style={{ width: '30px', height: '30px', objectFit: 'cover' }}
                            onError={e => { 
                              e.target.src = getProductImage(item.product, 'small');
                            }}
                          />
                          <div className="flex-grow-1">
                            <small className="fw-bold d-block">{item.product.name}</small>
                            <small className="text-muted">{item.views} vistas</small>
                          </div>
                        </div>
                      ))
                    ) : (
                      <small className="text-muted">No hay datos disponibles</small>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Tendencias de búsqueda */}
              <div className="col-md-6">
                <div className="card">
                  <div className="card-header">
                    <h6 className="mb-0">
                      <i className="fas fa-search me-2"></i>
                      Tendencias de Búsqueda
                    </h6>
                  </div>
                  <div className="card-body p-2">
                    {userBehavior.searchTrends.length > 0 ? (
                      userBehavior.searchTrends.slice(0, 8).map(([query, count], idx) => (
                        <div key={query} className="d-flex justify-content-between align-items-center mb-2 p-2 border-bottom">
                          <div className="d-flex align-items-center">
                            <span className="badge bg-secondary me-2">{idx + 1}</span>
                            <small className="fw-bold">"{query}"</small>
                          </div>
                          <span className="badge bg-info">{count}</span>
                        </div>
                      ))
                    ) : (
                      <small className="text-muted">No hay búsquedas registradas</small>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="row g-3 mt-3">
              {/* Actividad en tiempo real */}
              <div className="col-md-6">
                <div className="card">
                  <div className="card-header">
                    <h6 className="mb-0">
                      <i className="fas fa-clock me-2"></i>
                      Actividad en Tiempo Real
                    </h6>
                  </div>
                  <div className="card-body p-2">
                    {realTimeMetrics.activeProductViews.length > 0 ? (
                      realTimeMetrics.activeProductViews.map((view, idx) => (
                        <div key={idx} className="d-flex align-items-center mb-2 p-1 border-bottom">
                          <span className="badge bg-success me-2">LIVE</span>
                          <small>
                            Vista de "{view.productName}" en {view.category}
                          </small>
                        </div>
                      ))
                    ) : (
                      <small className="text-muted">No hay actividad reciente</small>
                    )}
                    
                    {realTimeMetrics.currentSearches.length > 0 && (
                      <div className="mt-2">
                        <small className="fw-bold d-block mb-1">Búsquedas recientes:</small>
                        {realTimeMetrics.currentSearches.map((search, idx) => (
                          <div key={idx} className="d-flex align-items-center mb-1">
                            <span className="badge bg-info me-2">SEARCH</span>
                            <small>"{search.query}"</small>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Resumen de eventos */}
              <div className="col-md-6">
                <div className="card">
                  <div className="card-header">
                    <h6 className="mb-0">
                      <i className="fas fa-list me-2"></i>
                      Resumen de Eventos
                    </h6>
                  </div>
                  <div className="card-body p-2">
                    <div className="row g-2 text-center">
                      <div className="col-6">
                        <div className="border rounded p-2">
                          <div className="h5 mb-1 text-primary">{analytics.favoriteEvents.length}</div>
                          <small>Favoritos</small>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="border rounded p-2">
                          <div className="h5 mb-1 text-info">{analytics.comparisonEvents.length}</div>
                          <small>Comparaciones</small>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="border rounded p-2">
                          <div className="h5 mb-1 text-warning">{userBehavior.abandonedCarts}</div>
                          <small>Carritos Abandonados</small>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="border rounded p-2">
                          <div className="h5 mb-1 text-success">{analytics.purchaseEvents.length}</div>
                          <small>Compras</small>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <small className="text-muted d-block">
                        <i className="fas fa-clock me-1"></i>
                        Sesión iniciada: {analytics.sessionStart.toLocaleTimeString()}
                      </small>
                      <small className="text-muted d-block">
                        <i className="fas fa-mouse-pointer me-1"></i>
                        Total de eventos: {analytics.clickEvents.length}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="d-flex justify-content-center align-items-center py-5">
          <div className="spinner-border text-primary me-3" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <span>Cargando productos...</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="row px-3">
          {/* Columna principal de productos */}
          <div className="col-lg-8">
            {/* Alerta informativa sobre filtro de almacén */}
            <div className="alert alert-warning d-flex align-items-center mb-3" role="alert">
              <i className="bi bi-info-circle-fill me-2"></i>
              <div>
                <strong>Filtro activo:</strong> Solo se muestran productos con stock disponible en el almacén <strong>TIJUANA</strong>.
              </div>
            </div>

            {/* Carrusel de productos destacados */}
            {carouselProducts.length > 0 && (
              <div className="product-carousel">
                {/* Partículas flotantes */}
                <div className="carousel-particles">
                  <div className="particle"></div>
                  <div className="particle"></div>
                  <div className="particle"></div>
                  <div className="particle"></div>
                  <div className="particle"></div>
                  <div className="particle"></div>
                  <div className="particle"></div>
                  <div className="particle"></div>
                  <div className="particle"></div>
                </div>
                
                <div className="text-center mb-4">
                  <h3 className="text-white fw-bold">
                    <i className="bi bi-star-fill me-2"></i>
                    Productos Destacados
                  </h3>
                  <p className="text-white opacity-75 mb-0">Los mejores productos de nuestro catálogo</p>
                </div>
                
                <div style={{ position: 'relative', overflow: 'hidden', height: '300px' }}>
                  <div 
                    className="carousel-container"
                    style={{
                      transform: `translateX(-${currentSlide * (320 + 30)}px)`,
                      width: `${carouselProducts.length * (320 + 30)}px`
                    }}
                  >
                    {carouselProducts.map((product, index) => {
                      const isActive = index >= currentSlide && index < currentSlide + 3;
                      const positionInView = index - currentSlide;
                      
                      return (
                        <div 
                          key={product.id}
                          className={`carousel-slide ${positionInView === 1 ? 'active' : ''}`}
                          style={{
                            opacity: isActive ? (positionInView === 1 ? 1 : 0.7) : 0.3,
                            transform: `scale(${positionInView === 1 ? 1 : 0.85})`
                          }}
                        >
                          <div className="carousel-card">
                            {product.carouselBadge && (
                              <div className="carousel-badge">
                                {product.carouselBadge}
                              </div>
                            )}
                            
                            <img
                              src={generateProductImage(product.name)}
                              alt={product.name}
                              className="carousel-product-image"
                              onError={(e) => {
                                e.target.src = generateProductImage(product.name);
                              }}
                            />
                            
                            <div className="text-center">
                              <h5 className="fw-bold mb-2" style={{ color: '#333', fontSize: '1.1em' }}>
                                {product.name}
                              </h5>
                              <p className="text-muted small mb-2">
                                SKU: {product.sku}
                              </p>
                              <div className="d-flex justify-content-between align-items-center">
                                <span className="h5 text-primary fw-bold mb-0">
                                  ${product.sale_price}
                                </span>
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => addToCart(product)}
                                >
                                  <i className="bi bi-cart-plus me-1"></i>
                                  Agregar
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Controles del carrusel */}
                {carouselProducts.length > 3 && (
                  <>
                    <button 
                      className="carousel-controls prev"
                      onClick={prevSlide}
                    >
                      <i className="bi bi-chevron-left fs-5"></i>
                    </button>
                    
                    <button 
                      className="carousel-controls next"
                      onClick={nextSlide}
                    >
                      <i className="bi bi-chevron-right fs-5"></i>
                    </button>
                    
                    {/* Dots indicadores */}
                    <div className="carousel-dots">
                      {Array.from({ length: Math.max(1, carouselProducts.length - 2) }).map((_, index) => (
                        <button
                          key={index}
                          className={`carousel-dot ${currentSlide === index ? 'active' : ''}`}
                          onClick={() => goToSlide(index)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Barra de filtros mejorada */}
            <div className="card mb-4 shadow-sm">
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-4">
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="bi bi-search"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Buscar productos, marcas, SKU..."
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setPage(1);
                          // FASE 4: Tracking de búsqueda
                          if (e.target.value.length > 2) {
                            trackSearch(e.target.value);
                          }
                        }}
                      />
                      {search && (
                        <button
                          className="btn btn-outline-secondary"
                          onClick={() => {
                            setSearch('');
                            setPage(1);
                          }}
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      )}
                    </div>
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
                      {brands.map(brand => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
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
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-2">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Precio mín."
                      value={priceFilter.min}
                      onChange={(e) => {
                        setPriceFilter(prev => ({ ...prev, min: e.target.value }));
                        setPage(1);
                      }}
                    />
                  </div>
                  <div className="col-md-2">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Precio máx."
                      value={priceFilter.max}
                      onChange={(e) => {
                        setPriceFilter(prev => ({ ...prev, max: e.target.value }));
                        setPage(1);
                      }}
                    />
                  </div>
                </div>
                
                <div className="row mt-3">
                  <div className="col-auto">
                    <div className="btn-group" role="group">
                      <button
                        type="button"
                        className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setViewMode('grid')}
                      >
                        <i className="bi bi-grid-3x3-gap"></i> Cuadrícula
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setViewMode('list')}
                      >
                        <i className="bi bi-list"></i> Lista
                      </button>
                    </div>
                  </div>
                  <div className="col-auto">
                    <button
                      type="button"
                      className={`btn btn-sm ${showFavorites ? 'btn-danger' : 'btn-outline-danger'}`}
                      onClick={() => {
                        setShowFavorites(!showFavorites);
                        setPage(1);
                      }}
                    >
                      <i className="bi bi-heart"></i> Favoritos
                      {favoriteProducts.length > 0 && (
                        <span className="badge bg-light text-dark ms-1">{favoriteProducts.length}</span>
                      )}
                    </button>
                  </div>
                  <div className="col-auto">
                    <button
                      type="button"
                      className={`btn btn-sm ${bulkOrderMode ? 'btn-warning' : 'btn-outline-warning'}`}
                      onClick={() => setBulkOrderMode(!bulkOrderMode)}
                    >
                      <i className="bi bi-cart-plus"></i> Pedido en Lote
                      {bulkItems.length > 0 && (
                        <span className="badge bg-light text-dark ms-1">{bulkItems.length}</span>
                      )}
                    </button>
                  </div>
                  <div className="col-auto">
                    <button
                      type="button"
                      className={`btn btn-sm ${showComparison ? 'btn-info' : 'btn-outline-info'}`}
                      onClick={() => setShowComparison(!showComparison)}
                      disabled={compareProducts.length === 0}
                    >
                      <i className="bi bi-arrow-left-right"></i> Comparar
                      {compareProducts.length > 0 && (
                        <span className="badge bg-light text-dark ms-1">{compareProducts.length}</span>
                      )}
                    </button>
                  </div>
                  <div className="col-auto ms-auto">
                    {(search || selectedBrand || selectedCategory || priceFilter.min || priceFilter.max || showFavorites) && (
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => {
                          setSearch('');
                          setSelectedBrand('');
                          setSelectedCategory('');
                          setPriceFilter({ min: '', max: '' });
                          setShowFavorites(false);
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
            </div>

            {/* Barra de opciones de visualización y paginación */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex align-items-center gap-3">
                <small className="text-muted">
                  {filteredProducts.length > 0 && (
                    <>Mostrando {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, filteredProducts.length)} de {filteredProducts.length} productos</>
                  )}
                </small>
              </div>
              <div className="d-flex align-items-center gap-2">
                <small className="text-muted me-2">Por página:</small>
                <select 
                  className="form-select form-select-sm" 
                  style={{width: 'auto'}}
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1); // Reset to first page when changing page size
                  }}
                >
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                  <option value={48}>48</option>
                  <option value={96}>96</option>
                </select>
              </div>
            </div>

            {/* Lista de productos */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-search display-1 text-muted"></i>
                <h4 className="text-muted mt-3">No se encontraron productos</h4>
                <p className="text-muted">Intenta ajustar los filtros de búsqueda</p>
              </div>
            ) : (
              <>
                <div className={viewMode === 'grid' ? 'row g-3' : ''}>
                  {paginatedProducts.map(product => {
                    const stockInfo = getStockBadge(product.minimum_stock);
                    const imgSrc = getProductImage(product, 'medium');

                    if (viewMode === 'grid') {
                      return (
                        <div key={product.id} className="col-md-6 col-lg-4">
                          <div className="card h-100 product-card position-relative" style={{ borderRadius: 12 }}>
                            <div className={`badge bg-${stockInfo.color} stock-badge`}>
                              {stockInfo.icon} {stockInfo.text}
                            </div>
                            
                            {/* Botón de favoritos */}
                            <button
                              className={`btn btn-sm position-absolute ${isFavorite(product.id) ? 'btn-danger' : 'btn-outline-light'}`}
                              style={{ top: 10, left: 10, zIndex: 2 }}
                              onClick={() => toggleFavorite(product.id)}
                              title={isFavorite(product.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                            >
                              <i className={`bi ${isFavorite(product.id) ? 'bi-heart-fill' : 'bi-heart'}`}></i>
                            </button>

                            <img
                              src={imgSrc}
                              alt={product.name}
                              className="card-img-top"
                              style={{ 
                                borderRadius: '12px 12px 0 0', 
                                objectFit: 'cover', 
                                height: 200,
                                cursor: 'pointer'
                              }}
                              loading="lazy"
                              onError={e => { 
                                e.target.src = getProductImage(product, 'medium');
                              }}
                              onClick={() => openQuickView(product)}
                            />
                            <div className="card-body d-flex flex-column">
                              <h5 className="card-title fw-bold text-truncate" title={product.name}>
                                {product.name}
                              </h5>
                              <p className="text-muted small mb-2">
                                <i className="bi bi-tag me-1"></i>{product.brand?.name} | 
                                <i className="bi bi-collection ms-2 me-1"></i>{product.category?.name}
                              </p>
                              <p className="text-muted small mb-2">
                                <i className="bi bi-upc me-1"></i>SKU: {product.sku}
                              </p>
                              <div className="mt-auto">
                                {/* Precios dinámicos con promociones */}
                                <div className="mb-2">
                                  {dynamicPricing[product.id] ? (
                                    <div>
                                      {dynamicPricing[product.id].finalPrice < dynamicPricing[product.id].originalPrice ? (
                                        <div>
                                          <span className="text-muted text-decoration-line-through small">
                                            {formatCurrency(dynamicPricing[product.id].originalPrice)}
                                          </span>
                                          <span className="h5 text-danger mb-0 ms-2">
                                            {formatCurrency(dynamicPricing[product.id].finalPrice)}
                                          </span>
                                          <span className="badge bg-danger ms-2">
                                            -{Math.round(dynamicPricing[product.id].discount)}%
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="h5 text-success mb-0">
                                          {formatCurrency(product.price)}
                                        </span>
                                      )}
                                      
                                      {/* Mostrar promociones aplicadas */}
                                      {dynamicPricing[product.id].promotions?.length > 0 && (
                                        <div className="mt-1">
                                          {dynamicPricing[product.id].promotions.map((promo, idx) => (
                                            <span key={idx} className="badge bg-success me-1 small">
                                              {promo.type === 'flash' ? '⚡' : '🎁'} 
                                              {promo.title}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="h5 text-success mb-0">{formatCurrency(product.price)}</span>
                                  )}
                                </div>
                                
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                  <div className="btn-group" role="group">
                                    <button
                                      className="btn btn-outline-info btn-sm"
                                      onClick={() => openQuickView(product)}
                                      title="Vista rápida"
                                    >
                                      <i className="bi bi-eye"></i>
                                    </button>
                                    <button
                                      className={`btn btn-sm ${compareProducts.find(p => p.id === product.id) ? 'btn-info' : 'btn-outline-secondary'}`}
                                      onClick={() => toggleCompareProduct(product)}
                                      title="Comparar"
                                      disabled={!compareProducts.find(p => p.id === product.id) && compareProducts.length >= 3}
                                    >
                                      <i className="bi bi-arrow-left-right"></i>
                                    </button>
                                  </div>
                                </div>
                                
                                {bulkOrderMode ? (
                                  <div className="d-flex gap-2">
                                    <input
                                      type="number"
                                      className="form-control form-control-sm"
                                      placeholder="Cant."
                                      min="1"
                                      defaultValue="1"
                                      style={{ width: '70px' }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          const quantity = parseInt(e.target.value) || 1;
                                          addToBulk(product, quantity);
                                          e.target.value = '1';
                                        }
                                      }}
                                    />
                                    <button
                                      className="btn btn-warning btn-sm flex-grow-1"
                                      onClick={(e) => {
                                        const input = e.target.parentElement.querySelector('input');
                                        const quantity = parseInt(input.value) || 1;
                                        addToBulk(product, quantity);
                                        input.value = '1';
                                      }}
                                    >
                                      <i className="bi bi-plus-circle me-1"></i>
                                      Agregar a lote
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    className="btn btn-primary w-100"
                                    onClick={() => addToCart(product)}
                                  >
                                    <i className="bi bi-cart-plus me-1"></i>
                                    Agregar al carrito
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div key={product.id} className="card mb-3 product-card">
                          <div className="row g-0">
                            <div className="col-md-3">
                              <div className="position-relative">
                                <div className={`badge bg-${stockInfo.color} stock-badge`}>
                                  {stockInfo.icon} {stockInfo.text}
                                </div>
                                <img
                                  src={getProductImage(product, 'medium')}
                                  alt={product.name}
                                  className="img-fluid rounded-start"
                                  style={{ objectFit: 'cover', height: 150, width: '100%' }}
                                  onError={e => { 
                                    e.target.src = getProductImage(product, 'medium');
                                  }}
                                />
                              </div>
                            </div>
                            <div className="col-md-9">
                              <div className="card-body d-flex flex-column h-100">
                                <div>
                                  <h5 className="card-title fw-bold">{product.name}</h5>
                                  <p className="text-muted small">
                                    <i className="bi bi-tag me-1"></i>{product.brand?.name} | 
                                    <i className="bi bi-collection ms-2 me-1"></i>{product.category?.name} | 
                                    <i className="bi bi-upc ms-2 me-1"></i>SKU: {product.sku}
                                  </p>
                                </div>
                                <div className="mt-auto d-flex justify-content-between align-items-center">
                                  <div>
                                    {/* Precios dinámicos en vista lista */}
                                    {dynamicPricing[product.id] ? (
                                      <div>
                                        {dynamicPricing[product.id].finalPrice < dynamicPricing[product.id].originalPrice ? (
                                          <div>
                                            <span className="text-muted text-decoration-line-through me-2">
                                              {formatCurrency(dynamicPricing[product.id].originalPrice)}
                                            </span>
                                            <span className="h4 text-danger">
                                              {formatCurrency(dynamicPricing[product.id].finalPrice)}
                                            </span>
                                            <span className="badge bg-danger ms-2">
                                              -{Math.round(dynamicPricing[product.id].discount)}%
                                            </span>
                                            
                                            {/* Mostrar promociones aplicadas */}
                                            {dynamicPricing[product.id].promotions?.length > 0 && (
                                              <div className="mt-1">
                                                {dynamicPricing[product.id].promotions.map((promo, idx) => (
                                                  <span key={idx} className="badge bg-success me-1">
                                                    {promo.type === 'flash' ? '⚡' : '🎁'} 
                                                    {promo.title}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="h4 text-success">{formatCurrency(product.price)}</span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="h4 text-success">{formatCurrency(product.price)}</span>
                                    )}
                                    
                                    <br />
                                    <small className="text-muted">SKU: {product.sku}</small>
                                  </div>
                                  <button
                                    className="btn btn-primary"
                                    onClick={() => addToCart(product)}
                                  >
                                    <i className="bi bi-cart-plus me-1"></i>
                                    Agregar al carrito
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>

                {/* Paginación mejorada */}
                {totalPages > 1 && (
                  <nav className="mt-4">
                    <ul className="pagination justify-content-center">
                      {/* Botón Anterior */}
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => setPage(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          <i className="bi bi-chevron-left"></i> Anterior
                        </button>
                      </li>
                      
                      {/* Primera página */}
                      {currentPage > 3 && (
                        <>
                          <li className="page-item">
                            <button className="page-link" onClick={() => setPage(1)}>1</button>
                          </li>
                          {currentPage > 4 && (
                            <li className="page-item disabled">
                              <span className="page-link">...</span>
                            </li>
                          )}
                        </>
                      )}
                      
                      {/* Páginas alrededor de la actual */}
                      {(() => {
                        const start = Math.max(1, currentPage - 2);
                        const end = Math.min(totalPages, currentPage + 2);
                        const pages = [];
                        
                        for (let i = start; i <= end; i++) {
                          pages.push(
                            <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`}>
                              <button
                                className="page-link"
                                onClick={() => setPage(i)}
                              >
                                {i}
                              </button>
                            </li>
                          );
                        }
                        return pages;
                      })()}
                      
                      {/* Última página */}
                      {currentPage < totalPages - 2 && (
                        <>
                          {currentPage < totalPages - 3 && (
                            <li className="page-item disabled">
                              <span className="page-link">...</span>
                            </li>
                          )}
                          <li className="page-item">
                            <button className="page-link" onClick={() => setPage(totalPages)}>
                              {totalPages}
                            </button>
                          </li>
                        </>
                      )}
                      
                      {/* Botón Siguiente */}
                      <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => setPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Siguiente <i className="bi bi-chevron-right"></i>
                        </button>
                      </li>
                    </ul>
                  </nav>
                )}
              </>
            )}
          </div>

          {/* Sidebar del carrito */}
          <div className="col-lg-4">
            <div className="card cart-sidebar shadow">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="bi bi-cart me-2"></i>
                  Carrito de compras
                  {cart.length > 0 && (
                    <span className="badge bg-light text-primary ms-2">{cart.length}</span>
                  )}
                </h5>
              </div>
              <div className="card-body">
                {/* Selector de cliente */}
                <div className="mb-3">
                  <label className="form-label fw-bold">Cliente</label>
                  <div className="position-relative">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Buscar cliente por nombre, código o email..."
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setSelectedCustomer('');
                      }}
                    />
                    
                    {debouncedCustomerSearch && filteredCustomers.length > 0 && (
                      <div className="card customer-search-dropdown">
                        <div className="card-body p-0" style={{ maxHeight: 200, overflowY: 'auto' }}>
                          {filteredCustomers.map(customer => (
                            <button
                              key={customer.code}
                              type="button"
                              className="list-group-item list-group-item-action border-0"
                              onClick={() => handleCustomerSelect(customer)}
                            >
                              <div className="d-flex flex-column">
                                <strong>{customer.name}</strong>
                                <small className="text-muted">{customer.code} | {customer.email}</small>
                                {customer.customer_type && (
                                  <small className="text-success">
                                    Descuento: {customer.customer_type.discount_percentage}%
                                  </small>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {selectedCustomer && (
                    <div className="alert alert-success mt-2 py-2">
                      <small>
                        <i className="bi bi-check-circle me-1"></i>
                        Cliente seleccionado
                        {customerDiscount > 0 && (
                          <span className="ms-2 badge bg-success">
                            Descuento: {customerDiscount}%
                          </span>
                        )}
                      </small>
                    </div>
                  )}
                </div>

                {/* Items del carrito */}
                {cart.length === 0 ? (
                  <div className="text-center text-muted py-4">
                    <i className="bi bi-cart-x display-4"></i>
                    <p className="mt-2">El carrito está vacío</p>
                    <small>Agrega productos para comenzar</small>
                  </div>
                ) : (
                  <>
                    <div className="mb-3" style={{ maxHeight: 300, overflowY: 'auto' }}>
                      {cart.map(item => (
                        <div key={item.id} className="d-flex align-items-center border-bottom py-2">
                          <div className="flex-shrink-0 me-2">
                            <img
                              src={getProductImage(item, 'small')}
                              alt={item.name}
                              className="rounded"
                              style={{ width: 40, height: 40, objectFit: 'cover' }}
                              onError={e => { 
                                e.target.src = getProductImage(item, 'small');
                              }}
                            />
                          </div>
                          <div className="flex-grow-1 me-2">
                            <div className="fw-bold small text-truncate">{item.name}</div>
                            <div className="d-flex align-items-center">
                              {item.originalPrice && item.originalPrice > item.price ? (
                                <>
                                  <span className="text-muted text-decoration-line-through small me-1">
                                    {formatCurrency(item.originalPrice)}
                                  </span>
                                  <span className="text-danger small">{formatCurrency(item.price)}</span>
                                </>
                              ) : (
                                <span className="text-muted small">{formatCurrency(item.price)}</span>
                              )}
                            </div>
                            {/* Mostrar promociones aplicadas en el carrito */}
                            {item.appliedPromotions?.length > 0 && (
                              <div className="mt-1">
                                {item.appliedPromotions.slice(0, 2).map((promo, idx) => (
                                  <span key={idx} className="badge bg-success me-1" style={{ fontSize: '0.7em' }}>
                                    {promo.type === 'flash' ? '⚡' : '🎁'}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="d-flex align-items-center">
                            <button
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                            >
                              <i className="bi bi-dash"></i>
                            </button>
                            <span className="mx-2 fw-bold">{item.quantity}</span>
                            <button
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                            >
                              <i className="bi bi-plus"></i>
                            </button>
                            <button
                              className="btn btn-outline-danger btn-sm ms-2"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Sección de cupones */}
                    <div className="mb-3">
                      <div className="input-group input-group-sm">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Código de cupón (WELCOME10, SAVE50, FIRST20)"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                        />
                        <button
                          className="btn btn-outline-primary"
                          onClick={() => applyCoupon(couponCode)}
                          disabled={!couponCode.trim()}
                        >
                          Aplicar
                        </button>
                      </div>
                      
                      {appliedCoupons.length > 0 && (
                        <div className="mt-2">
                          {appliedCoupons.map(coupon => (
                            <span key={coupon.code} className="badge bg-warning text-dark me-2">
                              {coupon.code} -{coupon.type === 'percentage' ? `${coupon.value}%` : formatCurrency(coupon.value)}
                              <button
                                className="btn btn-sm ms-1 p-0"
                                onClick={() => removeCoupon(coupon.code)}
                                style={{ background: 'none', border: 'none', color: 'inherit' }}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Resumen de totales */}
                    <div className="border-top pt-3">
                      <div className="d-flex justify-content-between mb-2">
                        <span>Subtotal:</span>
                        <span className="fw-bold">{formatCurrency(cartTotal)}</span>
                      </div>
                      
                      {/* Descuentos por promociones */}
                      {promoDiscount > 0 && (
                        <div className="d-flex justify-content-between mb-2 text-success">
                          <span>Desc. promociones:</span>
                          <span className="fw-bold">-{formatCurrency(promoDiscount)}</span>
                        </div>
                      )}
                      
                      {/* Descuento del cliente */}
                      {discountAmount > 0 && (
                        <div className="d-flex justify-content-between mb-2 text-info">
                          <span>Desc. cliente ({customerDiscount}%):</span>
                          <span className="fw-bold">-{formatCurrency(discountAmount)}</span>
                        </div>
                      )}
                      
                      {/* Descuentos por cupones */}
                      {couponDiscount > 0 && (
                        <div className="d-flex justify-content-between mb-2 text-warning">
                          <span>Desc. cupones:</span>
                          <span className="fw-bold">-{formatCurrency(couponDiscount)}</span>
                        </div>
                      )}
                      
                      {/* Total de descuentos */}
                      {totalDiscount > 0 && (
                        <div className="d-flex justify-content-between mb-2 border-top pt-2">
                          <span className="text-success">Total ahorros:</span>
                          <span className="fw-bold text-success">{formatCurrency(totalDiscount)}</span>
                        </div>
                      )}
                      
                      <div className="d-flex justify-content-between border-top pt-2">
                        <span className="fw-bold">Total final:</span>
                        <span className="fw-bold h5 text-success">{formatCurrency(totalWithDiscount)}</span>
                      </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="d-grid gap-2 mt-3">
                      <button
                        className="btn btn-outline-secondary"
                        onClick={() => clearCart()}
                      >
                        <i className="bi bi-trash me-1"></i>
                        Vaciar carrito
                      </button>
                      <button
                        className="btn btn-success"
                        onClick={() => {
                          // Validar que el cliente seleccionado existe en la lista
                          const customerExists = customers.find(c => c.code === selectedCustomer);
                          if (!customerExists) {
                            setOrderError('Por favor selecciona un cliente válido de la lista');
                            setTimeout(() => setOrderError(''), 3000);
                            return;
                          }
                          setShowCheckout(true);
                        }}
                        disabled={!selectedCustomer || cart.length === 0 || loadingOrder}
                      >
                        {loadingOrder ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Procesando...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-credit-card me-1"></i>
                            Proceder al checkout
                          </>
                        )}
                      </button>
                      
                      {(!selectedCustomer || cart.length === 0) && (
                        <small className="text-muted mt-2 d-block">
                          {!selectedCustomer && <span><i className="bi bi-info-circle me-1"></i>Selecciona un cliente para continuar</span>}
                          {cart.length === 0 && <span><i className="bi bi-info-circle me-1"></i>Agrega productos al carrito</span>}
                        </small>
                      )}
                    </div>
                  </>
                )}

                {/* Panel de pedido en lote */}
                {bulkItems.length > 0 && (
                  <div className="mt-4">
                    <div className="card bg-warning bg-opacity-10">
                      <div className="card-header bg-warning text-dark">
                        <h6 className="mb-0">
                          <i className="bi bi-cart-plus me-2"></i>
                          Pedido en Lote ({bulkItems.length} productos)
                        </h6>
                      </div>
                      <div className="card-body p-2">
                        <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                          {bulkItems.map(item => (
                            <div key={item.id} className="d-flex justify-content-between align-items-center py-1 border-bottom">
                              <div className="flex-grow-1">
                                <small className="fw-bold">{item.name}</small>
                                <br />
                                <small className="text-muted">
                                  {item.quantity}x - {formatCurrency(item.price * item.quantity)}
                                </small>
                              </div>
                              <button
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => setBulkItems(prev => prev.filter(i => i.id !== item.id))}
                              >
                                <i className="bi bi-x"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="d-grid gap-2 mt-2">
                          <button
                            className="btn btn-warning btn-sm"
                            onClick={processBulkOrder}
                          >
                            <i className="bi bi-cart-check me-1"></i>
                            Agregar todo al carrito
                          </button>
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => setBulkItems([])}
                          >
                            Limpiar lote
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Órdenes recientes */}
                {selectedCustomer && recentOrders.length > 0 && (
                  <div className="mt-4">
                    <h6 className="fw-bold">Órdenes recientes</h6>
                    <div className="small">
                      {recentOrders.map(order => (
                        <div key={order.id} className="d-flex justify-content-between border-bottom py-1">
                          <span>#{order.id} - {order.order_date}</span>
                          <span className="fw-bold">{formatCurrency(order.total_amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recomendaciones inteligentes */}
                {recommendations.length > 0 && (
                  <div className="mt-4">
                    <div className="card border-info">
                      <div className="card-header bg-info text-white">
                        <h6 className="mb-0">
                          <i className="fas fa-lightbulb me-2"></i>
                          Recomendado para ti
                        </h6>
                      </div>
                      <div className="card-body p-2">
                        {recommendations.map(product => {
                          const pricing = dynamicPricing[product.id];
                          return (
                            <div key={product.id} className="d-flex align-items-center mb-2 p-2 border rounded">
                              <img
                                src={getProductImage(product, 'small')}
                                alt={product.name}
                                className="rounded me-2"
                                style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                                loading="lazy"
                                onError={e => { 
                                  e.target.src = getProductImage(product, 'small');
                                }}
                              />
                              <div className="flex-grow-1">
                                <small className="fw-bold d-block">{product.name}</small>
                                <div>
                                  {pricing && pricing.finalPrice < pricing.originalPrice ? (
                                    <>
                                      <small className="text-muted text-decoration-line-through me-1">
                                        {formatCurrency(pricing.originalPrice)}
                                      </small>
                                      <small className="text-danger fw-bold">
                                        {formatCurrency(pricing.finalPrice)}
                                      </small>
                                      <span className="badge bg-danger ms-1" style={{ fontSize: '0.6em' }}>
                                        -{Math.round(pricing.discount)}%
                                      </span>
                                    </>
                                  ) : (
                                    <small className="text-muted">{formatCurrency(product.price)}</small>
                                  )}
                                </div>
                                {pricing?.promotions?.length > 0 && (
                                  <div className="mt-1">
                                    {pricing.promotions.slice(0, 1).map((promo, idx) => (
                                      <span key={idx} className="badge bg-success" style={{ fontSize: '0.6em' }}>
                                        {promo.type === 'flash' ? '⚡' : '🎁'} {promo.title}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => addToCart(product)}
                              >
                                <i className="fas fa-plus"></i>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Mensajes de feedback */}
                {orderSuccess && (
                  <div className="alert alert-success mt-3 py-2">
                    <small>
                      <i className="bi bi-check-circle me-1"></i>
                      {orderSuccess}
                    </small>
                  </div>
                )}
                {orderError && (
                  <div className="alert alert-danger mt-3 py-2">
                    <small>
                      <i className="bi bi-exclamation-triangle me-1"></i>
                      {orderError}
                    </small>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Quick View */}
      {showQuickView && quickViewProduct && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-eye me-2"></i>
                  Vista Rápida - {quickViewProduct.name}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeQuickView}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <div className="position-relative">
                      <button
                        className={`btn btn-sm position-absolute ${isFavorite(quickViewProduct.id) ? 'btn-danger' : 'btn-outline-light'}`}
                        style={{ top: 10, right: 10, zIndex: 2 }}
                        onClick={() => toggleFavorite(quickViewProduct.id)}
                      >
                        <i className={`bi ${isFavorite(quickViewProduct.id) ? 'bi-heart-fill' : 'bi-heart'}`}></i>
                      </button>
                      <img
                        src={getProductImage(quickViewProduct, 'large')}
                        alt={quickViewProduct.name}
                        className="img-fluid rounded"
                        style={{ width: '100%', height: 300, objectFit: 'cover' }}
                        onError={e => { 
                          e.target.src = getProductImage(quickViewProduct, 'large');
                        }}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="h-100 d-flex flex-column">
                      <h4 className="fw-bold">{quickViewProduct.name}</h4>
                      <div className="mb-3">
                        <span className="badge bg-success">✅ Disponible</span>
                        {isFavorite(quickViewProduct.id) && (
                          <span className="badge bg-danger ms-2">❤️ Favorito</span>
                        )}
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-muted mb-1">
                          <i className="bi bi-tag me-1"></i>
                          <strong>Marca:</strong> {quickViewProduct.brand?.name || 'Sin marca'}
                        </p>
                        <p className="text-muted mb-1">
                          <i className="bi bi-collection me-1"></i>
                          <strong>Categoría:</strong> {quickViewProduct.category?.name || 'Sin categoría'}
                        </p>
                        <p className="text-muted mb-1">
                          <i className="bi bi-upc me-1"></i>
                          <strong>SKU:</strong> {quickViewProduct.sku}
                        </p>
                      </div>

                      {quickViewProduct.description && (
                        <div className="mb-3">
                          <h6>Descripción:</h6>
                          <p className="text-muted">{quickViewProduct.description}</p>
                        </div>
                      )}

                      <div className="mt-auto">
                        <div className="mb-3">
                          <span className="h3 text-success fw-bold">{formatCurrency(quickViewProduct.price)}</span>
                        </div>
                        
                        <div className="d-grid gap-2">
                          <button
                            className="btn btn-primary btn-lg"
                            onClick={() => {
                              addToCart(quickViewProduct);
                              closeQuickView();
                            }}
                          >
                            <i className="bi bi-cart-plus me-2"></i>
                            Agregar al carrito
                          </button>
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => toggleFavorite(quickViewProduct.id)}
                          >
                            <i className={`bi ${isFavorite(quickViewProduct.id) ? 'bi-heart-fill' : 'bi-heart'} me-1`}></i>
                            {isFavorite(quickViewProduct.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                          </button>
                          <button
                            className="btn btn-outline-info"
                            onClick={() => toggleCompareProduct(quickViewProduct)}
                            disabled={!compareProducts.find(p => p.id === quickViewProduct.id) && compareProducts.length >= 3}
                          >
                            <i className="bi bi-arrow-left-right me-1"></i>
                            {compareProducts.find(p => p.id === quickViewProduct.id) ? 'Quitar de comparación' : 'Agregar a comparación'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Productos relacionados */}
                {relatedProducts.length > 0 && (
                  <div className="mt-4">
                    <h6 className="fw-bold mb-3">
                      <i className="bi bi-tags me-2"></i>
                      Productos relacionados
                    </h6>
                    <div className="row g-2">
                      {relatedProducts.map(product => (
                        <div key={product.id} className="col-6 col-md-3">
                          <div className="card h-100" style={{ fontSize: '0.85rem' }}>
                            <img
                              src={getProductImage(product, 'small')}
                              alt={product.name}
                              className="card-img-top"
                              style={{ height: 80, objectFit: 'cover' }}
                              onError={e => { 
                                e.target.src = getProductImage(product, 'small');
                              }}
                            />
                            <div className="card-body p-2">
                              <h6 className="card-title small text-truncate mb-1" title={product.name}>
                                {product.name}
                              </h6>
                              <p className="text-success small mb-2 fw-bold">
                                {formatCurrency(product.price)}
                              </p>
                              <div className="d-grid gap-1">
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => addToCart(product)}
                                >
                                  <i className="bi bi-cart-plus"></i>
                                </button>
                                <button
                                  className="btn btn-outline-info btn-sm"
                                  onClick={() => {
                                    closeQuickView();
                                    openQuickView(product);
                                  }}
                                >
                                  <i className="bi bi-eye"></i>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de comparación */}
      {showComparison && compareProducts.length > 0 && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-arrow-left-right me-2"></i>
                  Comparar Productos ({compareProducts.length})
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowComparison(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <tbody>
                      {/* Imágenes */}
                      <tr>
                        <td className="fw-bold bg-light">Imagen</td>
                        {compareProducts.map(product => (
                          <td key={product.id} className="text-center">
                            <img
                              src={getProductImage(product, 'medium')}
                              alt={product.name}
                              style={{ width: 100, height: 100, objectFit: 'cover' }}
                              className="rounded"
                              onError={e => { 
                                e.target.src = getProductImage(product, 'medium');
                              }}
                            />
                          </td>
                        ))}
                      </tr>
                      
                      {/* Nombres */}
                      <tr>
                        <td className="fw-bold bg-light">Nombre</td>
                        {compareProducts.map(product => (
                          <td key={product.id} className="fw-bold">
                            {product.name}
                            <button
                              className="btn btn-outline-danger btn-sm ms-2"
                              onClick={() => toggleCompareProduct(product)}
                              title="Quitar de comparación"
                            >
                              <i className="bi bi-x"></i>
                            </button>
                          </td>
                        ))}
                      </tr>
                      
                      {/* Precios */}
                      <tr>
                        <td className="fw-bold bg-light">Precio</td>
                        {compareProducts.map(product => (
                          <td key={product.id} className="text-success fw-bold h5">
                            {formatCurrency(product.price)}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Marcas */}
                      <tr>
                        <td className="fw-bold bg-light">Marca</td>
                        {compareProducts.map(product => (
                          <td key={product.id}>
                            {product.brand?.name || 'Sin marca'}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Categorías */}
                      <tr>
                        <td className="fw-bold bg-light">Categoría</td>
                        {compareProducts.map(product => (
                          <td key={product.id}>
                            {product.category?.name || 'Sin categoría'}
                          </td>
                        ))}
                      </tr>
                      
                      {/* SKU */}
                      <tr>
                        <td className="fw-bold bg-light">SKU</td>
                        {compareProducts.map(product => (
                          <td key={product.id} className="font-monospace">
                            {product.sku}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Acciones */}
                      <tr>
                        <td className="fw-bold bg-light">Acciones</td>
                        {compareProducts.map(product => (
                          <td key={product.id}>
                            <div className="d-grid gap-2">
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => addToCart(product)}
                              >
                                <i className="bi bi-cart-plus me-1"></i>
                                Agregar al carrito
                              </button>
                              <button
                                className="btn btn-outline-info btn-sm"
                                onClick={() => {
                                  setShowComparison(false);
                                  openQuickView(product);
                                }}
                              >
                                <i className="bi bi-eye me-1"></i>
                                Vista rápida
                              </button>
                              <button
                                className={`btn btn-sm ${isFavorite(product.id) ? 'btn-danger' : 'btn-outline-danger'}`}
                                onClick={() => toggleFavorite(product.id)}
                              >
                                <i className={`bi ${isFavorite(product.id) ? 'bi-heart-fill' : 'bi-heart'} me-1`}></i>
                                {isFavorite(product.id) ? 'Favorito' : 'Agregar'}
                              </button>
                            </div>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowComparison(false)}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={() => {
                    setCompareProducts([]);
                    setShowComparison(false);
                  }}
                >
                  <i className="bi bi-trash me-1"></i>
                  Limpiar comparación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de checkout */}
      {showCheckout && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-credit-card me-2"></i>
                  Finalizar compra
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCheckout(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Notas del pedido</label>
                  <textarea
                    className="form-control"
                    value={checkoutNotes}
                    onChange={(e) => setCheckoutNotes(e.target.value)}
                    rows={3}
                    placeholder="Notas adicionales para el pedido..."
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Dirección de entrega</label>
                  <input
                    className="form-control"
                    value={checkoutAddress}
                    onChange={(e) => setCheckoutAddress(e.target.value)}
                    placeholder="Dirección de entrega..."
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Método de pago</label>
                  <select
                    className="form-select"
                    value={checkoutPayment}
                    onChange={(e) => setCheckoutPayment(e.target.value)}
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                  </select>
                </div>
                <div className="border-top pt-3">
                  <div className="fw-bold h5 text-center">
                    Total a pagar: <span className="text-success">{formatCurrency(totalWithDiscount)}</span>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCheckout(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => setShowConfirm(true)}
                >
                  Confirmar pedido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación */}
      {showConfirm && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-check-circle me-2"></i>
                  Confirmar pedido
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowConfirm(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-8">
                    <h6 className="fw-bold mb-3">Resumen del pedido</h6>
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead className="table-light">
                          <tr>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Precio Unit.</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cart.map(item => (
                            <tr key={item.id}>
                              <td>{item.name}</td>
                              <td>{item.quantity}</td>
                              <td>{formatCurrency(item.price)}</td>
                              <td>{formatCurrency(item.price * item.quantity)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card bg-light">
                      <div className="card-body">
                        <h6 className="card-title">Detalles del cliente</h6>
                        <p className="card-text small mb-2">
                          <strong>Cliente:</strong><br />
                          {customerSearch}
                        </p>
                        {customerDiscount > 0 && (
                          <p className="card-text small mb-2 text-success">
                            <strong>Descuento:</strong> {customerDiscount}%
                          </p>
                        )}
                        {checkoutAddress && (
                          <p className="card-text small mb-2">
                            <strong>Dirección:</strong><br />
                            {checkoutAddress}
                          </p>
                        )}
                        <p className="card-text small mb-2">
                          <strong>Pago:</strong> {checkoutPayment}
                        </p>
                        {checkoutNotes && (
                          <p className="card-text small">
                            <strong>Notas:</strong><br />
                            {checkoutNotes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="row mt-3">
                  <div className="col-12">
                    <div className="border-top pt-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="h5 mb-0">Total del pedido:</span>
                        <span className="h4 text-success fw-bold">{formatCurrency(totalWithDiscount)}</span>
                      </div>
                      <small className="text-muted">
                        {cart.length} producto{cart.length !== 1 ? 's' : ''} • 
                        Subtotal: {formatCurrency(cartTotal)}
                        {discountAmount > 0 && ` • Descuento: -${formatCurrency(discountAmount)}`}
                      </small>
                    </div>
                  </div>
                </div>
                
                {orderError && (
                  <div className="alert alert-danger mt-3">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {orderError}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowConfirm(false)}
                  disabled={loadingOrder}
                >
                  <i className="bi bi-x-lg me-1"></i>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleCreateOrder}
                  disabled={loadingOrder}
                >
                  {loadingOrder ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Creando pedido...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check me-1"></i>
                      Confirmar y Crear Pedido
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernShop;
