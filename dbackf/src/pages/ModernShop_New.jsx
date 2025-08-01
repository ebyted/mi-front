import React, { useEffect, useState } from 'react';
import api from '../services/api';

const ModernShop = ({ user }) => {
  // Estados principales
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados de filtros (simplificados)
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' o 'list'

  // Estados de paginación
  const [page, setPage] = useState(1);
  const pageSize = 12; // Aumentado para mejor experiencia

  // Estados del carrito
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerDiscount, setCustomerDiscount] = useState(0);

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
        const [productsRes, brandsRes, categoriesRes, customersRes] = await Promise.all([
          api.get('products/'),
          api.get('brands/'),
          api.get('categories/'),
          api.get('customers/?is_active=true')
        ]);
        
        setProducts(productsRes.data || []);
        setBrands(brandsRes.data || []);
        setCategories(categoriesRes.data || []);
        setCustomers(customersRes.data || []);
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

  // Filtrar productos (mejorado)
  const filteredProducts = products.filter(p => {
    const matchesSearch = !search || 
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchesBrand = !selectedBrand || p.brand?.id === selectedBrand;
    const matchesCategory = !selectedCategory || p.category?.id === selectedCategory;
    return matchesSearch && matchesBrand && matchesCategory && p.is_active;
  });

  // Paginación
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Funciones del carrito (mejoradas)
  const addToCart = (product) => {
    // Simular stock disponible (en producción vendría del backend)
    const availableStock = product.minimum_stock || 10; // Fallback
    
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= availableStock) {
        setOrderError(`No hay suficiente stock. Disponible: ${availableStock}`);
        setTimeout(() => setOrderError(''), 3000);
        return;
      }
      updateCartQuantity(product.id, existingItem.quantity + 1);
    } else {
      const newItem = {
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: Number(product.price) || 0,
        quantity: 1,
        brand: product.brand?.name,
        category: product.category?.name,
        image: product.image,
        availableStock
      };
      setCart(prev => [...prev, newItem]);
      setOrderSuccess(`${product.name} agregado al carrito`);
      setTimeout(() => setOrderSuccess(''), 3000);
    }
  };

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        if (newQuantity > item.availableStock) {
          setOrderError(`Cantidad máxima disponible: ${item.availableStock}`);
          setTimeout(() => setOrderError(''), 3000);
          return item;
        }
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

  // Cálculos del carrito
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = selectedCustomer ? cartTotal * (customerDiscount / 100) : 0;
  const totalWithDiscount = cartTotal - discountAmount;

  // Funciones de utilidad
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0);
  };

  const getStockBadge = (stock) => {
    if (!stock || stock === 0) return { color: 'danger', text: 'Sin stock', icon: '❌' };
    if (stock <= 5) return { color: 'warning', text: `Quedan ${stock}`, icon: '⚠️' };
    if (stock <= 10) return { color: 'info', text: `Stock: ${stock}`, icon: '📦' };
    return { color: 'success', text: 'Disponible', icon: '✅' };
  };

  // Manejo del cliente
  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer.code);
    setCustomerSearch(`${customer.name} (${customer.code})`);
    setCustomerDiscount(customer.customer_type?.discount_percentage || 0);
  };

  // Crear orden
  const handleCreateOrder = async () => {
    if (!selectedCustomer || cart.length === 0) return;
    
    setLoadingOrder(true);
    try {
      const orderData = {
        customer: selectedCustomer,
        items: cart.map(item => ({
          product: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        notes: checkoutNotes,
        delivery_address: checkoutAddress,
        payment_method: checkoutPayment,
        total_amount: totalWithDiscount
      };

      await api.post('sales-orders/', orderData);
      
      setOrderSuccess('¡Orden creada exitosamente!');
      clearCart();
      setShowCheckout(false);
      setShowConfirm(false);
      setCheckoutNotes('');
      setCheckoutAddress('');
      setTimeout(() => setOrderSuccess(''), 5000);
    } catch (error) {
      console.error('Error creating order:', error);
      setOrderError('Error al crear la orden. Intenta nuevamente.');
      setTimeout(() => setOrderError(''), 5000);
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

  return (
    <div className="container py-4 animate__animated animate__fadeIn" style={{ maxWidth: 1200 }}>
      <style jsx>{`
        .product-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
        }
        .product-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
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
        }
      `}</style>

      <h2 className="text-primary fw-bold mb-4 d-flex align-items-center justify-content-between">
        <span>
          <i className="bi bi-shop me-2"></i>
          Sancho Distribuciones
        </span>
        <span className="badge bg-info fs-6">{filteredProducts.length} productos</span>
      </h2>

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
        <div className="row">
          {/* Columna principal de productos */}
          <div className="col-lg-8">
            {/* Barra de filtros simplificada */}
            <div className="card mb-4 shadow-sm">
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="bi bi-search"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Buscar productos..."
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setPage(1);
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
                  <div className="col-md-3">
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
                  <div className="col-md-3">
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
                  <div className="col-auto ms-auto">
                    {(search || selectedBrand || selectedCategory) && (
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => {
                          setSearch('');
                          setSelectedBrand('');
                          setSelectedCategory('');
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
                    let imgSrc = '/img/producto-fallback.svg';
                    
                    if (typeof product.image === 'string' && product.image.length > 0) {
                      if (product.image.includes('via.placeholder.com') && !/^https?:\/\//.test(product.image)) {
                        imgSrc = '/img/producto-fallback.svg';
                      } else if (isValidUrl(product.image)) {
                        imgSrc = product.image;
                      }
                    }

                    if (viewMode === 'grid') {
                      return (
                        <div key={product.id} className="col-md-6 col-lg-4">
                          <div className="card h-100 product-card position-relative" style={{ borderRadius: 12 }}>
                            <div className={`badge bg-${stockInfo.color} stock-badge`}>
                              {stockInfo.icon} {stockInfo.text}
                            </div>
                            <img
                              src={imgSrc}
                              alt={product.name}
                              className="card-img-top"
                              style={{ borderRadius: '12px 12px 0 0', objectFit: 'cover', height: 200 }}
                              onError={e => { e.target.src = '/img/producto-fallback.svg'; }}
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
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                  <span className="h5 text-success mb-0">{formatCurrency(product.price)}</span>
                                  <small className="text-muted">Stock: {product.minimum_stock || 0}</small>
                                </div>
                                <button
                                  className="btn btn-primary w-100"
                                  onClick={() => addToCart(product)}
                                  disabled={!product.minimum_stock || product.minimum_stock === 0}
                                >
                                  <i className="bi bi-cart-plus me-1"></i>
                                  {!product.minimum_stock || product.minimum_stock === 0 ? 'Sin stock' : 'Agregar'}
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
                                <div className={`badge bg-${stockInfo.color} stock-badge`}>
                                  {stockInfo.icon} {stockInfo.text}
                                </div>
                                <img
                                  src={imgSrc}
                                  alt={product.name}
                                  className="img-fluid rounded-start"
                                  style={{ objectFit: 'cover', height: 150, width: '100%' }}
                                  onError={e => { e.target.src = '/img/producto-fallback.svg'; }}
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
                                    <span className="h4 text-success">{formatCurrency(product.price)}</span>
                                    <br />
                                    <small className="text-muted">Stock disponible: {product.minimum_stock || 0}</small>
                                  </div>
                                  <button
                                    className="btn btn-primary"
                                    onClick={() => addToCart(product)}
                                    disabled={!product.minimum_stock || product.minimum_stock === 0}
                                  >
                                    <i className="bi bi-cart-plus me-1"></i>
                                    {!product.minimum_stock || product.minimum_stock === 0 ? 'Sin stock' : 'Agregar al carrito'}
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

                {/* Paginación */}
                {totalPages > 1 && (
                  <nav className="mt-4">
                    <ul className="pagination justify-content-center">
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => setPage(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          Anterior
                        </button>
                      </li>
                      
                      {[...Array(totalPages)].map((_, i) => (
                        <li key={i + 1} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => setPage(i + 1)}
                          >
                            {i + 1}
                          </button>
                        </li>
                      ))}
                      
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
                )}
              </>
            )}
          </div>

          {/* Sidebar del carrito */}
          <div className="col-lg-4">
            <div className="card cart-sidebar shadow">
              <div className="card-header bg-primary text-white">
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
                      placeholder="Buscar cliente por nombre..."
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setSelectedCustomer('');
                      }}
                    />
                    
                    {customerSearch && (
                      <div className="card customer-search-dropdown">
                        <div className="card-body p-0" style={{ maxHeight: 200, overflowY: 'auto' }}>
                          {customers
                            .filter(c =>
                              c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                              c.code.toLowerCase().includes(customerSearch.toLowerCase())
                            )
                            .slice(0, 5)
                            .map(customer => (
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
                              src={item.image && isValidUrl(item.image) ? item.image : '/img/producto-fallback-small.svg'}
                              alt={item.name}
                              className="rounded"
                              style={{ width: 40, height: 40, objectFit: 'cover' }}
                              onError={e => { e.target.src = '/img/producto-fallback-small.svg'; }}
                            />
                          </div>
                          <div className="flex-grow-1 me-2">
                            <div className="fw-bold small text-truncate">{item.name}</div>
                            <div className="text-muted small">{formatCurrency(item.price)}</div>
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

                    {/* Resumen de totales */}
                    <div className="border-top pt-3">
                      <div className="d-flex justify-content-between mb-2">
                        <span>Subtotal:</span>
                        <span className="fw-bold">{formatCurrency(cartTotal)}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="d-flex justify-content-between mb-2 text-success">
                          <span>Descuento ({customerDiscount}%):</span>
                          <span className="fw-bold">-{formatCurrency(discountAmount)}</span>
                        </div>
                      )}
                      <div className="d-flex justify-content-between border-top pt-2">
                        <span className="fw-bold">Total:</span>
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
                        onClick={() => setShowCheckout(true)}
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
                    </div>
                  </>
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
          <div className="modal-dialog">
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
              <div className="modal-body text-center">
                <p>¿Estás seguro que deseas crear este pedido?</p>
                <div className="fw-bold h4 text-success">
                  Total: {formatCurrency(totalWithDiscount)}
                </div>
                <small className="text-muted">
                  {cart.length} producto{cart.length !== 1 ? 's' : ''} • 
                  Cliente: {customerSearch}
                </small>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowConfirm(false)}
                >
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
                      Crear pedido
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
