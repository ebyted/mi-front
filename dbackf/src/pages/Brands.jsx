
import React, { useEffect, useState } from 'react';
import api from '../services/api';

function Brands() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', description: '', country: '' });
  const [formError, setFormError] = useState('');
  const [editingBrand, setEditingBrand] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = () => {
    setLoading(true);
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
  };

  const filteredBrands = brands.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.code && b.code.toLowerCase().includes(search.toLowerCase())) ||
    (b.country && b.country.toLowerCase().includes(search.toLowerCase()))
  );

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    
    if (!formData.name || !formData.code) {
      setFormError('El nombre y código son obligatorios.');
      setSaving(false);
      return;
    }
    
    try {
      if (editingBrand) {
        await api.put(`brands/${editingBrand.id}/`, formData);
      } else {
        await api.post('brands/', formData);
      }
      setShowForm(false);
      setEditingBrand(null);
      setFormData({ name: '', code: '', description: '', country: '' });
      loadBrands();
    } catch (err) {
      setFormError(`Error al ${editingBrand ? 'actualizar' : 'crear'} marca.`);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (brand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name || '',
      code: brand.code || '',
      description: brand.description || '',
      country: brand.country || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta marca?')) return;
    
    try {
      await api.delete(`brands/${id}/`);
      loadBrands();
    } catch (err) {
      alert('Error al eliminar la marca.');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingBrand(null);
    setFormData({ name: '', code: '', description: '', country: '' });
    setFormError('');
  };

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="display-5 text-secondary">
          <i className="bi bi-award me-2"></i>Marcas
        </h1>
        <button className="btn btn-secondary" onClick={() => setShowForm(true)}>
          <i className="bi bi-plus-circle me-2"></i>Nueva marca
        </button>
      </div>
      
      <div className="row mb-3">
        <div className="col">
          <input
            type="text"
            className="form-control"
            placeholder="Buscar marca por nombre, código o país..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>
      
      {loading && <div className="text-center text-secondary">Cargando...</div>}
      {!loading && error && <div className="text-center text-danger">{error}</div>}
      {!loading && !error && (
        <div className="card shadow">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-secondary">
                  <tr>
                    <th>Nombre</th>
                    <th>Código</th>
                    <th>País</th>
                    <th>Descripción</th>
                    <th width="120">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBrands.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">
                        {brands.length === 0 ? 'No hay marcas registradas' : 'No se encontraron marcas'}
                      </td>
                    </tr>
                  ) : (
                    filteredBrands.map(b => (
                      <tr key={b.id}>
                        <td className="fw-semibold">{b.name}</td>
                        <td><code>{b.code}</code></td>
                        <td>{b.country || 'No especificado'}</td>
                        <td>{b.description || 'Sin descripción'}</td>
                        <td>
                          <div className="btn-group" role="group">
                            <button 
                              className="btn btn-sm btn-outline-primary" 
                              onClick={() => handleEdit(b)}
                              title="Editar"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-danger" 
                              onClick={() => handleDelete(b.id)}
                              title="Eliminar"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {showForm && (
        <div className="modal fade show d-block" style={{background: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-secondary text-white">
                <h5 className="modal-title">
                  <i className={`bi ${editingBrand ? 'bi-pencil' : 'bi-plus-circle'} me-2`}></i>
                  {editingBrand ? 'Editar Marca' : 'Nueva Marca'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={resetForm}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Nombre *</label>
                    <input
                      type="text"
                      name="name"
                      className="form-control"
                      placeholder="Nombre de la marca"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Código *</label>
                    <input
                      type="text"
                      name="code"
                      className="form-control"
                      placeholder="Código de la marca"
                      value={formData.code}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">País</label>
                    <input
                      type="text"
                      name="country"
                      className="form-control"
                      placeholder="País de origen"
                      value={formData.country}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Descripción</label>
                    <textarea
                      name="description"
                      className="form-control"
                      rows="3"
                      placeholder="Descripción de la marca"
                      value={formData.description}
                      onChange={handleChange}
                    />
                  </div>
                  {formError && <div className="alert alert-danger">{formError}</div>}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={resetForm}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-secondary" disabled={saving}>
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        {editingBrand ? 'Actualizando...' : 'Guardando...'}
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-1"></i>
                        {editingBrand ? 'Actualizar' : 'Guardar'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Brands;
