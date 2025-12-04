import React from "react";

const TijuanaStoreHeader = ({ warehouseName = "Tijuana", productCount = 0, featuredCount = 0, offerCount = 0 }) => (
  <div className="hero-section">
    <style jsx="true">{`
      .hero-section {
        background: linear-gradient(rgba(255,255,255,0.9), rgba(240,240,240,0.9)), url('/img/store-bg.jpg');
        background-size: cover;
        background-position: center;
        color: #333;
        padding: 4rem 0;
        margin-bottom: 2rem;
      }
      .badge {
        font-size: 1rem;
        margin-right: 0.5rem;
      }
    `}</style>
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
              {warehouseName}
            </div>
            <div className="badge bg-success p-3">
              <i className="bi bi-box-seam me-2"></i>
              {productCount} productos disponibles
            </div>
            <div className="badge bg-warning p-3">
              <i className="bi bi-star-fill me-2"></i>
              {featuredCount} productos destacados
            </div>
            <div className="badge bg-info p-3">
              <i className="bi bi-percent me-2"></i>
              {offerCount} ofertas activas
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
);

export default TijuanaStoreHeader;