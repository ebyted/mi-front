
// Versión limpia y única
import React, { useState, useEffect } from 'react';
import api from '../services/api';

function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    api.get('categories/')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setCategories(data);
      })
      .catch(() => {
        setCategories([]);
        setError('No se pudo cargar la lista de categorías.');
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setFormError('');
    if (!formData.name) {
      setFormError('El nombre es obligatorio.');
      return;
    }
    try {
      await api.post('categories/', formData);
      setShowForm(false);
      setFormData({ name: '' });
      setLoading(true);
      api.get('categories/').then(res => {
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setCategories(data);
      }).finally(() => setLoading(false));
    } catch (err) {
      setFormError('Error al crear categoría.');
    }
  };

  return (
    <div className="container py-5">
      <h1 className="display-5 mb-4 text-warning">Categorías</h1>
      <div className="row mb-3">
        <div className="col">
          <input
            type="text"
            className="form-control"
            placeholder="Buscar categoría..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="col-auto">
          <button className="btn btn-warning" onClick={() => setShowForm(true)}>
            Nueva categoría
          </button>
        </div>
      </div>
      {loading && <div className="text-center text-secondary">Cargando...</div>}
      {!loading && error && <div className="text-center text-danger">{error}</div>}
      {!loading && !error && (
        <table className="table table-bordered table-hover">
          <thead className="table-warning">
            <tr>
              <th>Nombre</th>
            </tr>
          </thead>
          <tbody>
            {filteredCategories.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showForm && (
        <form className="bg-white p-4 rounded shadow mt-4" onSubmit={handleSubmit} style={{maxWidth: 500}}>
          <h2 className="mb-3">Nueva categoría</h2>
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
          {formError && <div className="alert alert-danger mb-2">{formError}</div>}
          <button type="submit" className="btn btn-warning">Guardar</button>
          <button type="button" className="btn btn-light ms-2" onClick={() => setShowForm(false)}>Cancelar</button>
        </form>
      )}
    </div>
  );
}

export default Categories;
