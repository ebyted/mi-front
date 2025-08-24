import React, { useEffect, useState } from 'react';
import { api } from '../services/api';


const ProductShow = ({ product }) => {
  const [inventory, setInventory] = useState(null);
  const [loadingInventory, setLoadingInventory] = useState(false);

  useEffect(() => {
    if (product && product.product_variant_id) {
      setLoadingInventory(true);
      api.get(`/inventory/?variant_id=${product.product_variant_id}`)
        .then(resp => {
          setInventory(resp.data);
        })
        .catch(() => {
          setInventory(null);
        })
        .finally(() => {
          setLoadingInventory(false);
        });
    } else {
      setInventory(null);
    }
  }, [product]);

  if (!product) return null;

  return (
    <div className="product-show-container">
      <div className="product-card grid-card">
        {/* Imagen */}
        <div className="product-image">
          <img
            src={product.image_url || 'https://via.placeholder.com/150'}
            alt={product.name}
            className="img-fluid rounded shadow"
          />
        </div>
        {/* Info principal */}
        <div className="product-info">
          <h2 className="product-name text-primary fw-bold mb-2">{product.name}</h2>
          <div className="mb-2">
            <span className="badge bg-info me-2">SKU: {product.sku}</span>
            <span className="badge bg-secondary me-2">{product.brand_name}</span>
            <span className="badge bg-warning text-dark">{product.category_name}</span>
          </div>
          <div className="mb-2">
            <span className="badge bg-success fs-5">
              Stock: {product.current_stock}
            </span>
            <span className="badge bg-primary ms-2 fs-5">
              ${parseFloat(product.price).toFixed(2)}
            </span>
          </div>
          <div className="mb-2">
            <span className={`badge ${product.status === 'REGULAR' ? 'bg-light text-dark' : 'bg-danger'}`}>
              Estado: {product.status}
            </span>
          </div>
          {product.description && (
            <div className="product-description mt-3">
              <p className="text-muted">{product.description}</p>
            </div>
          )}

          {/* Inventario relacionado */}
          <div className="mt-3">
            <h5 className="text-primary">Inventario relacionado</h5>
            {loadingInventory ? (
              <div className="text-muted">Cargando inventario...</div>
            ) : inventory && Array.isArray(inventory) && inventory.length > 0 ? (
              <ul className="list-group">
                {inventory.map((inv, idx) => (
                  <li key={idx} className="list-group-item">
                    <strong>Almacén:</strong> {inv.warehouse_name || inv.warehouse}
                    {' | '}<strong>Stock:</strong> {inv.stock}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-muted">No hay inventario para este producto/variante.</div>
            )}
          </div>
        </div>
      </div>
      <style jsx>{`
        .product-show-container {
          max-width: 600px;
          margin: 0 auto;
        }
        .product-card {
          display: flex;
          flex-direction: column;
          background: #fff;
          border-radius: 1rem;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          padding: 1.5rem;
          gap: 1.5rem;
        }
        .product-image {
          text-align: center;
        }
        @media (min-width: 768px) {
          .product-card.grid-card {
            flex-direction: row;
            align-items: flex-start;
          }
          .product-image {
            flex: 0 0 180px;
          }
          .product-info {
            flex: 1;
            padding-left: 2rem;
          }
        }
        .product-name {
          font-size: 1.5rem;
        }
        .badge {
          font-size: 1rem;
        }
        .product-description {
          font-size: 1rem;
        }
      `}</style>
    </div>
  );
};

export default ProductShow;
