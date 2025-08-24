import React, { useState, useEffect } from 'react';
import ProductShow from './ProductShow';
import { api } from '../services/api'; // Importa la instancia de API desde la ruta correcta

const mockWarehouses = [
  { id: 1, name: 'Almacén Central' },
  { id: 2, name: 'Sucursal Norte' },
];

const mockProducts = [
  { sku: 'A001', name: 'Producto A', status: 'REGULAR', stock: 120, minimum_stock: 10, maximum_stock: 200, brand_name: 'MarcaX', category_name: 'Cat1' },
  { sku: 'B002', name: 'Producto B', status: 'OFERTA', stock: 80, minimum_stock: 5, maximum_stock: 150, brand_name: 'MarcaY', category_name: 'Cat2' },
];

const ProductInventory = ({ product, inventoryMovements = [] }) => {
  const [activeTab, setActiveTab] = useState('product');
  // Estado para filtros de Inventario General
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filteredProducts, setProducts] = useState(mockProducts);

  // Efecto para obtener productos filtrados desde la API
  useEffect(() => {
    api.get('/inventory-general/', {
      params: {
        warehouse_id: selectedWarehouse,
        product: filterProduct,
        brand: filterBrand,
        category: filterCategory
      }
    }).then(res => {
      setProducts(res.data.results || res.data);
    });
  }, [selectedWarehouse, filterProduct, filterBrand, filterCategory]);

  return (
    <div className="product-inventory-container">
      <div className="tabs mb-4">
        <button
          className={`tab-btn ${activeTab === 'product' ? 'active' : ''}`}
          onClick={() => setActiveTab('product')}
        >
          Información de Producto
        </button>
        <button
          className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          Inventario
        </button>
        <button
          className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          Inventario General
        </button>
      </div>
      <div className="tab-content">
        {activeTab === 'product' && (
          <ProductShow product={product} />
        )}
        {activeTab === 'inventory' && (
          <div className="inventory-tab">
            <h3 className="mb-3 text-primary fw-bold">Movimientos de Inventario</h3>
            {inventoryMovements.length === 0 ? (
              <div className="alert alert-info">No hay movimientos registrados para este producto.</div>
            ) : (
              <div className="inventory-grid">
                {inventoryMovements.map((mov, idx) => (
                  <div key={mov.id || idx} className="inventory-card">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <span className={`badge ${mov.type === 'IN' ? 'bg-success' : 'bg-danger'} fs-6`}>{mov.type === 'IN' ? 'Entrada' : 'Salida'}</span>
                      <span className="badge bg-info">#{mov.id}</span>
                      <span className="badge bg-secondary">{mov.warehouse_name}</span>
                      <span className="badge bg-light text-dark">{new Date(mov.created_at).toLocaleString('es-ES')}</span>
                    </div>
                    <div className="card-body">
                      <div className="mb-2">
                        <strong>Notas:</strong> <span className="text-muted">{mov.notes || '-'}</span>
                      </div>
                      <div className="mb-2">
                        <strong>Estado:</strong> {mov.is_cancelled ? <span className="badge bg-danger">Cancelado</span> : mov.authorized ? <span className="badge bg-success">Autorizado</span> : <span className="badge bg-warning text-dark">Pendiente</span>}
                      </div>
                      <div className="mb-2">
                        <strong>Creado por:</strong> <span className="text-muted">{mov.created_by_email || mov.user_email || 'N/A'}</span>
                      </div>
                      <div className="mb-2">
                        <strong>Saldo después del movimiento:</strong> <span className="badge bg-primary fs-5">{mov.saldo !== undefined ? mov.saldo : '-'}</span>
                      </div>
                      <div className="mb-2">
                        <strong>Detalles:</strong>
                        <div className="details-grid mt-2">
                          {mov.details && mov.details.length > 0 ? (
                            <table className="table table-striped table-hover">
                              <thead className="table-dark">
                                <tr>
                                  <th>Producto</th>
                                  <th>Cantidad</th>
                                  <th>Lote</th>
                                  <th>Fecha Exp.</th>
                                  <th>Notas</th>
                                </tr>
                              </thead>
                              <tbody>
                                {mov.details.map((detail, i) => (
                                  <tr key={i}>
                                    <td>{detail.product_name || detail.product_variant_name || '-'}</td>
                                    <td><span className={`badge ${mov.type === 'IN' ? 'bg-success' : 'bg-danger'} fs-6`}>{detail.quantity}</span></td>
                                    <td>{detail.lote || '-'}</td>
                                    <td>{detail.expiration_date ? new Date(detail.expiration_date).toLocaleDateString('es-ES') : '-'}</td>
                                    <td>{detail.notes || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="alert alert-secondary">Sin detalles</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === 'general' && (
          <div className="inventory-general-tab">
            <h3 className="mb-3 text-primary fw-bold">Inventario General</h3>
            <div className="row mb-4">
              <div className="col-md-3 mb-2">
                <label className="form-label">Almacén</label>
                <select className="form-select" value={selectedWarehouse} onChange={e => setSelectedWarehouse(e.target.value)}>
                  <option value="">Todos</option>
                  {mockWarehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3 mb-2">
                <label className="form-label">Producto</label>
                <input className="form-control" value={filterProduct} onChange={e => setFilterProduct(e.target.value)} placeholder="Nombre o SKU" />
              </div>
              <div className="col-md-3 mb-2">
                <label className="form-label">Marca</label>
                <input className="form-control" value={filterBrand} onChange={e => setFilterBrand(e.target.value)} placeholder="Marca" />
              </div>
              <div className="col-md-3 mb-2">
                <label className="form-label">Categoría</label>
                <input className="form-control" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} placeholder="Categoría" />
              </div>
            </div>
            <div className="table-responsive">
              <table className="table table-bordered table-hover">
                <thead className="table-primary">
                  <tr>
                    <th>SKU</th>
                    <th>Nombre</th>
                    <th>Estado</th>
                    <th>Stock</th>
                    <th>Mínimo</th>
                    <th>Máximo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-5">
                        <div className="text-muted">
                          <div className="h1 mb-3">📦</div>
                          <h5>No hay productos con existencia</h5>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((prod, idx) => (
                      <tr key={idx}>
                        <td><span className="fw-bold text-info">{prod.sku}</span></td>
                        <td><span className="fw-bold text-primary">{prod.name}</span></td>
                        <td><span className={`badge ${prod.status === 'REGULAR' ? 'bg-light text-dark' : 'bg-danger'}`}>{prod.status}</span></td>
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
      `}</style>
    </div>
  );
};

export default ProductInventory;
