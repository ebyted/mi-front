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
      api.get('/inventory-movements/', {
        params: { product_variant_id: selectedProductObj.product_variant_id }
      }).then(res => {
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
    // Siempre filtra por el producto/variant recibido
    if (selectedProductObj && selectedProductObj.product_variant_id) {
      api.get('/inventory-general/', {
        params: {
          warehouse: filters.warehouse,
          product_variant_id: selectedProductObj.product_variant_id
        }
      })
        .then(res => setProducts(res.data.results || res.data))
        .catch(() => setProducts([]));
    } else {
      setProducts([]);
    }
  }, [filters.warehouse, selectedProductObj]);

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
          Inventario
        </button>
        <button
          className={`tab-btn ${activeTab === 2 ? 'active' : ''}`}
          onClick={() => setActiveTab(2)}
        >
          Inventario General
        </button>
      </div>
      <div className="tab-content">
        {activeTab === 0 && (
          selectedProductObj ? <ProductShow product={productInfo || selectedProductObj} /> : <div className="alert alert-info">Selecciona un producto para ver la información.</div>
        )}
        {activeTab === 1 && (
          <div className="inventory-tab">
            <h3 className="mb-3 text-primary fw-bold">Movimientos de Inventario</h3>
            {selectedProductObj && inventoryMovements.length === 0 ? (
              <div className="alert alert-info">No hay movimientos registrados para este producto/variante.</div>
            ) : !selectedProductObj ? (
              <div className="alert alert-info">Selecciona un producto para ver los movimientos.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>SKU</th>
                      <th>Cantidad</th>
                      <th>Stock después</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryMovements.map((mov, idx) => (
                      <tr key={mov.id || idx}>
                        <td>{mov.created_at ? new Date(mov.created_at).toLocaleString('es-ES') : '-'}</td>
                        <td><span className={`badge ${mov.type === 'IN' ? 'bg-success' : 'bg-danger'}`}>{mov.type === 'IN' ? 'Entrada' : 'Salida'}</span></td>
                        <td>{mov.sku || (mov.details && mov.details[0] && mov.details[0].sku) || '-'}</td>
                        <td>{mov.details && mov.details[0] ? mov.details[0].quantity : '-'}</td>
                        <td>{mov.saldo !== undefined ? mov.saldo : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                    <th>Nombre</th>
                    <th>Estado</th>
                    <th>Marca</th>
                    <th>Categoría</th>
                    <th>Stock</th>
                    <th>Mínimo</th>
                    <th>Máximo</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedProductObj && selectedProductObj.product_variant_id
                    ? filteredProducts.filter(p => p.product_variant_id === selectedProductObj.product_variant_id)
                    : filteredProducts
                  ).length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-5">
                        <div className="text-muted">
                          <div className="h1 mb-3">📦</div>
                          <h5>No hay productos con existencia</h5>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    (selectedProductObj && selectedProductObj.product_variant_id
                      ? filteredProducts.filter(p => p.product_variant_id === selectedProductObj.product_variant_id)
                      : filteredProducts
                    ).map((prod, idx) => (
                      <tr key={idx}>
                        <td><span className="fw-bold text-info">{prod.sku}</span></td>
                        <td><span className="fw-bold text-primary">{prod.name}</span></td>
                        <td><span className={`badge ${prod.status === 'REGULAR' ? 'bg-light text-dark' : 'bg-danger'}`}>{prod.status}</span></td>
                        <td>{prod.brand || 'N/A'}</td>
                        <td>{prod.category || 'N/A'}</td>
                        <td><span className="badge bg-success fs-6">{prod.stock}</span></td>
                        <td><span className="badge bg-warning text-dark">{prod.minimum_stock}</span></td>
                        <td><span className="badge bg-warning text-dark">{prod.maximum_stock}</span></td>
                      </tr>
                    ))
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
      `}</style>
    </div>
  );
};

export default ProductInventory;
