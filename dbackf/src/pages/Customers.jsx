import React, { useState, useEffect } from 'react';
import api from '../services/api';

function Customers() {
  console.log('🔍 Customers component iniciando...');
  
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estados para el modal de cliente
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    code: '',
    customer_type: 1,
    business: 1 // Asumiendo business ID 1 por defecto
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  
  // Estados para búsqueda y filtros
  const [search, setSearch] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState([]);

  console.log('🔍 Estados inicializados:', { 
    customers: Array.isArray(customers), 
    filteredCustomers: Array.isArray(filteredCustomers) 
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    // Filtrar clientes cuando cambie la búsqueda
    if (!Array.isArray(customers)) {
      setFilteredCustomers([]);
      return;
    }
    
    if (search.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.name?.toLowerCase().includes(search.toLowerCase()) ||
        customer.email?.toLowerCase().includes(search.toLowerCase()) ||
        customer.phone?.includes(search)
      );
      setFilteredCustomers(filtered);
    }
  }, [customers, search]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/customers/');
      
      // Asegurar que data es un array
      const customersArray = Array.isArray(response.data) ? response.data : [];
      setCustomers(customersArray);
      setError('');
      
      console.log('Customers loaded:', customersArray);
    } catch (err) {
      console.error('Error loading customers:', err);
      setError('Error al cargar clientes');
      // En caso de error, asegurar que customers sea un array vacío
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  // Funciones del modal
  const openCreateModal = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      code: '',
      customer_type: 1,
      business: 1
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      code: customer.code || '',
      customer_type: customer.customer_type || 1,
      business: customer.business || 1
    });
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      code: '',
      customer_type: 1,
      business: 1
    });
    setFormErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'El nombre es requerido';
    }
    
    if (!formData.code.trim()) {
      errors.code = 'El código es requerido';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'El formato del email no es válido';
    }
    
    if (!formData.phone.trim()) {
      errors.phone = 'El teléfono es requerido';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      
      console.log('📤 Enviando datos del cliente:', formData);
      
      if (editingCustomer) {
        // Actualizar cliente existente
        console.log('📝 Actualizando cliente ID:', editingCustomer.id);
        await api.put(`/customers/${editingCustomer.id}/`, formData);
      } else {
        // Crear nuevo cliente
        console.log('🆕 Creando nuevo cliente');
        const response = await api.post('/customers/', formData);
        console.log('✅ Cliente creado exitosamente:', response.data);
      }
      
      closeModal();
      await loadCustomers(); // Recargar la lista
      
    } catch (err) {
      console.error('❌ Error saving customer:', err);
      console.error('📋 Response data:', err.response?.data);
      console.error('📋 Response status:', err.response?.status);
      console.error('📋 Response headers:', err.response?.headers);
      setError(editingCustomer ? 'Error al actualizar cliente' : 'Error al crear cliente');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (customerId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
      return;
    }

    try {
      await api.delete(`/customers/${customerId}/`);
      await loadCustomers(); // Recargar la lista
    } catch (err) {
      console.error('Error deleting customer:', err);
      setError('Error al eliminar cliente');
    }
  };

  // Función para obtener la clase CSS del badge según el nivel
  const getLevelBadgeClass = (level) => {
    switch (level) {
      case 1:
        return 'bg-secondary';
      case 2:
        return 'bg-primary';
      case 3:
        return 'bg-warning text-dark';
      case 4:
        return 'bg-success';
      default:
        return 'bg-secondary';
    }
  };

  return (
    <div className="container py-5">
      {console.log('🔍 Renderizando Customers:', { 
        customers: Array.isArray(customers) ? customers.length : 'NO ES ARRAY', 
        filteredCustomers: Array.isArray(filteredCustomers) ? filteredCustomers.length : 'NO ES ARRAY',
        customersType: typeof customers,
        filteredCustomersType: typeof filteredCustomers
      })}
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="display-5 mb-0 text-primary">
          👥 Clientes
        </h1>
        <div className="d-flex align-items-center gap-3">
          <div className="text-center">
            <div className="h4 mb-0 text-primary">{Array.isArray(customers) ? customers.length : 0}</div>
            <small className="text-muted">Total</small>
          </div>
          <button 
            className="btn btn-primary btn-lg"
            onClick={openCreateModal}
          >
            <i className="fas fa-plus me-2"></i>
            Nuevo Cliente
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center" role="alert">
          ⚠️ {error}
        </div>
      )}

      {/* Barra de búsqueda */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="input-group">
            <span className="input-group-text">
              <i className="fas fa-search"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar cliente por nombre, email o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3 text-muted">Cargando clientes...</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered table-hover">
            <thead className="table-primary">
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Dirección</th>
                <th>Nivel</th>
                <th width="150">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!Array.isArray(filteredCustomers) || filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted">
                    {search ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(customer => (
                  <tr key={customer.id}>
                    <td><strong>{customer.name}</strong></td>
                    <td>{customer.email || 'Sin email'}</td>
                    <td>{customer.phone || 'Sin teléfono'}</td>
                    <td>{customer.address || 'Sin dirección'}</td>
                    <td>
                      <span className={`badge ${getLevelBadgeClass(customer.level)}`}>
                        Nivel {customer.level || 1}
                      </span>
                    </td>
                    <td>
                      <div className="btn-group" role="group">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => openEditModal(customer)}
                          title="Editar cliente"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(customer.id)}
                          title="Eliminar cliente"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para crear/editar cliente */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
                </h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="name" className="form-label">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Nombre completo del cliente"
                    />
                    {formErrors.name && (
                      <div className="invalid-feedback">
                        {formErrors.name}
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="code" className="form-label">
                      Código *
                    </label>
                    <input
                      type="text"
                      className={`form-control ${formErrors.code ? 'is-invalid' : ''}`}
                      id="code"
                      name="code"
                      value={formData.code}
                      onChange={handleInputChange}
                      placeholder="Código único del cliente"
                    />
                    {formErrors.code && (
                      <div className="invalid-feedback">
                        {formErrors.code}
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">
                      Email *
                    </label>
                    <input
                      type="email"
                      className={`form-control ${formErrors.email ? 'is-invalid' : ''}`}
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="correo@ejemplo.com"
                    />
                    {formErrors.email && (
                      <div className="invalid-feedback">
                        {formErrors.email}
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="phone" className="form-label">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      className={`form-control ${formErrors.phone ? 'is-invalid' : ''}`}
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Número de teléfono"
                    />
                    {formErrors.phone && (
                      <div className="invalid-feedback">
                        {formErrors.phone}
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="address" className="form-label">
                      Dirección
                    </label>
                    <textarea
                      className="form-control"
                      id="address"
                      name="address"
                      rows="3"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Dirección completa (opcional)"
                    ></textarea>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="level" className="form-label">
                      Nivel de Cliente *
                    </label>
                    <select
                      className="form-select"
                      id="level"
                      name="level"
                      value={formData.level}
                      onChange={handleInputChange}
                    >
                      <option value={1}>Nivel 1 - Básico</option>
                      <option value={2}>Nivel 2 - Estándar</option>
                      <option value={3}>Nivel 3 - Premium</option>
                      <option value={4}>Nivel 4 - VIP</option>
                    </select>
                    <div className="form-text">
                      <small className="text-muted">
                        <i className="fas fa-info-circle me-1"></i>
                        El nivel determina los descuentos y beneficios del cliente
                      </small>
                    </div>
                  </div>
                </div>
                
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Guardando...
                      </>
                    ) : (
                      editingCustomer ? 'Actualizar' : 'Crear Cliente'
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

export default Customers;