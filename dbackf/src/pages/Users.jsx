import React, { useEffect, useState } from 'react';
import api from '../services/api';

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formData, setFormData] = useState({ 
    email: '', 
    first_name: '', 
    last_name: '',
    is_active: true,
    is_staff: false
  });
  const [formError, setFormError] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    loadUsers();
  }, []);

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape para cerrar modal
      if (e.key === 'Escape') {
        if (showModal) {
          resetForm();
        } else if (showPasswordModal) {
          resetPasswordModal();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showModal, showPasswordModal]);

  const loadUsers = () => {
    setLoading(true);
    api.get('users/')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setUsers(data);
      })
      .catch(() => {
        setUsers([]);
        setError('No se pudo cargar la lista de usuarios.');
      })
      .finally(() => setLoading(false));
  };

  const filteredUsers = users.filter(u =>
    (u.email?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (u.first_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (u.last_name?.toLowerCase() || '').includes(search.toLowerCase())
  );

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));
  const paginatedUsers = filteredUsers.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // Cambiar página si el filtro reduce el total
  React.useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [filteredUsers.length, rowsPerPage]);

  const resetForm = () => {
    setFormData({ 
      email: '', 
      first_name: '', 
      last_name: '',
      is_active: true,
      is_staff: false
    });
    setFormError('');
    setEditMode(false);
    setSelectedUser(null);
    setShowModal(false);
  };

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData({ 
      ...formData, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setFormError('');
    
    if (!formData.email || !formData.first_name || !formData.last_name) {
      setFormError('Todos los campos son obligatorios.');
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setFormError('Por favor ingresa un email válido.');
      return;
    }

    try {
      if (editMode) {
        await api.put(`users/${selectedUser.id}/`, formData);
      } else {
        await api.post('users/', formData);
      }
      resetForm();
      loadUsers();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || 
                      (editMode ? 'Error al actualizar usuario.' : 'Error al crear usuario.');
      setFormError(errorMsg);
    }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      email: user.email || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      is_active: user.is_active !== false,
      is_staff: user.is_staff === true
    });
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al usuario "${user.email}"?`)) {
      return;
    }

    try {
      await api.delete(`users/${user.id}/`);
      loadUsers();
    } catch (err) {
      alert('Error al eliminar usuario. Puede que tenga datos relacionados.');
    }
  };

  const toggleUserStatus = async (user) => {
    try {
      await api.patch(`users/${user.id}/`, { is_active: !user.is_active });
      loadUsers();
    } catch (err) {
      alert('Error al cambiar estado del usuario.');
    }
  };

  const handleResetPassword = (user) => {
    setSelectedUserForPassword(user);
    setNewPassword('');
    setPasswordError('');
    setShowPasswordModal(true);
  };

  const resetPasswordModal = () => {
    setShowPasswordModal(false);
    setSelectedUserForPassword(null);
    setNewPassword('');
    setPasswordError('');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!newPassword) {
      setPasswordError('La nueva contraseña es requerida.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      await api.post(`users/${selectedUserForPassword.id}/reset_password/`, {
        new_password: newPassword
      });
      
      alert(`Contraseña restablecida exitosamente para ${selectedUserForPassword.email}`);
      resetPasswordModal();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Error al restablecer contraseña.';
      setPasswordError(errorMsg);
    }
  };

  return (
    <div className="container py-4 animate__animated animate__fadeIn" style={{ maxWidth: 1200, background: 'linear-gradient(135deg, #e3f2fd 0%, #fff 100%)', borderRadius: 24, boxShadow: '0 4px 32px rgba(33,150,243,0.08)' }}>
      <div className="d-flex justify-content-between align-items-center mb-4 animate__animated animate__fadeInDown">
        <h2 className="text-primary fw-bold" style={{ letterSpacing: 1, textShadow: '0 2px 8px rgba(33,150,243,0.2)' }}>
          <i className="bi bi-people me-2"></i>Gestión de Usuarios
        </h2>
        <button 
          className="btn btn-primary shadow-sm" 
          style={{ borderRadius: 12, fontWeight: 500 }}
          onClick={() => setShowModal(true)}
          title="Crear nuevo usuario"
        >
          <i className="bi bi-person-plus me-1"></i> Nuevo Usuario
        </button>
      </div>

      <div className="alert alert-info mb-3 animate__animated animate__fadeIn" style={{ fontSize: 'clamp(13px, 2vw, 15px)', borderRadius: 12 }}>
        <strong>¿Cómo usar?</strong><br />
        Busca usuarios por nombre, email o usuario. Usa los botones de acción para editar, activar/desactivar o eliminar usuarios.
      </div>

      {/* Controles de búsqueda y filtros */}
      <div className="card mb-3 p-3 shadow-sm animate__animated animate__fadeIn" style={{ borderRadius: 16, background: 'linear-gradient(90deg, #e3f2fd 0%, #fff 100%)' }}>
        <div className="row g-2 align-items-end">
          <div className="col-md-8">
            <label className="form-label mb-1">Buscar usuario</label>
            <div className="position-relative">
              <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
              <input
                type="text"
                className="form-control ps-5"
                placeholder="Buscar por nombre, email o usuario..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ borderRadius: 10 }}
              />
            </div>
          </div>
          <div className="col-md-4">
            <div className="d-flex gap-2 justify-content-end">
              <span className="badge bg-primary" style={{ fontSize: '14px', padding: '8px 12px' }}>
                {filteredUsers.length} usuarios
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Controles de paginación superiores */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <span className="me-2">Mostrar</span>
          <select 
            className="form-select d-inline-block w-auto" 
            value={rowsPerPage} 
            onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
          >
            {[5, 10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <span className="ms-2">usuarios por página</span>
        </div>
        <nav>
          <ul className="pagination mb-0">
            <li className={`page-item${page === 1 ? ' disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage(page - 1)} disabled={page === 1}>Anterior</button>
            </li>
            {[...Array(totalPages)].map((_, i) => (
              <li key={i + 1} className={`page-item${page === i + 1 ? ' active' : ''}`}>
                <button className="page-link" onClick={() => setPage(i + 1)}>{i + 1}</button>
              </li>
            ))}
            <li className={`page-item${page === totalPages ? ' disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage(page + 1)} disabled={page === totalPages}>Siguiente</button>
            </li>
          </ul>
        </nav>
      </div>

      {/* Tabla de usuarios */}
      <div className="card shadow mb-4 animate__animated animate__fadeInUp" style={{ borderRadius: 16 }}>
        <div className="card-body p-0" style={{ overflowX: 'auto', borderRadius: 16 }}>
          {loading ? (
            <div className="text-center text-secondary py-5">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
              <div className="mt-2">Cargando usuarios...</div>
            </div>
          ) : error ? (
            <div className="text-center text-danger py-5">
              <i className="bi bi-exclamation-triangle fs-1"></i>
              <div className="mt-2">{error}</div>
            </div>
          ) : (
            <table className="table table-hover mb-0 align-middle" style={{ borderRadius: 12, minWidth: 700, fontSize: 'clamp(13px, 2vw, 15px)' }}>
              <thead className="table-primary text-center" style={{ fontSize: 15 }}>
                <tr style={{ background: 'linear-gradient(90deg, #e3f2fd 0%, #fff 100%)' }}>
                  <th>Email/Usuario <i className="bi bi-envelope text-primary"></i></th>
                  <th>Nombre Completo <i className="bi bi-person text-primary"></i></th>
                  <th>Estado <i className="bi bi-toggle-on text-primary"></i></th>
                  <th>Tipo <i className="bi bi-shield text-primary"></i></th>
                  <th>Acciones <i className="bi bi-gear text-primary"></i></th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map(u => (
                  <tr key={u.id} className="table-row-hover">
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2" 
                             style={{ width: 35, height: 35, fontSize: 14, fontWeight: 'bold' }}>
                          {(u.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong>{u.email}</strong>
                        </div>
                      </div>
                    </td>
                    <td>{`${u.first_name || ''} ${u.last_name || ''}`.trim() || '-'}</td>
                    <td>
                      <button
                        className={`btn btn-sm ${u.is_active ? 'btn-success' : 'btn-secondary'}`}
                        onClick={() => toggleUserStatus(u)}
                        title={`${u.is_active ? 'Desactivar' : 'Activar'} usuario`}
                        style={{ minWidth: 80 }}
                      >
                        {u.is_active ? (
                          <>
                            <i className="bi bi-check-circle me-1"></i>Activo
                          </>
                        ) : (
                          <>
                            <i className="bi bi-x-circle me-1"></i>Inactivo
                          </>
                        )}
                      </button>
                    </td>
                    <td>
                      <span className={`badge ${u.is_staff ? 'bg-warning text-dark' : 'bg-info'}`}>
                        {u.is_staff ? (
                          <>
                            <i className="bi bi-shield-check me-1"></i>Staff
                          </>
                        ) : (
                          <>
                            <i className="bi bi-person me-1"></i>Usuario
                          </>
                        )}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <button
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => handleEdit(u)}
                          title="Editar usuario"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className="btn btn-outline-warning btn-sm"
                          onClick={() => handleResetPassword(u)}
                          title="Restablecer contraseña"
                        >
                          <i className="bi bi-key"></i>
                        </button>
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => handleDelete(u)}
                          title="Eliminar usuario"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {/* Modal para crear/editar usuario */}
      {showModal && (
        <div 
          className="modal-overlay" 
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '20px' }}
          onClick={(e) => e.target === e.currentTarget && resetForm()}
        >
          <div 
            className="modal-dialog" 
            style={{ maxWidth: 500, width: '100%', maxHeight: '90vh', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', borderRadius: 16, background: '#fff', margin: '0 auto', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content animate__animated animate__fadeIn" style={{ background: '#fff', borderRadius: 16, display: 'flex', flexDirection: 'column', maxHeight: '100%' }}>
              <div className="modal-header" style={{ borderBottom: '1px solid #eee', background: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '16px 20px', flexShrink: 0 }}>
                <h4 className="modal-title mb-0">
                  <i className={`bi ${editMode ? 'bi-pencil' : 'bi-person-plus'} me-2`}></i>
                  {editMode ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h4>
                <button type="button" className="btn-close" onClick={resetForm} style={{ fontSize: '1.2rem', opacity: 0.8 }}></button>
              </div>
              <div className="modal-body" style={{ background: '#fff', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, padding: '20px', overflow: 'auto', flexGrow: 1 }}>
                <form onSubmit={handleSubmit}>
                  <div className="row mb-3">
                    <div className="col-md-12">
                      <label className="form-label">Email *</label>
                      <div className="input-group">
                        <span className="input-group-text"><i className="bi bi-envelope"></i></span>
                        <input
                          type="email"
                          name="email"
                          className="form-control"
                          placeholder="correo@ejemplo.com"
                          value={formData.email}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div className="form-text">
                        <i className="bi bi-info-circle me-1"></i>
                        El email será usado como nombre de usuario
                      </div>
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Nombre *</label>
                      <div className="input-group">
                        <span className="input-group-text"><i className="bi bi-person"></i></span>
                        <input
                          type="text"
                          name="first_name"
                          className="form-control"
                          placeholder="Nombre"
                          value={formData.first_name}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Apellido *</label>
                      <div className="input-group">
                        <span className="input-group-text"><i className="bi bi-person"></i></span>
                        <input
                          type="text"
                          name="last_name"
                          className="form-control"
                          placeholder="Apellido"
                          value={formData.last_name}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <div className="form-check form-switch">
                        <input
                          type="checkbox"
                          name="is_active"
                          className="form-check-input"
                          id="is_active"
                          checked={formData.is_active}
                          onChange={handleChange}
                        />
                        <label className="form-check-label" htmlFor="is_active">
                          <i className="bi bi-toggle-on me-1"></i>Usuario activo
                        </label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-check form-switch">
                        <input
                          type="checkbox"
                          name="is_staff"
                          className="form-check-input"
                          id="is_staff"
                          checked={formData.is_staff}
                          onChange={handleChange}
                        />
                        <label className="form-check-label" htmlFor="is_staff">
                          <i className="bi bi-shield-check me-1"></i>Es staff
                        </label>
                      </div>
                    </div>
                  </div>

                  {formError && (
                    <div className="alert alert-danger mb-3">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      {formError}
                    </div>
                  )}

                  <div className="d-grid gap-2">
                    <button type="submit" className="btn btn-primary">
                      <i className={`bi ${editMode ? 'bi-check-lg' : 'bi-plus-lg'} me-1`}></i>
                      {editMode ? 'Actualizar Usuario' : 'Crear Usuario'}
                    </button>
                    <button type="button" className="btn btn-outline-secondary" onClick={resetForm}>
                      <i className="bi bi-x-lg me-1"></i>
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para restablecer contraseña */}
      {showPasswordModal && (
        <div 
          className="modal-overlay" 
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '20px' }}
          onClick={(e) => e.target === e.currentTarget && resetPasswordModal()}
        >
          <div 
            className="modal-dialog" 
            style={{ maxWidth: 400, width: '100%', maxHeight: '90vh', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', borderRadius: 16, background: '#fff', margin: '0 auto', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content animate__animated animate__fadeIn" style={{ background: '#fff', borderRadius: 16, display: 'flex', flexDirection: 'column', maxHeight: '100%' }}>
              <div className="modal-header" style={{ borderBottom: '1px solid #eee', background: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '16px 20px', flexShrink: 0 }}>
                <h4 className="modal-title mb-0">
                  <i className="bi bi-key me-2"></i>
                  Restablecer Contraseña
                </h4>
                <button type="button" className="btn-close" onClick={resetPasswordModal} style={{ fontSize: '1.2rem', opacity: 0.8 }}></button>
              </div>
              <div className="modal-body" style={{ background: '#fff', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, padding: '20px', overflow: 'auto', flexGrow: 1 }}>
                <div className="alert alert-info mb-3">
                  <i className="bi bi-info-circle me-2"></i>
                  Vas a restablecer la contraseña para: <strong>{selectedUserForPassword?.email}</strong>
                </div>
                
                <form onSubmit={handlePasswordSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Nueva Contraseña *</label>
                    <div className="input-group">
                      <span className="input-group-text"><i className="bi bi-lock"></i></span>
                      <input
                        type="password"
                        className="form-control"
                        placeholder="Mínimo 6 caracteres"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                    <div className="form-text">
                      <i className="bi bi-shield-check me-1"></i>
                      La contraseña debe tener al menos 6 caracteres
                    </div>
                  </div>

                  {passwordError && (
                    <div className="alert alert-danger mb-3">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      {passwordError}
                    </div>
                  )}

                  <div className="d-grid gap-2">
                    <button type="submit" className="btn btn-warning">
                      <i className="bi bi-key me-1"></i>
                      Restablecer Contraseña
                    </button>
                    <button type="button" className="btn btn-outline-secondary" onClick={resetPasswordModal}>
                      <i className="bi bi-x-lg me-1"></i>
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;
