
import React, { useEffect, useState } from "react";
import ElegantLayout from "../components/ElegantLayout";
import AppNavbar from "../components/AppNavbar";
import api from "../services/api";

const Store = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [galleryProduct, setGalleryProduct] = useState(null);
  const [storeName, setStoreName] = useState("");
  const [location, setLocation] = useState("");
  const [manager, setManager] = useState("");
  const [type, setType] = useState("");
  const [details, setDetails] = useState([]);

  useEffect(() => {
    api.get("products/")
      .then(res => setProducts(res.data))
      .catch(() => setProducts([]));
  }, []);

  const addToCart = (product) => {
    setCart([...cart, product]);
  };

  const handleAddDetail = () => {
    if (storeName && location && manager && type) {
      setDetails([...details, { storeName, location, manager, type }]);
      setStoreName("");
      setLocation("");
      setManager("");
      setType("");
    }
  };

  return (
    <ElegantLayout>
      <AppNavbar />
      <div className="container mt-4">
        <h2 className="mb-4">Tienda</h2>
        <div className="row mb-3">
          <div className="col-md-3">
            <input
              type="text"
              className="form-control"
              placeholder="Nombre de la tienda"
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <input
              type="text"
              className="form-control"
              placeholder="Ubicación"
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <input
              type="text"
              className="form-control"
              placeholder="Encargado"
              value={manager}
              onChange={e => setManager(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <select
              className="form-select"
              value={type}
              onChange={e => setType(e.target.value)}
            >
              <option value="">Tipo de tienda</option>
              <option value="Sucursal">Sucursal</option>
              <option value="Almacén">Almacén</option>
              <option value="Online">Online</option>
            </select>
          </div>
        </div>
        <button className="btn btn-primary mb-3" onClick={handleAddDetail}>
          Agregar
        </button>
        <div className="card mb-4">
          <div className="card-header">Detalles de la tienda</div>
          <ul className="list-group list-group-flush">
            {details.map((d, idx) => (
              <li key={idx} className="list-group-item">
                {d.storeName} - {d.location} - {d.manager} - {d.type}
              </li>
            ))}
            {details.length === 0 && (
              <li className="list-group-item text-muted">Sin detalles</li>
            )}
          </ul>
        </div>
        <h3 className="mb-3">Productos</h3>
        <div className="row">
          {products.map(product => (
            <div key={product.id} className="col-md-4 mb-4">
              <div className="card h-100">
                <img src={product.image_url || "https://source.unsplash.com/300x200/?product"} alt={product.name} className="card-img-top" style={{height: "200px", objectFit: "cover", cursor: "pointer"}} onClick={() => setGalleryProduct(product)} />
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title">{product.name}</h5>
                  <p className="card-text">SKU: {product.sku}</p>
                  <button className="btn btn-primary mt-auto" onClick={() => addToCart(product)}>Agregar al carrito</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Galería elegante */}
        {galleryProduct && (
          <div className="modal show d-block" tabIndex="-1" role="dialog" onClick={() => setGalleryProduct(null)}>
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{galleryProduct.name}</h5>
                  <button type="button" className="close" onClick={() => setGalleryProduct(null)}>&times;</button>
                </div>
                <div className="modal-body">
                  <img src={galleryProduct.image_url || "https://source.unsplash.com/400x300/?product"} alt={galleryProduct.name} className="img-fluid mb-3" />
                  <p>{galleryProduct.description}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Carrito de compras */}
        <div className="position-fixed bottom-0 end-0 m-4" style={{zIndex: 1050, width: "350px"}}>
          <div className="card">
            <div className="card-header">Carrito</div>
            <ul className="list-group list-group-flush">
              {cart.length === 0 ? <li className="list-group-item">Vacío</li> : cart.map((item, idx) => (
                <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                  <span>{item.name}</span>
                  <span className="text-primary fw-bold">${item.sale_price}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </ElegantLayout>
  );
};

export default Store;
