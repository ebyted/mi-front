
// Versión limpia y única con CRUD completo
import React, { useState, useEffect } from 'react';
import api from '../services/api';

function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', code: '' });
  const [formError, setFormError] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = () => {
    setLoading(true);
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
  };

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.code && c.code.toLowerCase().includes(search.toLowerCase()))
  );

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    
    if (!formData.name) {
      setFormError('El nombre es obligatorio.');
      setSaving(false);
      return;
    }
    
    try {
      if (editingCategory) {
        await api.put(`categories/${editingCategory.id}/`, formData);
      } else {
        await api.post('categories/', formData);
      }
      setShowForm(false);
      setEditingCategory(null);
      setFormData({ name: '', description: '', code: '' });
      loadCategories();
    } catch (err) {
      setFormError(`Error al ${editingCategory ? 'actualizar' : 'crear'} categoría.`);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      description: category.description || '',
      code: category.code || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta categoría?')) return;
    
    try {
      await api.delete(`categories/${id}/`);
      loadCategories();
    } catch (err) {
      alert('Error al eliminar la categoría.');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '', code: '' });
    setFormError('');
  };

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="display-5 text-warning">
          <i className="bi bi-tags me-2"></i>Categorías
        </h1>
        <button className="btn btn-warning" onClick={() => setShowForm(true)}>
          <i className="bi bi-plus-circle me-2"></i>Nueva categoría
        </button>
      </div>
      
      <div className="row mb-3">
        <div className="col">
          <input
            type="text"
            className="form-control"
            placeholder="Buscar categoría por nombre o código..."
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
                <thead className="table-warning">
                  <tr>
                    <th>Nombre</th>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th width="120">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-4 text-muted">
                        {categories.length === 0 ? 'No hay categorías registradas' : 'No se encontraron categorías'}
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map(c => (
                      <tr key={c.id}>
                        <td className="fw-semibold">{c.name}</td>
                        <td><code>{c.code || 'Sin código'}</code></td>
                        <td>{c.description || 'Sin descripción'}</td>
                        <td>
                          <div className="btn-group" role="group">
                            <button 
                              className="btn btn-sm btn-outline-primary" 
                              onClick={() => handleEdit(c)}
                              title="Editar"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-danger" 
                              onClick={() => handleDelete(c.id)}
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
              <div className="modal-header bg-warning text-white">
                <h5 className="modal-title">
                  <i className={`bi ${editingCategory ? 'bi-pencil' : 'bi-plus-circle'} me-2`}></i>
                  {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
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
                      placeholder="Nombre de la categoría"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Código</label>
                    <input
                      type="text"
                      name="code"
                      className="form-control"
                      placeholder="Código de la categoría"
                      value={formData.code}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Descripción</label>
                    <textarea
                      name="description"
                      className="form-control"
                      rows="3"
                      placeholder="Descripción de la categoría"
                      value={formData.description}
                      onChange={handleChange}
                    />
                  </div>
                  {formError && <div className="alert alert-danger">{formError}</div>}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={resetForm}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-warning" disabled={saving}>
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        {editingCategory ? 'Actualizando...' : 'Guardando...'}
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-1"></i>
                        {editingCategory ? 'Actualizar' : 'Guardar'}
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

export default Categories;
