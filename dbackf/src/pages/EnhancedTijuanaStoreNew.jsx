import React, { useEffect, useState } from "react";
import api from "../services/api";
import ProductList from "./ProductList";
import TijuanaStoreHeader from "./TijuanaStoreHeader";

const EnhancedTijuanaStoreNew = () => {
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get("/products/");
        setAllProducts(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch (err) {
        setAllProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div className="enhanced-tijuana-store">

        
      <TijuanaStoreHeader
        warehouseName="Tijuana"
        productCount={allProducts.length}
        featuredCount={allProducts.filter(p => p.is_featured).length}
        offerCount={allProducts.filter(p => p.discount > 0).length}
      />
      
      <style jsx="true">{`
        .enhanced-tijuana-store {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          min-height: 100vh;
          padding-bottom: 2rem;
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
        .product-card .card-body {
          padding: 1rem;
        }
        .product-card .fw-bold {
          font-size: 1rem;
        }
        .product-card .text-muted {
          font-size: 0.9rem;
        }
        .product-card .h6 {
          font-size: 1.1rem;
        }
      `}</style>
      <div className="container py-4">
        <h2 className="mb-4 text-primary">Lista de Productos</h2>
        {loading ? (
          <div className="text-center py-5">
            <span className="spinner-border text-primary"></span>
            <div className="mt-3">Cargando productos...</div>
          </div>
        ) : (
          <div className="row g-4">
            {allProducts.length === 0 ? (
              <div className="col-12 text-center text-muted py-5">
                No hay productos disponibles.
              </div>
            ) : (
              allProducts.map(product => (
                <div key={product.id} className="col-md-3">
                  <div className="product-card card h-100">
                    <img
                      src={product.image || "/img/producto-fallback.svg"}
                      alt={product.name}
                      className="card-img-top"
                    />
                    <div className="card-body">
                      <h6 className="fw-bold text-truncate">{product.name}</h6>
                      <p className="text-muted small mb-2">
                        {product.brand?.name} | Stock: {product.stock}
                      </p>
                      <span className="h6 text-success mb-0">
                        ${product.price}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedTijuanaStoreNew;
