import React, { useEffect, useState } from 'react';
import api from '../services/api';

function Quotations() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ customer: '', quote_date: '', status: '', total_amount: '' });
  const [formError, setFormError] = useState('');
  const [products, setProducts] = useState([]);
  const [details, setDetails] = useState([{ product: '', quantity: '', price: '' }]);

  useEffect(() => {
    api.get('quotations/')
      .then(res => setQuotations(res.data))
      .catch(() => {
        setQuotations([]);
        setError('No se pudo cargar la lista de cotizaciones.');
      })
      .finally(() => setLoading(false));
    api.get('products/').then(res => setProducts(res.data)).catch(() => setProducts([]));
  }, []);

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
    if (!formData.customer || !formData.quote_date || !formData.status || !formData.total_amount || details.some(d => !d.product || !d.quantity || !d.price)) {
      setFormError('Todos los campos y detalles son obligatorios.');
      return;
    }
    // await api.post('quotations/', { ...formData, details });
    setShowForm(false);
    setFormData({ customer: '', quote_date: '', status: '', total_amount: '' });
    setDetails([{ product: '', quantity: '', price: '' }]);
    setLoading(true);
    api.get('quotations/').then(res => setQuotations(res.data)).finally(() => setLoading(false));
  };

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="display-5 text-info">Cotizaciones</h2>
        <button className="btn btn-info" onClick={() => setShowForm(true)}>
          Nueva cotización
        </button>
      </div>
      {loading ? (
        <div className="text-center text-secondary">Cargando...</div>
      ) : error ? (
        <div className="text-center text-danger">{error}</div>
      ) : (
        <div className="card shadow mb-4">
          <div className="card-body p-0">
            <table className="table table-bordered table-hover mb-0">
              <thead className="table-info">
                <tr>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map(quote => (
                  <tr key={quote.id}>
                    <td>{quote.customer}</td>
                    <td>{quote.quote_date}</td>
                    <td>{quote.status}</td>
                    <td>{quote.total_amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {showForm && (
        <div className="modal fade show d-block" tabIndex="-1" style={{background: 'rgba(0,0,0,0.4)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Crear cotización</h5>
                <button type="button" className="btn-close" onClick={() => setShowForm(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <input name="customer" type="text" placeholder="Cliente" className="form-control" value={formData.customer} onChange={handleChange} required />
                  </div>
                  <div className="mb-3">
                    <input name="quote_date" type="date" className="form-control" value={formData.quote_date} onChange={handleChange} required />
                  </div>
                  <div className="mb-3">
                    <select name="status" className="form-select" value={formData.status} onChange={handleChange} required>
                      <option value="">Selecciona estado</option>
                      <option value="Pendiente">Pendiente</option>
                      <option value="Aprobada">Aprobada</option>
                      <option value="Rechazada">Rechazada</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <input name="total_amount" type="number" className="form-control" placeholder="Total" value={formData.total_amount} onChange={handleChange} required min="0" step="0.01" />
                  </div>
                  <h5 className="mt-4 mb-2">Detalle de artículos</h5>
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
                          {products.map(p => (
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
                    <button type="button" className="btn btn-outline-info" onClick={addDetail}>Agregar artículo</button>
                  </div>
                  {formError && <div className="alert alert-danger mb-2">{formError}</div>}
                </div>
                <div className="modal-footer">
                  <button type="submit" className="btn btn-info">Guardar</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Quotations;
