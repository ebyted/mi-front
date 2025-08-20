import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api';

const ProductInvestigation = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productDetails, setProductDetails] = useState(null);
  const [movements, setMovements] = useState([]);
  const [kardex, setKardex] = useState([]);
  const [investigationLoading, setInvestigationLoading] = useState(false);
  
  // Estados para búsqueda de productos
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchInputRef = useRef(null);
  const searchDropdownRef = useRef(null);

  // Función para normalizar texto (quitar acentos y caracteres especiales)
  const normalizeText = (text) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^\w\s]/g, ' ') // Reemplazar caracteres especiales con espacios
      .replace(/\s+/g, ' ') // Normalizar espacios múltiples
      .trim();
  };

  // Función de búsqueda de productos
  const searchProducts = async (term) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearchLoading(true);
    console.log('🔍 Investigación - Buscando productos:', term);

    try {
      // Usar el mismo endpoint que Products.jsx
      const response = await api.get('/products/');
      
      // Filtrar localmente con la misma lógica que Products.jsx
      const allProducts = response.data || [];
      console.log('📦 Investigación - Total productos cargados:', allProducts.length);
      
      // Normalizar texto de búsqueda
      const normalizedSearch = normalizeText(term);
      
      // Filtrar productos usando múltiples estrategias
      const filtered = allProducts.filter(product => {
        const name = normalizeText(product.name || '');
        const sku = normalizeText(product.sku || '');
        const description = normalizeText(product.description || '');
        const barcode = normalizeText(product.barcode || '');
        
        // Búsqueda por coincidencia parcial
        const matchesName = name.includes(normalizedSearch);
        const matchesSku = sku.includes(normalizedSearch);
        const matchesDescription = description.includes(normalizedSearch);
        const matchesBarcode = barcode.includes(normalizedSearch);
        
        // Búsqueda por palabras individuales
        const searchWords = normalizedSearch.split(' ').filter(word => word.length > 0);
        const matchesWords = searchWords.some(word => 
          name.includes(word) || sku.includes(word) || description.includes(word) || barcode.includes(word)
        );
        
        const matches = matchesName || matchesSku || matchesDescription || matchesBarcode || matchesWords;
        
        if (matches) {
          console.log(`✅ Producto encontrado: ${product.name} (ID: ${product.id})`);
        }
        
        return matches;
      });

      console.log('📦 Investigación - Productos filtrados:', filtered.length);
      
      // Limitar resultados para la UI pero mostrar más que antes
      const limitedResults = filtered.slice(0, 50);
      setSearchResults(limitedResults);
      setShowSearchResults(true);
      
    } catch (error) {
      console.error('❌ Error buscando productos:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounce para la búsqueda
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm) {
        searchProducts(searchTerm);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target) &&
        !searchInputRef.current.contains(event.target)
      ) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Función para seleccionar producto y cargar investigación
  const selectProduct = async (product) => {
    console.log('🎯 Producto seleccionado para investigación:', product);
    setSelectedProduct(product);
    setSearchTerm(product.name);
    setShowSearchResults(false);
    
    // Cargar investigación completa del producto
    await loadProductInvestigation(product);
  };

  // Función principal para cargar toda la investigación del producto
  const loadProductInvestigation = async (product) => {
    setInvestigationLoading(true);
    console.log('🔬 Iniciando investigación completa del producto:', product.id);

    try {
      // 1. Obtener detalles del producto usando el endpoint correcto
      const productResponse = await api.get(`/products/${product.id}/`);
      setProductDetails(productResponse.data);
      console.log('📋 Detalles del producto:', productResponse.data);

      // 2. Obtener movimientos de inventario relacionados con este producto
      // Intentar diferentes enfoques para obtener movimientos
      let movements = [];
      
      try {
        // Opción 1: Buscar por product_id
        const movementsResponse = await api.get('/inventory-movements/', {
          params: {
            product: product.id,
            page_size: 100,
            ordering: '-created_at'
          }
        });
        movements = movementsResponse.data?.results || movementsResponse.data || [];
        console.log('📦 Movimientos encontrados (por product):', movements.length);
      } catch (error1) {
        console.log('⚠️ Error con product_id, intentando con variant_id...');
        
        try {
          // Opción 2: Buscar por variant_id
          const movementsResponse = await api.get('/inventory-movements/', {
            params: {
              variant: product.id,
              page_size: 100,
              ordering: '-created_at'
            }
          });
          movements = movementsResponse.data?.results || movementsResponse.data || [];
          console.log('📦 Movimientos encontrados (por variant):', movements.length);
        } catch (error2) {
          console.log('⚠️ Error con variant_id, obteniendo todos los movimientos y filtrando...');
          
          // Opción 3: Obtener todos y filtrar localmente
          const allMovementsResponse = await api.get('/inventory-movements/');
          const allMovements = allMovementsResponse.data?.results || allMovementsResponse.data || [];
          movements = allMovements.filter(movement => 
            movement.product === product.id || 
            movement.product_id === product.id ||
            movement.variant === product.id ||
            movement.variant_id === product.id
          );
          console.log('📦 Movimientos encontrados (filtrados):', movements.length);
        }
      }
      
      setMovements(movements);

      // 3. Obtener kardex del producto - intentar diferentes enfoques
      let kardexData = [];
      
      try {
        // Opción 1: Endpoint específico de kardex
        const kardexResponse = await api.get(`/products/${product.id}/kardex/`);
        kardexData = kardexResponse.data || [];
        console.log('📊 Kardex obtenido (endpoint específico):', kardexData.length);
      } catch (error1) {
        console.log('⚠️ Endpoint específico de kardex no disponible, generando desde movimientos...');
        
        // Opción 2: Generar kardex desde movimientos
        if (movements.length > 0) {
          let balance = 0;
          kardexData = movements
            .sort((a, b) => new Date(a.created_at || a.date) - new Date(b.created_at || b.date))
            .map(movement => {
              const quantity = movement.quantity || 0;
              const isInbound = movement.movement_type === 'IN' || 
                              movement.movement_type === 'PURCHASE' ||
                              movement.movement_type === 'ADJUSTMENT' && quantity > 0;
              
              if (isInbound) {
                balance += Math.abs(quantity);
              } else {
                balance -= Math.abs(quantity);
              }
              
              return {
                date: movement.created_at || movement.date,
                description: movement.movement_type || 'Movimiento',
                quantity_in: isInbound ? Math.abs(quantity) : null,
                quantity_out: !isInbound ? Math.abs(quantity) : null,
                balance: balance,
                unit_cost: movement.unit_cost || 0,
                total_value: balance * (movement.unit_cost || 0),
                reference: movement.reference || movement.id
              };
            });
          console.log('📊 Kardex generado desde movimientos:', kardexData.length);
        }
      }
      
      setKardex(kardexData);

    } catch (error) {
      console.error('❌ Error en investigación del producto:', error);
    } finally {
      setInvestigationLoading(false);
    }
  };

  // Función para formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Función para formatear moneda
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '$0.00';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  // Función para obtener el tipo de movimiento con color
  const getMovementTypeInfo = (type) => {
    const types = {
      'IN': { label: 'Entrada', class: 'success', icon: 'bi-arrow-down-circle' },
      'OUT': { label: 'Salida', class: 'danger', icon: 'bi-arrow-up-circle' },
      'ADJUSTMENT': { label: 'Ajuste', class: 'warning', icon: 'bi-gear-fill' },
      'TRANSFER': { label: 'Transferencia', class: 'info', icon: 'bi-arrow-left-right' },
      'SALE': { label: 'Venta', class: 'primary', icon: 'bi-cart-check' },
      'PURCHASE': { label: 'Compra', class: 'success', icon: 'bi-bag-plus' }
    };
    return types[type] || { label: type, class: 'secondary', icon: 'bi-question-circle' };
  };

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <div className="card shadow">
            <div className="card-header bg-primary text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0">
                  <i className="bi bi-search me-2"></i>
                  Investigación de Producto
                </h4>
                <small>Usuario: {user?.username}</small>
              </div>
            </div>
            
            <div className="card-body">
              {/* Sección de búsqueda */}
              <div className="row mb-4">
                <div className="col-lg-8">
                  <div className="position-relative">
                    <label className="form-label">
                      <i className="bi bi-search me-1"></i>
                      Buscar Producto
                    </label>
                    <div className="input-group">
                      <input
                        ref={searchInputRef}
                        type="text"
                        className="form-control form-control-lg"
                        placeholder="Ingrese nombre, código o descripción del producto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => searchTerm && setShowSearchResults(true)}
                      />
                      {(searchTerm || selectedProduct) && (
                        <button 
                          className="btn btn-outline-secondary"
                          onClick={() => {
                            setSearchTerm('');
                            setSelectedProduct(null);
                            setProductDetails(null);
                            setMovements([]);
                            setKardex([]);
                            setSearchResults([]);
                            setShowSearchResults(false);
                          }}
                          title="Limpiar búsqueda y reiniciar"
                        >
                          <i className="bi bi-x-circle"></i>
                        </button>
                      )}
                    </div>
                    
                    {/* Dropdown de resultados */}
                    {showSearchResults && (
                      <div
                        ref={searchDropdownRef}
                        className="position-absolute w-100 bg-white border rounded shadow-lg mt-1"
                        style={{ zIndex: 1050, maxHeight: '400px', overflowY: 'auto' }}
                      >
                        {searchLoading ? (
                          <div className="p-3 text-center">
                            <div className="spinner-border spinner-border-sm me-2"></div>
                            Buscando...
                          </div>
                        ) : searchResults.length > 0 ? (
                          <>
                            <div className="p-2 bg-light border-bottom">
                              <small className="text-muted">
                                <i className="bi bi-info-circle me-1"></i>
                                {searchResults.length} producto{searchResults.length !== 1 ? 's' : ''} encontrado{searchResults.length !== 1 ? 's' : ''}
                                {searchResults.length === 50 ? ' (máximo 50 mostrados)' : ''}
                              </small>
                            </div>
                            {searchResults.map((product) => (
                              <div
                                key={product.id}
                                className="p-3 border-bottom cursor-pointer hover-bg-light"
                                onClick={() => selectProduct(product)}
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={(e) => e.target.classList.add('bg-light')}
                                onMouseLeave={(e) => e.target.classList.remove('bg-light')}
                              >
                                <div className="d-flex justify-content-between align-items-start">
                                  <div className="flex-grow-1">
                                    <h6 className="mb-1 text-primary">{product.name}</h6>
                                    <div className="row g-1 mb-1">
                                      <div className="col-6">
                                        <small className="text-muted">
                                          <strong>SKU:</strong> {product.sku || 'N/A'}
                                        </small>
                                      </div>
                                      <div className="col-6">
                                        <small className="text-muted">
                                          <strong>ID:</strong> {product.id}
                                        </small>
                                      </div>
                                    </div>
                                    {product.barcode && (
                                      <div className="mb-1">
                                        <small className="text-muted">
                                          <strong>Código:</strong> {product.barcode}
                                        </small>
                                      </div>
                                    )}
                                    <div className="row g-1 mb-1">
                                      <div className="col-6">
                                        <small className="text-muted">
                                          <strong>Marca:</strong> {
                                            typeof product.brand === 'object' && product.brand 
                                              ? product.brand.name || product.brand.description 
                                              : product.brand || 'N/A'
                                          }
                                        </small>
                                      </div>
                                      <div className="col-6">
                                        <small className="text-muted">
                                          <strong>Categoría:</strong> {
                                            typeof product.category === 'object' && product.category 
                                              ? product.category.name || product.category.description 
                                              : product.category || 'N/A'
                                          }
                                        </small>
                                      </div>
                                    </div>
                                    {product.description && (
                                      <div className="small text-secondary mt-1">
                                        {product.description.length > 150 
                                          ? `${product.description.substring(0, 150)}...`
                                          : product.description
                                        }
                                      </div>
                                    )}
                                    <div className="mt-2">
                                      <span className={`badge ${product.is_active ? 'bg-success' : 'bg-secondary'} me-1`}>
                                        {product.is_active ? 'Activo' : 'Inactivo'}
                                      </span>
                                      {product.status && product.status !== 'REGULAR' && (
                                        <span className={`badge ${
                                          product.status === 'NUEVO' ? 'bg-primary' :
                                          product.status === 'OFERTA' ? 'bg-warning text-dark' :
                                          product.status === 'REMATE' ? 'bg-danger' :
                                          'bg-secondary'
                                        } me-1`}>
                                          {product.status}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <i className="bi bi-arrow-right text-primary fs-4"></i>
                                    <div className="small text-muted mt-1">Investigar</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </>
                        ) : searchTerm ? (
                          <div className="p-4 text-center text-muted">
                            <i className="bi bi-search display-6 d-block mb-2"></i>
                            <strong>No se encontraron productos</strong>
                            <div className="mt-2">
                              <small>
                                Búsqueda: "<strong>{searchTerm}</strong>"<br/>
                                Intenta con términos más generales o verifica la ortografía
                              </small>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 text-center text-muted">
                            Escribe para buscar productos...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sección de investigación */}
              {selectedProduct && (
                <div className="row">
                  <div className="col-12">
                    <h5 className="text-primary mb-3">
                      <i className="bi bi-clipboard-data me-2"></i>
                      Investigación: {selectedProduct.name}
                    </h5>

                    {investigationLoading ? (
                      <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Cargando investigación...</span>
                        </div>
                        <p className="mt-2">Cargando investigación completa...</p>
                      </div>
                    ) : (
                      <div className="row">
                        {/* Información del producto */}
                        <div className="col-lg-4 mb-4">
                          <div className="card h-100">
                            <div className="card-header bg-info text-white">
                              <h6 className="mb-0">
                                <i className="bi bi-box me-2"></i>
                                Información del Producto
                              </h6>
                            </div>
                            <div className="card-body">
                              {productDetails ? (
                                <div>
                                  <div className="mb-3">
                                    <h6 className="text-primary mb-2">Identificación</h6>
                                    <p className="mb-1"><strong>ID:</strong> {productDetails.id}</p>
                                    <p className="mb-1"><strong>Nombre:</strong> {productDetails.name}</p>
                                    <p className="mb-1"><strong>SKU:</strong> <code className="bg-light px-2 py-1 rounded">{productDetails.sku || 'N/A'}</code></p>
                                    {productDetails.barcode && (
                                      <p className="mb-1"><strong>Código de Barras:</strong> <code className="bg-light px-2 py-1 rounded">{productDetails.barcode}</code></p>
                                    )}
                                  </div>
                                  
                                  <div className="mb-3">
                                    <h6 className="text-success mb-2">Stock y Configuración</h6>
                                    <p className="mb-1"><strong>Stock Mínimo:</strong> {productDetails.minimum_stock || 'No definido'}</p>
                                    <p className="mb-1"><strong>Stock Máximo:</strong> {productDetails.maximum_stock || 'No definido'}</p>
                                    {productDetails.cantidad_corrugado && (
                                      <p className="mb-1"><strong>Cantidad Corrugado:</strong> {productDetails.cantidad_corrugado}</p>
                                    )}
                                  </div>
                                  
                                  <div className="mb-3">
                                    <h6 className="text-info mb-2">Clasificación</h6>
                                    <p className="mb-1"><strong>Marca:</strong> {
                                      typeof productDetails.brand === 'object' && productDetails.brand
                                        ? productDetails.brand.name || productDetails.brand.description || productDetails.brand.id
                                        : productDetails.brand || 'N/A'
                                    }</p>
                                    <p className="mb-1"><strong>Categoría:</strong> {
                                      typeof productDetails.category === 'object' && productDetails.category
                                        ? productDetails.category.name || productDetails.category.description || productDetails.category.id
                                        : productDetails.category || 'N/A'
                                    }</p>
                                    {productDetails.group && (
                                      <p className="mb-1"><strong>Grupo:</strong> {productDetails.group}</p>
                                    )}
                                  </div>
                                  
                                  <div className="mb-3">
                                    <h6 className="text-warning mb-2">Estado</h6>
                                    <p className="mb-1">
                                      <strong>Estado:</strong> 
                                      <span className={`badge ms-2 ${productDetails.is_active ? 'bg-success' : 'bg-danger'}`}>
                                        {productDetails.is_active ? 'Activo' : 'Inactivo'}
                                      </span>
                                    </p>
                                    <p className="mb-1">
                                      <strong>Tipo:</strong>
                                      <span className={`badge ms-2 ${
                                        productDetails.status === 'NUEVO' ? 'bg-primary' :
                                        productDetails.status === 'OFERTA' ? 'bg-warning text-dark' :
                                        productDetails.status === 'REMATE' ? 'bg-danger' :
                                        'bg-secondary'
                                      }`}>
                                        {productDetails.status || 'REGULAR'}
                                      </span>
                                    </p>
                                  </div>
                                  
                                  {productDetails.description && (
                                    <div>
                                      <h6 className="text-secondary mb-2">Descripción</h6>
                                      <p className="small bg-light p-2 rounded">{productDetails.description}</p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center py-4">
                                  <div className="spinner-border spinner-border-sm text-info me-2"></div>
                                  <span className="text-muted">Cargando detalles...</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Resumen de movimientos */}
                        <div className="col-lg-8 mb-4">
                          <div className="card h-100">
                            <div className="card-header bg-warning text-dark">
                              <h6 className="mb-0">
                                <i className="bi bi-graph-up me-2"></i>
                                Resumen de Movimientos ({movements.length})
                              </h6>
                            </div>
                            <div className="card-body">
                              {movements.length > 0 ? (
                                <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                  <table className="table table-sm table-striped">
                                    <thead className="table-dark sticky-top">
                                      <tr>
                                        <th>Fecha</th>
                                        <th>Tipo</th>
                                        <th>Cantidad</th>
                                        <th>Almacén</th>
                                        <th>Referencia</th>
                                        <th>Usuario</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {movements.map((movement, index) => {
                                        const typeInfo = getMovementTypeInfo(movement.movement_type);
                                        return (
                                          <tr key={movement.id || index}>
                                            <td className="small">{formatDate(movement.created_at)}</td>
                                            <td>
                                              <span className={`badge bg-${typeInfo.class}`}>
                                                <i className={`bi ${typeInfo.icon} me-1`}></i>
                                                {typeInfo.label}
                                              </span>
                                            </td>
                                            <td className={movement.quantity > 0 ? 'text-success' : 'text-danger'}>
                                              {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                                            </td>
                                            <td className="small">{movement.warehouse?.name || 'N/A'}</td>
                                            <td className="small">{movement.reference || 'N/A'}</td>
                                            <td className="small">{movement.created_by?.username || 'Sistema'}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-muted text-center py-3">
                                  <i className="bi bi-inbox display-4 d-block mb-2"></i>
                                  No se encontraron movimientos para este producto
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Kardex */}
                        {kardex.length > 0 && (
                          <div className="col-12">
                            <div className="card">
                              <div className="card-header bg-success text-white">
                                <h6 className="mb-0">
                                  <i className="bi bi-journal-text me-2"></i>
                                  Kardex - Historial Detallado
                                </h6>
                              </div>
                              <div className="card-body">
                                <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                  <table className="table table-sm table-hover">
                                    <thead className="table-success sticky-top">
                                      <tr>
                                        <th>Fecha</th>
                                        <th>Movimiento</th>
                                        <th>Entrada</th>
                                        <th>Salida</th>
                                        <th>Saldo</th>
                                        <th>Precio Unit.</th>
                                        <th>Valor Total</th>
                                        <th>Referencia</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {kardex.map((item, index) => (
                                        <tr key={index}>
                                          <td className="small">{formatDate(item.date)}</td>
                                          <td className="small">{item.description}</td>
                                          <td className="text-success">{item.quantity_in || ''}</td>
                                          <td className="text-danger">{item.quantity_out || ''}</td>
                                          <td className="fw-bold">{item.balance}</td>
                                          <td>{formatCurrency(item.unit_cost)}</td>
                                          <td>{formatCurrency(item.total_value)}</td>
                                          <td className="small">{item.reference || 'N/A'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Debug de búsqueda y estadísticas */}
              {searchTerm && (
                <div className="row mb-4">
                  <div className="col-12">
                    <div className="card border-info">
                      <div className="card-header bg-info text-white">
                        <h6 className="mb-0">
                          <i className="bi bi-bug me-2"></i>
                          Debug de Búsqueda
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="row g-3">
                          <div className="col-md-6">
                            <small><strong>Término de búsqueda:</strong></small>
                            <div className="bg-light p-2 rounded font-monospace">{searchTerm}</div>
                            <small><strong>Término normalizado:</strong></small>
                            <div className="bg-light p-2 rounded font-monospace">{normalizeText(searchTerm)}</div>
                          </div>
                          <div className="col-md-6">
                            <small><strong>Estadísticas:</strong></small>
                            <ul className="list-unstyled mb-0">
                              <li>🔍 Resultados encontrados: <strong>{searchResults.length}</strong></li>
                              <li>📄 Longitud del término: <strong>{searchTerm.length}</strong></li>
                              <li>🔤 Palabras de búsqueda: <strong>{searchTerm.split(' ').filter(w => w.length > 0).length}</strong></li>
                              <li>⏱️ Estado: <strong>{searchLoading ? 'Buscando...' : 'Completado'}</strong></li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mensaje inicial */}
              {!selectedProduct && !searchTerm && (
                <div className="text-center py-5">
                  <i className="bi bi-search display-1 text-muted"></i>
                  <h5 className="text-muted mt-3">Seleccione un producto para comenzar la investigación</h5>
                  <p className="text-muted">
                    Use el campo de búsqueda para encontrar el producto que desea investigar
                  </p>
                  <div className="mt-4">
                    <div className="row justify-content-center">
                      <div className="col-md-8">
                        <div className="alert alert-info">
                          <h6><i className="bi bi-lightbulb me-2"></i>Consejos de búsqueda:</h6>
                          <ul className="mb-0">
                            <li>Busca por nombre, SKU, código de barras o descripción</li>
                            <li>No importan mayúsculas, minúsculas o acentos</li>
                            <li>Puedes usar palabras parciales</li>
                            <li>La búsqueda funciona con cualquier parte del texto</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductInvestigation;
