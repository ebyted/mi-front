import React, { useState, useEffect } from 'react';
import api from '../services/api';
import ElegantLayout from '../components/ElegantLayout';

function PurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ supplier: '', date: '', total: '' });
  const [details, setDetails] = useState([{ product: '', quantity: '', price: '' }]);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('purchase-orders/'),
      api.get('users/'),
      api.get('products/')
    ])
      .then(([ordersRes, usersRes, productsRes]) => {
        setOrders(ordersRes.data);
        setSuppliers(usersRes.data.filter(u => u.role === 'supplier'));
        setProducts(productsRes.data);
      })
      .catch(() => {
        setOrders([]);
        setSuppliers([]);
        setProducts([]);
        setError('No se pudo cargar las órdenes.');
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredOrders = orders.filter(o =>
    o.supplier?.toLowerCase().includes(search.toLowerCase())
  );

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDetailChange = (idx, e) => {
    const newDetails = [...details];
    newDetails[idx][e.target.name] = e.target.value;
    setDetails(newDetails);
  };

  const addDetail = () => {
    setDetails([...details, { product: '', quantity: '', price: '' }]);
  };

  const removeDetail = idx => {
    setDetails(details.filter((_, i) => i !== idx));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setFormError('');
    if (!formData.supplier || !formData.date || !details.length || details.some(d => !d.product || !d.quantity || !d.price)) {
      setFormError('Todos los campos y detalles son obligatorios.');
      return;
    }
    try {
      await api.post('purchase-orders/', { ...formData, details });
      setShowForm(false);
      setFormData({ supplier: '', date: '', total: '' });
      setDetails([{ product: '', quantity: '', price: '' }]);
      setLoading(true);
      api.get('purchase-orders/').then(res => setOrders(res.data)).finally(() => setLoading(false));
    } catch (err) {
      setFormError('Error al crear orden.');
    }
  };

  return (
    <ElegantLayout title="Órdenes de Compra">
      <div className="row mb-3">
        <div className="col">
          <input
            type="text"
            className="form-control"
            placeholder="Buscar proveedor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="col-auto">
          <button className="btn btn-success" onClick={() => setShowForm(true)}>
            Nueva orden
          </button>
        </div>
      </div>
      {loading ? (
        <div className="text-center text-secondary">Cargando...</div>
      ) : error ? (
        <div className="text-center text-danger">{error}</div>
      ) : (
        <div className="table-container">
          <table className="table table-bordered table-hover">
            <thead className="table-success">
              <tr>
                <th>Proveedor</th>
                <th>Fecha</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(o => (
                <tr key={o.id}>
                  <td>{o.supplier}</td>
                  <td>{o.date}</td>
                  <td>{o.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showForm && (
        <form className="bg-white p-4 rounded shadow mt-4" onSubmit={handleSubmit} style={{maxWidth: 600}}>
          <h2 className="mb-3">Nueva orden</h2>
          <div className="mb-3">
            <select
              name="supplier"
              className="form-select"
              value={formData.supplier}
              onChange={handleChange}
              required
            >
              <option value="">Selecciona proveedor</option>
              {suppliers
                .sort((a, b) => (a.email || '').localeCompare(b.email || ''))
                .map(s => (
                  <option key={s.id} value={s.email}>{s.email}</option>
                ))}
            </select>
          </div>
          <div className="mb-3">
            <input
              type="date"
              name="date"
              className="form-control"
              placeholder="Fecha"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="number"
              name="total"
              className="form-control"
              placeholder="Total"
              value={formData.total}
              onChange={handleChange}
              required
            />
          </div>
          <h4 className="mt-4 mb-2">Detalle de productos</h4>
          {details.map((d, idx) => (
            <div className="row g-2 mb-2" key={idx}>
              <div className="col-md-5">
                <select
                  name="product"
                  className="form-select"
                  value={d.product}
                  onChange={e => handleDetailChange(idx, e)}
                  required
                >
                  <option value="">Producto</option>
                  {products
                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                    .map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                </select>
              </div>
              <div className="col-md-3">
                <input
                  type="number"
                  name="quantity"
                  className="form-control"
                  placeholder="Cantidad"
                  value={d.quantity}
                  onChange={e => handleDetailChange(idx, e)}
                  required
                  min="1"
                />
              </div>
              <div className="col-md-3">
                <input
                  type="number"
                  name="price"
                  className="form-control"
                  placeholder="Precio"
                  value={d.price}
                  onChange={e => handleDetailChange(idx, e)}
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="col-md-1 d-flex align-items-center">
                <button type="button" className="btn btn-danger btn-sm" onClick={() => removeDetail(idx)} disabled={details.length === 1}>&times;</button>
              </div>
            </div>
          ))}
          <div className="mb-3">
            <button type="button" className="btn btn-outline-success" onClick={addDetail}>Agregar producto</button>
          </div>
          {formError && <div className="alert alert-danger mb-2">{formError}</div>}
          <button type="submit" className="btn btn-success">Guardar</button>
          <button type="button" className="btn btn-light ms-2" onClick={() => setShowForm(false)}>Cancelar</button>
        </form>
      )}
    </ElegantLayout>
  );
}

export default PurchaseOrders;
