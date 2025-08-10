import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectCoverflow } from 'swiper/modules';

// Importar estilos de Swiper
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-coverflow';

const EnhancedTijuanaStore = ({ user }) => {
  // Estados principales
  const [products, setProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tijuanaWarehouse, setTijuanaWarehouse] = useState(null);

  // Estados de filtros
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState('name');

  // Estados de vista
  const [viewMode, setViewMode] = useState('grid');
  const [page, setPage] = useState(1);
  const pageSize = 12;

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
    address: ''
  });
  const [orderNotes, setOrderNotes] = useState('');

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData();
    loadFromLocalStorage();
  }, []);

  // Guardar en localStorage cuando cambien cart y wishlist
  useEffect(() => {
    localStorage.setItem('tijuana_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('tijuana_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

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

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Cargar almacenes y encontrar TIJUANA
      const warehousesRes = await api.get('warehouses/');
      const warehouses = warehousesRes.data || [];
      const tijuana = warehouses.find(w => 
        w.name.toLowerCase().includes('tijuana') || 
        w.code?.toLowerCase().includes('tij') ||
        w.address?.toLowerCase().includes('tijuana')
      );

      if (!tijuana) {
        throw new Error('No se encontró el almacén de TIJUANA');
      }

      setTijuanaWarehouse(tijuana);

      // Cargar datos en paralelo
      const [stockRes, brandsRes, categoriesRes] = await Promise.all([
        api.get(`product-warehouse-stocks/?warehouse=${tijuana.id}`),
        api.get('brands/'),
        api.get('categories/')
      ]);

      // Filtrar productos con stock > 0 en TIJUANA
      const stockData = Array.isArray(stockRes.data) ? stockRes.data : (stockRes.data.results || []);
      const productsWithStock = stockData
        .filter(stock => parseFloat(stock.quantity || 0) > 0)
        .map(stock => ({
          id: stock.product_variant?.id || stock.product_id,
          name: stock.product_name || stock.product_variant?.name || 'Sin nombre',
          sku: stock.product_code || stock.product_variant?.sku || 'N/A',
          price: parseFloat(stock.product_price || stock.product_variant?.sale_price || 0),
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
          is_featured: Math.random() > 0.7, // 30% probabilidad de ser destacado
          rating: Math.floor(Math.random() * 5) + 1, // Rating simulado
          discount: Math.random() > 0.8 ? Math.floor(Math.random() * 30) + 5 : 0 // 20% tiene descuento
        }));

      setProducts(productsWithStock);
      setFeaturedProducts(productsWithStock.filter(p => p.is_featured).slice(0, 8));
      setBrands(brandsRes.data || []);
      setCategories(categoriesRes.data || []);

    } catch (error) {
      console.error('Error loading data:', error);
      setError(error.message || 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // Funciones del carrito
  const addToCart = (product, quantity = 1) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      updateCartQuantity(product.id, existingItem.quantity + quantity);
    } else {
      setCart(prev => [...prev, { ...product, quantity }]);
      showNotification(`${product.name} agregado al carrito`, 'success');
    }
  };

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(prev => prev.map(item => 
      item.id === productId ? { ...item, quantity: Math.min(newQuantity, item.stock) } : item
    ));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
    showNotification('Producto eliminado del carrito', 'info');
  };

  // Funciones de wishlist
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

  // Funciones de comparación
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

  // Utilidades
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

  // Filtrar productos
  const getFilteredProducts = () => {
    return products.filter(product => {
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
      if (selectedBrand && product.brand.id !== selectedBrand) return false;

      // Filtro de categoría
      if (selectedCategory && product.category.id !== selectedCategory) return false;

      // Filtro de precio
      const finalPrice = product.discount > 0 ? getDiscountedPrice(product.price, product.discount) : product.price;
      if (priceRange.min && finalPrice < parseFloat(priceRange.min)) return false;
      if (priceRange.max && finalPrice > parseFloat(priceRange.max)) return false;

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
  };

  // Paginación
  const filteredProducts = getFilteredProducts();
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const paginatedProducts = filteredProducts.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const getCartTotal = () => {
    return cart.reduce((sum, item) => {
      const price = item.discount > 0 ? getDiscountedPrice(item.price, item.discount) : item.price;
      return sum + (price * item.quantity);
    }, 0);
  };

  // Funciones de checkout y venta
  const createOrGetDefaultCustomer = async () => {
    try {
      // Primero intentar buscar si existe un cliente por defecto
      const customersResponse = await api.get('/customers/');
      let defaultCustomer = customersResponse.data.find(c => c.email === 'cliente@tienda.com');
      
      if (!defaultCustomer) {
        // Si no existe, crear un cliente por defecto
        const customerTypesResponse = await api.get('/customer-types/');
        let defaultCustomerType = customerTypesResponse.data[0];
        
        if (!defaultCustomerType) {
          // Crear un tipo de cliente por defecto si no existe
          defaultCustomerType = await api.post('/customer-types/', {
            name: 'Cliente General',
            discount_percentage: 0,
            description: 'Tipo de cliente general para la tienda'
          });
          defaultCustomerType = defaultCustomerType.data;
        }

        // Crear el cliente por defecto
        const customerData = {
          name: 'Cliente de Tienda',
          code: 'TIENDA001',
          email: 'cliente@tienda.com',
          phone: '',
          address: '',
          customer_type: defaultCustomerType.id
        };
        
        const customerResponse = await api.post('/customers/', customerData);
        defaultCustomer = customerResponse.data;
      }
      
      return defaultCustomer;
    } catch (error) {
      console.error('Error creating/getting default customer:', error);
      throw new Error('No se pudo crear el cliente para la venta');
    }
  };

  const processSale = async () => {
    if (cart.length === 0) {
      showNotification('El carrito está vacío', 'error');
      return;
    }

    setCheckoutLoading(true);
    try {
      // Crear o obtener cliente por defecto
      const customer = await createOrGetDefaultCustomer();
      
      // Preparar los items para la venta
      const items = cart.map(item => ({
        product: item.id,
        quantity: item.quantity,
        price: item.discount > 0 ? getDiscountedPrice(item.price, item.discount) : item.price
      }));

      // Crear la orden de venta
      const salesOrderData = {
        customer: customer.id,
        total_amount: getCartTotal(),
        status: 'completed',
        notes: orderNotes || `Venta desde Tienda TIJUANA - Cliente: ${customerData.name || 'Cliente Web'}`,
        items: items
      };

      const response = await api.post('/sales-orders/', salesOrderData);
      
      // Limpiar carrito y mostrar éxito
      setCart([]);
      localStorage.removeItem('tijuana_cart');
      setShowCheckout(false);
      setShowCart(false);
      
      showNotification(`¡Venta procesada exitosamente! Orden #${response.data.id}`, 'success');
      
      // Limpiar datos del formulario
      setCustomerData({ name: '', email: '', phone: '', address: '' });
      setOrderNotes('');
      
    } catch (error) {
      console.error('Error processing sale:', error);
      let errorMessage = 'Error al procesar la venta';
      
      if (error.response?.data) {
        errorMessage = error.response.data.detail || error.response.data.message || errorMessage;
      }
      
      showNotification(errorMessage, 'error');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCustomerDataChange = (field, value) => {
    setCustomerData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Cargando...</span>
          </div>
          <h4 className="text-primary">Cargando Tienda TIJUANA...</h4>
          <p className="text-muted">Obteniendo productos disponibles</p>
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
                🏪 Tienda TIJUANA Premium
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
                  {products.length} productos disponibles
                </div>
                <div className="badge bg-warning p-3">
                  <i className="bi bi-percent me-2"></i>
                  {products.filter(p => p.discount > 0).length} ofertas activas
                </div>
                <div className="badge bg-info p-3">
                  <i className="bi bi-truck me-2"></i>
                  Envío gratuito
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
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
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
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
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
            <div className="col-md-3">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('');
                  setSelectedBrand('');
                  setPriceRange({ min: '', max: '' });
                  setPage(1);
                }}
              >
                <i className="bi bi-eraser me-2"></i>
                Limpiar filtros
              </button>
            </div>
            <div className="col-md-3">
              <div className="text-muted text-center pt-2">
                {filteredProducts.length} de {products.length} productos
              </div>
            </div>
          </div>
        </div>

        {/* Lista de productos */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-5">
            <div className="mb-4" style={{ fontSize: '5rem', opacity: 0.3 }}>
              <i className="bi bi-search"></i>
            </div>
            <h4 className="text-secondary">No se encontraron productos</h4>
            <p className="text-muted">Intenta ajustar los filtros de búsqueda</p>
          </div>
        ) : (
          <>
            <div className={viewMode === 'grid' ? 'row g-4' : ''}>
              {paginatedProducts.map(product => {
                const stockColor = product.stock > 10 ? 'success' : product.stock > 5 ? 'warning' : 'danger';
                const finalPrice = product.discount > 0 ? getDiscountedPrice(product.price, product.discount) : product.price;
                
                if (viewMode === 'grid') {
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
                            Stock: {product.stock}
                          </span>
                          <img
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
                              className="btn btn-primary w-100"
                              onClick={() => addToCart(product)}
                            >
                              <i className="bi bi-cart-plus me-2"></i>
                              Agregar al carrito
                            </button>
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
                            {product.discount > 0 && (
                              <div className="discount-badge">
                                -{product.discount}%
                              </div>
                            )}
                            <span className={`badge bg-${stockColor} stock-badge`}>
                              Stock: {product.stock}
                            </span>
                            <img
                              src={isValidUrl(product.image) ? product.image : '/img/producto-fallback.svg'}
                              alt={product.name}
                              className="img-fluid rounded-start h-100"
                              style={{ objectFit: 'cover', minHeight: '200px' }}
                              onError={e => { e.target.src = '/img/producto-fallback.svg'; }}
                            />
                          </div>
                        </div>
                        <div className="col-md-9">
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
                                  className="btn btn-primary btn-lg"
                                  onClick={() => addToCart(product)}
                                >
                                  <i className="bi bi-cart-plus me-2"></i>
                                  Agregar al carrito
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <nav className="mt-4">
                <ul className="pagination justify-content-center">
                  <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Anterior
                    </button>
                  </li>
                  
                  {[...Array(totalPages)].map((_, i) => (
                    <li key={i + 1} className={`page-item ${page === i + 1 ? 'active' : ''}`}>
                      <button
                        className={`page-link ${page === i + 1 ? 'bg-primary border-primary' : 'text-primary'}`}
                        onClick={() => setPage(i + 1)}
                      >
                        {i + 1}
                      </button>
                    </li>
                  ))}
                  
                  <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                    >
                      Siguiente
                    </button>
                  </li>
                </ul>
              </nav>
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
                            disabled={item.quantity >= item.stock}
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
                <div className="d-flex justify-content-between mb-3">
                  <strong>Total:</strong>
                  <strong className="text-success h5">{formatCurrency(getCartTotal())}</strong>
                </div>
                
                <div className="d-grid gap-2">
                  <button 
                    className="btn btn-success btn-lg"
                    onClick={() => setShowCheckout(true)}
                    disabled={cart.length === 0}
                  >
                    <i className="bi bi-credit-card me-2"></i>
                    Proceder al checkout
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
                    className="btn btn-primary btn-lg"
                    onClick={() => {
                      addToCart(quickViewProduct);
                      setShowQuickView(false);
                      setQuickViewProduct(null);
                    }}
                  >
                    <i className="bi bi-cart-plus me-2"></i>
                    Agregar al carrito
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
            className="modal fade show d-block" 
            style={{ 
              backgroundColor: 'rgba(0,0,0,0.5)', 
              zIndex: 9999,
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%'
            }}
          >
            <div className="modal-dialog modal-lg" style={{ marginTop: '2rem' }}>
              <div className="modal-content">
                <div className="modal-header bg-success text-white">
                  <h5 className="modal-title">
                    <i className="bi bi-credit-card me-2"></i>
                    Finalizar Compra
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowCheckout(false)}
                  ></button>
                </div>
                
                <div className="modal-body">
                  {/* Resumen del pedido */}
                  <div className="row">
                    <div className="col-md-8">
                      <h6 className="border-bottom pb-2 mb-3">Información del Cliente (Opcional)</h6>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label">Nombre</label>
                          <input
                            type="text"
                            className="form-control"
                            value={customerData.name}
                            onChange={(e) => handleCustomerDataChange('name', e.target.value)}
                            placeholder="Nombre del cliente"
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Email</label>
                          <input
                            type="email"
                            className="form-control"
                            value={customerData.email}
                            onChange={(e) => handleCustomerDataChange('email', e.target.value)}
                            placeholder="cliente@email.com"
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Teléfono</label>
                          <input
                            type="tel"
                            className="form-control"
                            value={customerData.phone}
                            onChange={(e) => handleCustomerDataChange('phone', e.target.value)}
                            placeholder="Teléfono"
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Dirección</label>
                          <input
                            type="text"
                            className="form-control"
                            value={customerData.address}
                            onChange={(e) => handleCustomerDataChange('address', e.target.value)}
                            placeholder="Dirección"
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label">Notas del pedido</label>
                          <textarea
                            className="form-control"
                            rows="3"
                            value={orderNotes}
                            onChange={(e) => setOrderNotes(e.target.value)}
                            placeholder="Instrucciones especiales o comentarios..."
                          ></textarea>
                        </div>
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
                    onClick={processSale}
                    disabled={checkoutLoading}
                  >
                    {checkoutLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i>
                        Confirmar Venta ({formatCurrency(getCartTotal())})
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
