
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import useDocumentTitle from '../hooks/useDocumentTitle';
import '../styles/Warehouses.css';

function Warehouses() {
  // Hook para cambiar el título de la pestaña
  useDocumentTitle('Almacenes - Maestro Inventario');
  
  // Estados principales
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Estados de filtros y búsqueda
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive
  const [viewMode, setViewMode] = useState('cards'); // cards, table
  
  // Estados de paginación
  const [page, setPage] = useState(1);
  const pageSize = 6;
  
  // Estados del formulario
  const [showModal, setShowModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    code: '', 
    address: '', 
    description: '',
    is_active: true 
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Estados de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState(null);
  
  // Estados de exportación
  const [exporting, setExporting] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    loadWarehouses();
  }, []);

  // Auto-ocultar mensajes de éxito
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Shortcuts de teclado
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            handleNew();
            break;
          case 'f':
            e.preventDefault();
            document.querySelector('#warehouse-search')?.focus();
            break;
          case 'e':
            e.preventDefault();
            handleExport();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  const loadWarehouses = async () => {
    setLoading(true);
    try {
      const res = await api.get('warehouses/');
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setWarehouses(data);
      setError('');
    } catch (err) {
      setWarehouses([]);
      setError('No se pudo cargar la lista de almacenes.');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar y paginar almacenes
  const filteredWarehouses = warehouses.filter(w => {
    const matchesSearch = !search || 
      w.name?.toLowerCase().includes(search.toLowerCase()) ||
      w.code?.toLowerCase().includes(search.toLowerCase()) ||
      w.address?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && w.is_active) ||
      (statusFilter === 'inactive' && !w.is_active);
    
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredWarehouses.length / pageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const paginatedWarehouses = filteredWarehouses.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Manejo del formulario
  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData({ 
      ...formData, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };

  const resetForm = () => {
    setFormData({ name: '', code: '', address: '', description: '', is_active: true });
    setFormError('');
    setEditingWarehouse(null);
  };

  const handleNew = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (warehouse) => {
    setFormData({
      name: warehouse.name || '',
      code: warehouse.code || '',
      address: warehouse.address || '',
      description: warehouse.description || '',
      is_active: warehouse.is_active !== false
    });
    setEditingWarehouse(warehouse);
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    // Validaciones
    if (!formData.name.trim() || !formData.code.trim()) {
      setFormError('El nombre y código son obligatorios.');
      setSubmitting(false);
      return;
    }

    // Validar código único
    const existingWarehouse = warehouses.find(w => 
      w.code.toLowerCase() === formData.code.toLowerCase() && 
      w.id !== editingWarehouse?.id
    );
    if (existingWarehouse) {
      setFormError('Ya existe un almacén con este código.');
      setSubmitting(false);
      return;
    }

    try {
      if (editingWarehouse) {
        await api.put(`warehouses/${editingWarehouse.id}/`, formData);
        setSuccessMessage('Almacén actualizado exitosamente');
      } else {
        await api.post('warehouses/', formData);
        setSuccessMessage('Almacén creado exitosamente');
      }
      
      setShowModal(false);
      resetForm();
      await loadWarehouses();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 
                      err.response?.data?.message ||
                      `Error al ${editingWarehouse ? 'actualizar' : 'crear'} almacén.`;
      setFormError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (warehouse) => {
    setWarehouseToDelete(warehouse);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!warehouseToDelete) return;
    
    try {
      await api.delete(`warehouses/${warehouseToDelete.id}/`);
      setSuccessMessage('Almacén eliminado exitosamente');
      setShowDeleteModal(false);
      setWarehouseToDelete(null);
      await loadWarehouses();
    } catch (err) {
      setError('Error al eliminar el almacén. Puede que tenga productos asociados.');
      setShowDeleteModal(false);
    }
  };

  const toggleStatus = async (warehouse) => {
    try {
      await api.patch(`warehouses/${warehouse.id}/`, { 
        is_active: !warehouse.is_active 
      });
      setSuccessMessage(`Almacén ${!warehouse.is_active ? 'activado' : 'desactivado'} exitosamente`);
      await loadWarehouses();
    } catch (err) {
      setError('Error al cambiar el estado del almacén.');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // Simular exportación - aquí podrías implementar la lógica real
      const csvContent = [
        ['Nombre', 'Código', 'Dirección', 'Estado', 'Fecha de Creación'],
        ...filteredWarehouses.map(w => [
          w.name,
          w.code,
          w.address || '',
          w.is_active ? 'Activo' : 'Inactivo',
          new Date(w.created_at).toLocaleDateString()
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `almacenes_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      setSuccessMessage('Exportación completada exitosamente');
    } catch (err) {
      setError('Error al exportar los datos.');
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (isActive) => {
    return isActive ? (
      <span className="badge bg-success">
        <i className="bi bi-check-circle me-1"></i>Activo
      </span>
    ) : (
      <span className="badge bg-secondary">
        <i className="bi bi-pause-circle me-1"></i>Inactivo
      </span>
    );
  };

  return (
    <div className="container-fluid py-4">
      {/* CSS Styles */}
      <style>{`
        .warehouse-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        }
        .warehouse-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
        .warehouse-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 12px 12px 0 0;
        }
        .status-active {
          background: linear-gradient(45deg, #4CAF50, #45a049);
        }
        .status-inactive {
          background: linear-gradient(45deg, #9E9E9E, #757575);
        }
        .search-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .stats-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 12px;
        }
        .fade-in {
          animation: fadeIn 0.5s ease-in;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .tooltip-text {
          position: absolute;
          bottom: 125%;
          left: 50%;
          transform: translateX(-50%);
          background-color: #333;
          color: white;
          padding: 5px 8px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s;
          z-index: 1000;
        }
        .tooltip-container:hover .tooltip-text {
          opacity: 1;
          visibility: visible;
        }
      `}</style>

      {/* Header con estadísticas */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h1 className="display-6 fw-bold text-primary mb-1">
                <i className="bi bi-building me-3"></i>
                Gestión de Almacenes
              </h1>
              <p className="text-muted mb-0">
                Administra tus almacenes y ubicaciones de inventario
                <small className="ms-2 text-info">
                  <i className="bi bi-info-circle me-1"></i>
                  Ctrl+N: Nuevo | Ctrl+F: Buscar | Ctrl+E: Exportar
                </small>
              </p>
            </div>
          </div>

          {/* Estadísticas rápidas */}
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <div className="stats-card p-3 text-center">
                <div className="h2 mb-1">
                  <i className="bi bi-building"></i>
                  <span className="ms-2">{warehouses.length}</span>
                </div>
                <div className="small">Total Almacenes</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-success text-white p-3 text-center" style={{borderRadius: 12}}>
                <div className="h2 mb-1">
                  <i className="bi bi-check-circle"></i>
                  <span className="ms-2">{warehouses.filter(w => w.is_active).length}</span>
                </div>
                <div className="small">Almacenes Activos</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-secondary text-white p-3 text-center" style={{borderRadius: 12}}>
                <div className="h2 mb-1">
                  <i className="bi bi-pause-circle"></i>
                  <span className="ms-2">{warehouses.filter(w => !w.is_active).length}</span>
                </div>
                <div className="small">Almacenes Inactivos</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-info text-white p-3 text-center" style={{borderRadius: 12}}>
                <div className="h2 mb-1">
                  <i className="bi bi-funnel"></i>
                  <span className="ms-2">{filteredWarehouses.length}</span>
                </div>
                <div className="small">Resultados Filtrados</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mensajes de feedback */}
      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <i className="bi bi-check-circle me-2"></i>
          {successMessage}
          <button type="button" className="btn-close" onClick={() => setSuccessMessage('')}></button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {/* Barra de herramientas */}
      <div className="search-container p-4 mb-4">
        <div className="row g-3 align-items-center">
          <div className="col-md-4">
            <div className="input-group">
              <span className="input-group-text">
                <i className="bi bi-search"></i>
              </span>
              <input
                id="warehouse-search"
                type="text"
                className="form-control"
                placeholder="Buscar almacenes..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              {search && (
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                >
                  <i className="bi bi-x"></i>
                </button>
              )}
            </div>
          </div>
          
          <div className="col-md-2">
            <select
              className="form-select"
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">Todos los estados</option>
              <option value="active">Solo activos</option>
              <option value="inactive">Solo inactivos</option>
            </select>
          </div>

          <div className="col-md-2">
            <div className="btn-group w-100" role="group">
              <button
                type="button"
                className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setViewMode('cards')}
                title="Vista de tarjetas"
              >
                <i className="bi bi-grid-3x3-gap"></i>
              </button>
              <button
                type="button"
                className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setViewMode('table')}
                title="Vista de tabla"
              >
                <i className="bi bi-table"></i>
              </button>
            </div>
          </div>

          <div className="col-md-4 text-end">
            <div className="btn-group">
              <button
                className="btn btn-outline-success tooltip-container position-relative"
                onClick={handleExport}
                disabled={exporting || filteredWarehouses.length === 0}
              >
                {exporting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Exportando...
                  </>
                ) : (
                  <>
                    <i className="bi bi-download me-1"></i>
                    Exportar CSV
                  </>
                )}
                <span className="tooltip-text">Ctrl+E</span>
              </button>
              
              <button
                className="btn btn-primary tooltip-container position-relative"
                onClick={handleNew}
              >
                <i className="bi bi-plus-lg me-1"></i>
                Nuevo Almacén
                <span className="tooltip-text">Ctrl+N</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filtros activos */}
        {(search || statusFilter !== 'all') && (
          <div className="mt-3 d-flex align-items-center gap-2">
            <small className="text-muted">Filtros activos:</small>
            {search && (
              <span className="badge bg-info">
                Búsqueda: "{search}"
                <button
                  className="btn-close btn-close-white ms-1"
                  style={{fontSize: '10px'}}
                  onClick={() => setSearch('')}
                ></button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="badge bg-info">
                Estado: {statusFilter === 'active' ? 'Activos' : 'Inactivos'}
                <button
                  className="btn-close btn-close-white ms-1"
                  style={{fontSize: '10px'}}
                  onClick={() => setStatusFilter('all')}
                ></button>
              </span>
            )}
            <button
              className="btn btn-link btn-sm text-decoration-none"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setPage(1);
              }}
            >
              Limpiar todos
            </button>
          </div>
        )}
      </div>

      {/* Contenido principal */}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}}></div>
          <div className="h5 text-muted">Cargando almacenes...</div>
        </div>
      )}

      {!loading && filteredWarehouses.length === 0 && (
        <div className="text-center py-5">
          <i className="bi bi-building display-1 text-muted"></i>
          <h4 className="text-muted mt-3">
            {search || statusFilter !== 'all' ? 'No se encontraron almacenes' : 'No hay almacenes registrados'}
          </h4>
          <p className="text-muted">
            {search || statusFilter !== 'all' 
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Comienza creando tu primer almacén'
            }
          </p>
          {!search && statusFilter === 'all' && (
            <button className="btn btn-primary mt-2" onClick={handleNew}>
              <i className="bi bi-plus-lg me-1"></i>
              Crear primer almacén
            </button>
          )}
        </div>
      )}

      {!loading && filteredWarehouses.length > 0 && (
        <>
          {/* Vista de tarjetas */}
          {viewMode === 'cards' && (
            <div className="row g-4">
              {paginatedWarehouses.map(warehouse => (
                <div key={warehouse.id} className="col-lg-4 col-md-6 fade-in">
                  <div className="card warehouse-card h-100">
                    <div className={`warehouse-header p-3 ${warehouse.is_active ? 'status-active' : 'status-inactive'}`}>
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h5 className="mb-1 fw-bold">{warehouse.name}</h5>
                          <div className="d-flex align-items-center">
                            <span className="badge bg-light text-dark me-2">
                              <i className="bi bi-tag me-1"></i>
                              {warehouse.code}
                            </span>
                            {getStatusBadge(warehouse.is_active)}
                          </div>
                        </div>
                        <div className="dropdown">
                          <button
                            className="btn btn-link text-white p-0"
                            data-bs-toggle="dropdown"
                          >
                            <i className="bi bi-three-dots-vertical"></i>
                          </button>
                          <ul className="dropdown-menu">
                            <li>
                              <button
                                className="dropdown-item"
                                onClick={() => handleEdit(warehouse)}
                              >
                                <i className="bi bi-pencil me-2"></i>Editar
                              </button>
                            </li>
                            <li>
                              <button
                                className="dropdown-item"
                                onClick={() => toggleStatus(warehouse)}
                              >
                                <i className={`bi bi-${warehouse.is_active ? 'pause' : 'play'}-circle me-2`}></i>
                                {warehouse.is_active ? 'Desactivar' : 'Activar'}
                              </button>
                            </li>
                            <li><hr className="dropdown-divider" /></li>
                            <li>
                              <button
                                className="dropdown-item text-danger"
                                onClick={() => handleDelete(warehouse)}
                              >
                                <i className="bi bi-trash me-2"></i>Eliminar
                              </button>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <div className="card-body">
                      <div className="mb-3">
                        <div className="d-flex align-items-center text-muted mb-2">
                          <i className="bi bi-geo-alt me-2"></i>
                          <span className="small">Dirección</span>
                        </div>
                        <p className="mb-0 text-truncate" title={warehouse.address}>
                          {warehouse.address || 'Sin dirección especificada'}
                        </p>
                      </div>
                      
                      {warehouse.description && (
                        <div className="mb-3">
                          <div className="d-flex align-items-center text-muted mb-2">
                            <i className="bi bi-info-circle me-2"></i>
                            <span className="small">Descripción</span>
                          </div>
                          <p className="mb-0 small text-muted" style={{maxHeight: '3em', overflow: 'hidden'}}>
                            {warehouse.description}
                          </p>
                        </div>
                      )}
                      
                      <div className="d-flex justify-content-between align-items-center small text-muted">
                        <span>
                          <i className="bi bi-calendar me-1"></i>
                          {new Date(warehouse.created_at).toLocaleDateString()}
                        </span>
                        <span>
                          <i className="bi bi-clock me-1"></i>
                          {new Date(warehouse.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="card-footer bg-transparent border-0 pt-0">
                      <div className="d-grid gap-2 d-md-flex">
                        <button
                          className="btn btn-outline-primary btn-sm flex-fill"
                          onClick={() => handleEdit(warehouse)}
                        >
                          <i className="bi bi-pencil me-1"></i>
                          Editar
                        </button>
                        <button
                          className={`btn btn-sm flex-fill ${warehouse.is_active ? 'btn-outline-warning' : 'btn-outline-success'}`}
                          onClick={() => toggleStatus(warehouse)}
                        >
                          <i className={`bi bi-${warehouse.is_active ? 'pause' : 'play'}-circle me-1`}></i>
                          {warehouse.is_active ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Vista de tabla */}
          {viewMode === 'table' && (
            <div className="card">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Nombre</th>
                      <th>Código</th>
                      <th>Dirección</th>
                      <th>Estado</th>
                      <th>Fecha Creación</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedWarehouses.map(warehouse => (
                      <tr key={warehouse.id}>
                        <td>
                          <div className="fw-bold">{warehouse.name}</div>
                          {warehouse.description && (
                            <small className="text-muted">{warehouse.description}</small>
                          )}
                        </td>
                        <td>
                          <span className="badge bg-secondary">{warehouse.code}</span>
                        </td>
                        <td>
                          <span className="text-truncate d-inline-block" style={{maxWidth: '200px'}} title={warehouse.address}>
                            {warehouse.address || '-'}
                          </span>
                        </td>
                        <td>{getStatusBadge(warehouse.is_active)}</td>
                        <td>
                          <small>{new Date(warehouse.created_at).toLocaleDateString()}</small>
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-primary"
                              onClick={() => handleEdit(warehouse)}
                              title="Editar"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              className={`btn ${warehouse.is_active ? 'btn-outline-warning' : 'btn-outline-success'}`}
                              onClick={() => toggleStatus(warehouse)}
                              title={warehouse.is_active ? 'Desactivar' : 'Activar'}
                            >
                              <i className={`bi bi-${warehouse.is_active ? 'pause' : 'play'}-circle`}></i>
                            </button>
                            <button
                              className="btn btn-outline-danger"
                              onClick={() => handleDelete(warehouse)}
                              title="Eliminar"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <nav className="mt-4">
              <ul className="pagination justify-content-center">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <i className="bi bi-chevron-left"></i>
                  </button>
                </li>
                
                {[...Array(totalPages)].map((_, i) => (
                  <li key={i + 1} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  </li>
                ))}
                
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <i className="bi bi-chevron-right"></i>
                  </button>
                </li>
              </ul>
              
              <div className="text-center mt-2">
                <small className="text-muted">
                  Mostrando {Math.min((currentPage - 1) * pageSize + 1, filteredWarehouses.length)} - {Math.min(currentPage * pageSize, filteredWarehouses.length)} de {filteredWarehouses.length} almacenes
                </small>
              </div>
            </nav>
          )}
        </>
      )}

      {/* Modal de formulario */}
      {showModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className={`bi bi-${editingWarehouse ? 'pencil' : 'plus-lg'} me-2`}></i>
                  {editingWarehouse ? 'Editar Almacén' : 'Nuevo Almacén'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-bold">
                        <i className="bi bi-building me-1"></i>
                        Nombre del Almacén *
                      </label>
                      <input
                        type="text"
                        name="name"
                        className="form-control"
                        placeholder="Ej: Almacén Principal"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        autoFocus
                      />
                    </div>
                    
                    <div className="col-md-6">
                      <label className="form-label fw-bold">
                        <i className="bi bi-tag me-1"></i>
                        Código *
                      </label>
                      <input
                        type="text"
                        name="code"
                        className="form-control"
                        placeholder="Ej: ALM001"
                        value={formData.code}
                        onChange={handleChange}
                        style={{textTransform: 'uppercase'}}
                        required
                      />
                      <div className="form-text">
                        <i className="bi bi-info-circle me-1"></i>
                        Código único para identificar el almacén
                      </div>
                    </div>
                    
                    <div className="col-12">
                      <label className="form-label fw-bold">
                        <i className="bi bi-geo-alt me-1"></i>
                        Dirección
                      </label>
                      <input
                        type="text"
                        name="address"
                        className="form-control"
                        placeholder="Dirección completa del almacén"
                        value={formData.address}
                        onChange={handleChange}
                      />
                    </div>
                    
                    <div className="col-12">
                      <label className="form-label fw-bold">
                        <i className="bi bi-info-circle me-1"></i>
                        Descripción
                      </label>
                      <textarea
                        name="description"
                        className="form-control"
                        rows={3}
                        placeholder="Descripción opcional del almacén..."
                        value={formData.description}
                        onChange={handleChange}
                      />
                    </div>
                    
                    <div className="col-12">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          name="is_active"
                          id="warehouseActive"
                          checked={formData.is_active}
                          onChange={handleChange}
                        />
                        <label className="form-check-label fw-bold" htmlFor="warehouseActive">
                          <i className="bi bi-toggle-on me-1"></i>
                          Almacén Activo
                        </label>
                        <div className="form-text">
                          Los almacenes inactivos no aparecerán en las operaciones
                        </div>
                      </div>
                    </div>
                  </div>

                  {formError && (
                    <div className="alert alert-danger mt-3">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      {formError}
                    </div>
                  )}
                </div>
                
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
                  >
                    <i className="bi bi-x-lg me-1"></i>
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        {editingWarehouse ? 'Actualizando...' : 'Creando...'}
                      </>
                    ) : (
                      <>
                        <i className={`bi bi-${editingWarehouse ? 'check-lg' : 'plus-lg'} me-1`}></i>
                        {editingWarehouse ? 'Actualizar Almacén' : 'Crear Almacén'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && warehouseToDelete && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header border-0">
                <h5 className="modal-title text-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Confirmar Eliminación
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDeleteModal(false)}
                ></button>
              </div>
              
              <div className="modal-body text-center">
                <div className="mb-3">
                  <i className="bi bi-building text-danger" style={{fontSize: '3rem'}}></i>
                </div>
                <h6>¿Estás seguro que deseas eliminar este almacén?</h6>
                <div className="alert alert-warning mt-3">
                  <div className="fw-bold">{warehouseToDelete.name}</div>
                  <div className="small text-muted">Código: {warehouseToDelete.code}</div>
                </div>
                <p className="text-muted small">
                  <i className="bi bi-info-circle me-1"></i>
                  Esta acción no se puede deshacer. Si el almacén tiene productos asociados, la eliminación fallará.
                </p>
              </div>
              
              <div className="modal-footer border-0 justify-content-center">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteModal(false)}
                >
                  <i className="bi bi-x-lg me-1"></i>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={confirmDelete}
                >
                  <i className="bi bi-trash me-1"></i>
                  Sí, Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Warehouses;
