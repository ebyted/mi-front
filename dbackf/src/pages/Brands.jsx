
import React, { useEffect, useState } from 'react';
import api from '../services/api';

function Brands() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    api.get('brands/')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setBrands(data);
      })
      .catch(() => {
        setBrands([]);
        setError('No se pudo cargar la lista de marcas.');
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredBrands = brands.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setFormError('');
    if (!formData.name || !formData.code) {
      setFormError('Todos los campos son obligatorios.');
      return;
    }
    try {
      await api.post('brands/', formData);
      setShowForm(false);
      setFormData({ name: '', code: '' });
      setLoading(true);
      api.get('brands/').then(res => {
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setBrands(data);
      }).finally(() => setLoading(false));
    } catch (err) {
      setFormError('Error al crear marca.');
    }
  };

  return (
    <div className="container py-5">
      <h1 className="display-5 mb-4 text-secondary">Marcas</h1>
      <div className="row mb-3">
        <div className="col">
          <input
            type="text"
            className="form-control"
            placeholder="Buscar marca..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="col-auto">
          <button className="btn btn-secondary" onClick={() => setShowForm(true)}>
            Nueva marca
          </button>
        </div>
      </div>
      {loading && <div className="text-center text-secondary">Cargando...</div>}
      {!loading && error && <div className="text-center text-danger">{error}</div>}
      {!loading && !error && (
        <table className="table table-bordered table-hover">
          <thead className="table-secondary">
            <tr>
              <th>Nombre</th>
              <th>Código</th>
            </tr>
          </thead>
          <tbody>
            {filteredBrands.map(b => (
              <tr key={b.id}>
                <td>{b.name}</td>
                <td>{b.code}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showForm && (
        <form className="bg-white p-4 rounded shadow mt-4" onSubmit={handleSubmit} style={{maxWidth: 500}}>
          <h2 className="mb-3">Nueva marca</h2>
          <div className="mb-3">
            <input
              type="text"
              name="name"
              className="form-control"
              placeholder="Nombre"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="text"
              name="code"
              className="form-control"
              placeholder="Código"
              value={formData.code}
              onChange={handleChange}
              required
            />
          </div>
          {formError && <div className="alert alert-danger mb-2">{formError}</div>}
          <button type="submit" className="btn btn-secondary">Guardar</button>
          <button type="button" className="btn btn-light ms-2" onClick={() => setShowForm(false)}>Cancelar</button>
        </form>
      )}
    </div>
  );
}

export default Brands;
