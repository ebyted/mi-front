import React, { useState, useEffect } from 'react';
import ProductShow from './ProductShow';
// import ProductSelect from './ProductSelect';
import { api } from '../services/api';



const ProductInventory = ({ selectedProductObj }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [productInfo, setProductInfo] = useState(null); // product details from API
  const [inventoryMovements, setInventoryMovements] = useState([]); // movements for selected variant
  // Estado para filtros de Inventario General
  const [filters, setFilters] = useState({
    warehouse: 'Todos',
    product: '',
    brand: '',
    category: '',
  });
  const [filteredProducts, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  // Función para calcular el kardex con saldos progresivos
  const calculateKardex = (movements) => {
    if (!movements || movements.length === 0) return [];
    
    // Aplanar todos los detalles de movimientos y ordenar por fecha
    const allDetails = [];
    movements.forEach(mov => {
      if (mov.details && mov.details.length > 0) {
        mov.details.forEach(detail => {
          allDetails.push({
            ...detail,
            movement: mov,
            created_at: mov.created_at,
            movement_type: mov.movement_type,
            warehouse_name: mov.warehouse_name,
            user_email: mov.user_email,
            reference_document: mov.reference_document,
            authorized: mov.authorized,
            is_cancelled: mov.is_cancelled
          });
        });
      }
    });
    
    // Ordenar por fecha (más antiguos primero)
    allDetails.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    // Calcular saldos progresivos
    let saldoAcumulado = 0;
    return allDetails.map((detail, index) => {
      const saldoAnterior = saldoAcumulado;
      const cantidad = parseFloat(detail.quantity) || 0;
      
      if (detail.movement_type === 'IN') {
        saldoAcumulado += cantidad;
      } else {
        saldoAcumulado -= cantidad;
      }
      
      return {
        ...detail,
        saldoAnterior,
        saldoActual: saldoAcumulado,
        isEntrada: detail.movement_type === 'IN',
        isSalida: detail.movement_type === 'OUT'
      };
    });
  };

  // Consultar info del producto y movimientos del inventario por variant
  useEffect(() => {
    if (selectedProductObj && selectedProductObj.product_variant_id) {
      // Si el objeto ya tiene los campos clave, úsalo directamente
      if (selectedProductObj.brand_name && selectedProductObj.category_name) {
        setProductInfo(selectedProductObj);
      } else if (selectedProductObj.id) {
        api.get(`/products/${selectedProductObj.id}/`).then(res => {
          setProductInfo(res.data);
        });
      }
      // Obtener movimientos de inventario para el variant
      console.log('🔍 Consultando inventory-movements para variant:', selectedProductObj.product_variant_id);
      api.get('/inventory-movements/', {
        params: { variant: selectedProductObj.product_variant_id }
      }).then(res => {
        console.log('📊 Respuesta inventory-movements:', res.data);
        setInventoryMovements(res.data.results || res.data);
      }).catch(err => {
        if (err.response && err.response.status === 404) {
          setInventoryMovements([]);
        }
      });
    } else {
      setProductInfo(null);
      setInventoryMovements([]);
    }
  }, [selectedProductObj]);

  // Efecto para obtener productos filtrados desde la API (Inventario General)
  useEffect(() => {
    // Obtener lista de almacenes al montar
    api.get('/warehouses/').then(res => {
      setWarehouses(res.data.results || res.data);
    });
  }, []);

  // Al cambiar de producto, limpiar filtros y solo mostrar el producto seleccionado
  useEffect(() => {
    setFilters({ warehouse: 'Todos', product: '', brand: '', category: '' });
  }, [selectedProductObj?.product_variant_id]);

  useEffect(() => {
    // Si hay producto seleccionado, filtra por variante; si no, muestra todos los artículos con existencia
    const params = {};
    if (filters.warehouse && filters.warehouse !== 'Todos') params.warehouse = filters.warehouse;
    if (filters.brand) params.brand = filters.brand;
    if (filters.category) params.category = filters.category;
    if (selectedProductObj && selectedProductObj.product_variant_id) {
      // Filtrar por la variante específica del producto seleccionado
      params.product_variant_id = selectedProductObj.product_variant_id;
    }
    console.log('🔍 Consultando inventory-general con params:', params);
    api.get('/inventory-general/', { params })
      .then(res => {
        console.log('📊 Respuesta inventory-general:', res.data);
        setProducts(res.data.results || res.data);
      })
      .catch(err => {
        console.error('❌ Error inventory-general:', err);
        setProducts([]);
      });
  }, [filters.warehouse, filters.brand, filters.category, selectedProductObj]);

  return (
    <div className="product-inventory-container">
      <div className="tabs mb-4">
        <button
          className={`tab-btn ${activeTab === 0 ? 'active' : ''}`}
          onClick={() => setActiveTab(0)}
        >
          Información de Producto
        </button>
        <button
          className={`tab-btn ${activeTab === 1 ? 'active' : ''}`}
          onClick={() => setActiveTab(1)}
        >
          Kardex del Producto
        </button>
        {/* Tercera pestaña oculta por solicitud del usuario
        <button
          className={`tab-btn ${activeTab === 2 ? 'active' : ''}`}
          onClick={() => setActiveTab(2)}
        >
          Inventario General
        </button>
        */}
      </div>
      <div className="tab-content">
        {activeTab === 0 && (
          selectedProductObj ? <ProductShow product={productInfo || selectedProductObj} /> : <div className="alert alert-info">Selecciona un producto para ver la información.</div>
        )}
        {activeTab === 1 && (
          <div className="kardex-tab">
            {!selectedProductObj ? (
              <div className="alert alert-info">
                <i className="bi bi-info-circle me-2"></i>
                Selecciona un producto para ver su kardex de movimientos
              </div>
            ) : (
              <>
                {/* Encabezado del Producto */}
                <div className="product-header mb-4">
                  <div className="row">
                    <div className="col-md-8">
                      <h3 className="text-primary fw-bold mb-1">
                        <i className="bi bi-clipboard-data me-2"></i>
                        Kardex del Producto
                      </h3>
                      <h5 className="text-secondary mb-0">{selectedProductObj.name}</h5>
                      <small className="text-muted">SKU: <code className="bg-light px-2 py-1 rounded">{selectedProductObj.sku}</code></small>
                    </div>
                    <div className="col-md-4 text-end">
                      <div className="card bg-light border-0">
                        <div className="card-body py-2 px-3">
                          <small className="text-muted d-block">Stock Actual</small>
                          <h4 className="text-info mb-0 fw-bold">
                            {(() => {
                              const kardexData = calculateKardex(inventoryMovements);
                              const saldoFinal = kardexData.length > 0 ? kardexData[kardexData.length - 1].saldoActual : 0;
                              return saldoFinal;
                            })()} unidades
                          </h4>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {inventoryMovements.length === 0 ? (
                  <div className="alert alert-warning">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    No hay movimientos registrados para este producto
                  </div>
                ) : (
                  <>
                    {/* Resumen de Totales */}
                    {(() => {
                      const kardexData = calculateKardex(inventoryMovements);
                      const totalEntradas = kardexData.filter(k => k.isEntrada).reduce((sum, k) => sum + parseFloat(k.quantity), 0);
                      const totalSalidas = kardexData.filter(k => k.isSalida).reduce((sum, k) => sum + parseFloat(k.quantity), 0);
                      const valorEntradas = kardexData.filter(k => k.isEntrada).reduce((sum, k) => sum + parseFloat(k.total || 0), 0);
                      const valorSalidas = kardexData.filter(k => k.isSalida).reduce((sum, k) => sum + parseFloat(k.total || 0), 0);
                      
                      return (
                        <div className="summary-cards mb-4">
                          <div className="row g-3">
                            <div className="col-md-3">
                              <div className="card border-success">
                                <div className="card-body text-center py-2">
                                  <i className="bi bi-arrow-up-circle-fill text-success fs-4"></i>
                                  <div className="fw-bold text-success fs-5">{totalEntradas}</div>
                                  <small className="text-muted">Total Entradas</small>
                                  <div className="text-success fw-bold">${valorEntradas.toFixed(2)}</div>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="card border-danger">
                                <div className="card-body text-center py-2">
                                  <i className="bi bi-arrow-down-circle-fill text-danger fs-4"></i>
                                  <div className="fw-bold text-danger fs-5">{totalSalidas}</div>
                                  <small className="text-muted">Total Salidas</small>
                                  <div className="text-danger fw-bold">${valorSalidas.toFixed(2)}</div>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="card border-info">
                                <div className="card-body text-center py-2">
                                  <i className="bi bi-clipboard-check-fill text-info fs-4"></i>
                                  <div className="fw-bold text-info fs-5">{kardexData.length}</div>
                                  <small className="text-muted">Movimientos</small>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="card border-warning">
                                <div className="card-body text-center py-2">
                                  <i className="bi bi-graph-up text-warning fs-4"></i>
                                  <div className="fw-bold text-warning fs-5">{totalEntradas - totalSalidas}</div>
                                  <small className="text-muted">Saldo Neto</small>
                                  <div className="text-warning fw-bold">${(valorEntradas - valorSalidas).toFixed(2)}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Tabla Kardex Mejorada */}
                    <div className="table-responsive kardex-table">
                      <table className="table table-sm table-bordered">
                        <thead className="table-dark">
                          <tr>
                            <th width="130">Fecha/Hora</th>
                            <th width="120">Documento</th>
                            <th width="100">Concepto</th>
                            <th width="80">Entradas</th>
                            <th width="80">Salidas</th>
                            <th width="90">Saldo Ant.</th>
                            <th width="90">Saldo Act.</th>
                            <th width="80">Precio Unit.</th>
                            <th width="100">Valor Total</th>
                            <th width="120">Usuario</th>
                            <th width="80">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calculateKardex(inventoryMovements).map((kardex, idx) => (
                            <tr key={`kardex-${idx}`} className={kardex.isEntrada ? 'table-success-subtle' : 'table-danger-subtle'}>
                              <td>
                                <small>
                                  {kardex.created_at ? new Date(kardex.created_at).toLocaleString('es-ES', {
                                    day: '2-digit', month: '2-digit', year: '2-digit',
                                    hour: '2-digit', minute: '2-digit'
                                  }) : '-'}
                                </small>
                              </td>
                              <td>
                                <small className="text-muted">{kardex.reference_document || 'Movimiento Manual'}</small>
                              </td>
                              <td>
                                <span className={`badge ${kardex.isEntrada ? 'bg-success' : 'bg-danger'}`}>
                                  {kardex.isEntrada ? '📈' : '📉'}
                                </span>
                              </td>
                              <td className="text-center">
                                {kardex.isEntrada ? (
                                  <span className="fw-bold text-success">+{kardex.quantity}</span>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td className="text-center">
                                {kardex.isSalida ? (
                                  <span className="fw-bold text-danger">-{kardex.quantity}</span>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td className="text-center">
                                <span className="badge bg-secondary">{kardex.saldoAnterior}</span>
                              </td>
                              <td className="text-center">
                                <span className="badge bg-info">{kardex.saldoActual}</span>
                              </td>
                              <td className="text-end">
                                <small>${parseFloat(kardex.price || 0).toFixed(2)}</small>
                              </td>
                              <td className="text-end">
                                <strong className={kardex.isEntrada ? 'text-success' : 'text-danger'}>
                                  ${parseFloat(kardex.total || 0).toFixed(2)}
                                </strong>
                              </td>
                              <td>
                                <small className="text-muted">{kardex.user_email?.split('@')[0] || '-'}</small>
                              </td>
                              <td>
                                {kardex.is_cancelled ? (
                                  <span className="badge bg-secondary" title="Cancelado">❌</span>
                                ) : kardex.authorized ? (
                                  <span className="badge bg-success" title="Autorizado">✅</span>
                                ) : (
                                  <span className="badge bg-warning" title="Pendiente">⏳</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
        {activeTab === 2 && (
          <div className="inventory-general-tab">
            <h3 className="mb-3 text-primary fw-bold">Inventario General</h3>
            {/* Mostrar product_variant_id y product_id para depuración */}
            {selectedProductObj && (
              <div className="alert alert-info mb-3">
                <strong>product_variant_id:</strong> {selectedProductObj.product_variant_id || 'N/A'}<br />
                <strong>product_id:</strong> {selectedProductObj.id || selectedProductObj.product_id || 'N/A'}
              </div>
            )}
            <div className="row mb-4">
              <div className="col-md-3 mb-2">
                <label className="form-label">Almacén</label>
                <select className="form-select" value={filters.warehouse} onChange={e => setFilters(f => ({ ...f, warehouse: e.target.value }))}>
                  <option value="Todos">Todos</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3 mb-2">
                <label className="form-label">Producto</label>
                <input
                  className="form-control"
                  value={selectedProductObj ? (selectedProductObj.sku || selectedProductObj.name || '') : ''}
                  readOnly
                  style={{ background: '#f0f4ff', fontWeight: 'bold' }}
                  placeholder="Nombre o SKU"
                />
              </div>
              <div className="col-md-3 mb-2">
                <label className="form-label">Marca</label>
                <input className="form-control" value={filters.brand} onChange={e => setFilters(f => ({ ...f, brand: e.target.value }))} placeholder="Marca" disabled={!!selectedProductObj} />
              </div>
              <div className="col-md-3 mb-2">
                <label className="form-label">Categoría</label>
                <input className="form-control" value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))} placeholder="Categoría" disabled={!!selectedProductObj} />
              </div>
            </div>
            <div className="table-responsive GeneralTable">
              <table className="table table-bordered table-hover" >
                <thead className="table-primary">
                  <tr>
                    <th>SKU</th>
                    <th>Nombre del Producto</th>
                    <th>Estado</th>
                    <th>Marca</th>
                    <th>Categoría</th>
                    <th>Almacén</th>
                    <th>Stock Actual</th>
                    <th>Stock Mínimo</th>
                    <th>Stock Máximo</th>
                    <th>Nivel</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="text-center py-5">
                        <div className="text-muted">
                          <div className="h1 mb-3">📦</div>
                          <h5>{selectedProductObj ? 'No hay información de inventario para este producto' : 'No hay productos con existencia'}</h5>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((prod, idx) => {
                      const stockLevel = prod.stock || 0;
                      const minStock = prod.minimum_stock || 0;
                      const maxStock = prod.maximum_stock || 0;
                      
                      let levelStatus = 'normal';
                      let levelText = 'Normal';
                      let levelColor = 'bg-success';
                      
                      if (stockLevel <= minStock) {
                        levelStatus = 'low';
                        levelText = 'Bajo';
                        levelColor = 'bg-danger';
                      } else if (stockLevel >= maxStock && maxStock > 0) {
                        levelStatus = 'high';
                        levelText = 'Alto';
                        levelColor = 'bg-warning text-dark';
                      }
                      
                      return (
                        <tr key={idx} className={stockLevel <= minStock ? 'table-warning' : ''}>
                          <td><code className="bg-light text-dark px-2 py-1 rounded">{prod.sku || 'N/A'}</code></td>
                          <td><strong className="text-primary">{prod.name || 'N/A'}</strong></td>
                          <td>
                            <span className={`badge ${prod.status === 'REGULAR' ? 'bg-success' : 'bg-danger'}`}>
                              {prod.status === 'REGULAR' ? '✅ Regular' : '❌ ' + (prod.status || 'Inactivo')}
                            </span>
                          </td>
                          <td><small className="text-muted">{prod.brand || 'N/A'}</small></td>
                          <td><small className="text-muted">{prod.category || 'N/A'}</small></td>
                          <td><small className="text-muted">{prod.warehouse_name || `Almacén ${prod.warehouse}`}</small></td>
                          <td>
                            <span className={`badge fs-6 ${stockLevel <= minStock ? 'bg-danger' : 'bg-success'}`}>
                              {stockLevel}
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-info text-dark fs-6">{minStock}</span>
                          </td>
                          <td>
                            <span className="badge bg-secondary fs-6">{maxStock || 'N/A'}</span>
                          </td>
                          <td>
                            <span className={`badge ${levelColor}`}>
                              {levelText}
                              {levelStatus === 'low' && ' ⚠️'}
                              {levelStatus === 'high' && ' 📈'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        .product-inventory-container {
          max-width: 900px;
          margin: 0 auto;
        }
        .tabs {
          display: flex;
          gap: 1rem;
        }
        .tab-btn {
          padding: 0.75rem 2rem;
          border: none;
          border-radius: 1rem 1rem 0 0;
          background: #f5f5f5;
          color: #333;
          font-weight: bold;
          font-size: 1.1rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .tab-btn.active {
          background: #007bff;
          color: #fff;
        }
        .tab-content {
          background: #fff;
          border-radius: 0 0 1rem 1rem;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          padding: 2rem;
        }
        .inventory-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }
        @media (min-width: 768px) {
          .inventory-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        .inventory-card {
          background: #f8f9fa;
          border-radius: 1rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          padding: 1.5rem;
        }
        .card-header {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .card-body {
          font-size: 1rem;
        }
        .details-grid {
          margin-top: 1rem;
        }
        .table th, .table td {
          vertical-align: middle;
        }
        .GeneralTable table{ table-layout:fixed;}
        .GeneralTable table tr th:nth-child(2),
        .GeneralTable table tr td:nth-child(2){ width:200px;word-break: break-all;}
        .GeneralTable table tr th:nth-child(5),
        .GeneralTable table tr td:nth-child(5){ width:100px;word-break: break-all;}
        
        /* Estilos específicos para el kardex */
        .kardex-tab .product-header {
          border-bottom: 2px solid #e3f2fd;
          padding-bottom: 1rem;
        }
        .kardex-tab .summary-cards .card {
          transition: transform 0.2s ease-in-out;
        }
        .kardex-tab .summary-cards .card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .kardex-table {
          max-height: 500px;
          overflow-y: auto;
        }
        .kardex-table table {
          font-size: 0.85rem;
        }
        .kardex-table .table-success-subtle {
          background-color: rgba(25, 135, 84, 0.1);
        }
        .kardex-table .table-danger-subtle {
          background-color: rgba(220, 53, 69, 0.1);
        }
        .kardex-table tbody tr:hover {
          background-color: rgba(33, 37, 41, 0.05);
        }
      `}</style>
    </div>
  );
};

export default ProductInventory;
