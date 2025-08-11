import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Table,
  Modal,
  Form,
  Alert,
  InputGroup,
  Badge,
  Spinner
} from 'react-bootstrap';
import { PlusCircle, Search, Edit, Trash2, User, Mail, Phone, MapPin } from 'lucide-react';
import api from '../services/api';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [customerTypes, setCustomerTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    address: '',
    is_active: true,
    customer_type: ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      email: '',
      phone: '',
      address: '',
      is_active: true,
      customer_type: ''
    });
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/customers/');
      setCustomers(response.data);
      setFilteredCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setError('Error al cargar los clientes');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerTypes = async () => {
    try {
      const response = await api.get('/customer-types/');
      setCustomerTypes(response.data);
    } catch (error) {
      console.error('Error fetching customer types:', error);
      setError('Error al cargar los tipos de clientes');
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchCustomerTypes();
  }, []);

  // Filtrar clientes por término de búsqueda
  useEffect(() => {
    if (!searchTerm) {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm)
      );
      setFilteredCustomers(filtered);
    }
  }, [searchTerm, customers]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');

      if (isEditing) {
        await api.put(`/customers/${formData.id}/`, formData);
        setSuccess('Cliente actualizado exitosamente');
      } else {
        await api.post('/customers/', formData);
        setSuccess('Cliente creado exitosamente');
      }

      fetchCustomers();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving customer:', error);
      setError(error.response?.data?.message || 'Error al guardar el cliente');
    }
  };

  const handleEdit = (customer) => {
    setFormData({
      id: customer.id,
      name: customer.name,
      code: customer.code,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      is_active: customer.is_active,
      customer_type: customer.customer_type
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
      try {
        await api.delete(`/customers/${id}/`);
        setSuccess('Cliente eliminado exitosamente');
        fetchCustomers();
      } catch (error) {
        console.error('Error deleting customer:', error);
        setError('Error al eliminar el cliente');
      }
    }
  };

  const getCustomerTypeName = (customerTypeId) => {
    const type = customerTypes.find(ct => ct.id === customerTypeId);
    return type ? `Level ${type.level} (${type.discount_percentage}%)` : 'N/A';
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-0">
                <User size={28} className="me-2" />
                Gestión de Clientes
              </h2>
              <p className="text-muted mb-0">Administra tu base de clientes</p>
            </div>
            <Button variant="primary" onClick={openCreateModal}>
              <PlusCircle size={20} className="me-2" />
              Nuevo Cliente
            </Button>
          </div>
        </Col>
      </Row>

      {/* Alerts */}
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Search */}
      <Row className="mb-4">
        <Col md={6}>
          <InputGroup>
            <InputGroup.Text>
              <Search size={20} />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Buscar por nombre, código, email o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={6} className="text-end">
          <span className="text-muted">
            Mostrando {filteredCustomers.length} de {customers.length} clientes
          </span>
        </Col>
      </Row>

      {/* Table */}
      <Card>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Cargando...</span>
              </Spinner>
            </div>
          ) : (
            <Table responsive hover className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      {searchTerm ? 'No se encontraron clientes con ese criterio' : 'No hay clientes registrados'}
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <span className="fw-bold text-primary">{customer.code}</span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <User size={16} className="me-2 text-muted" />
                          {customer.name}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <Mail size={16} className="me-2 text-muted" />
                          {customer.email}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <Phone size={16} className="me-2 text-muted" />
                          {customer.phone || 'N/A'}
                        </div>
                      </td>
                      <td>
                        <Badge bg="info">
                          {getCustomerTypeName(customer.customer_type)}
                        </Badge>
                      </td>
                      <td>
                        <Badge bg={customer.is_active ? 'success' : 'secondary'}>
                          {customer.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="text-center">
                        <div className="d-flex gap-2 justify-content-center">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleEdit(customer)}
                            title="Editar"
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(customer.id)}
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <User size={24} className="me-2" />
            {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Código *</Form.Label>
                  <Form.Control
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    required
                    placeholder="Ej: CLI001"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nombre *</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Nombre completo del cliente"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email *</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="cliente@ejemplo.com"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Teléfono</Form.Label>
                  <Form.Control
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+52 123 456 7890"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tipo de Cliente *</Form.Label>
                  <Form.Select
                    name="customer_type"
                    value={formData.customer_type}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Seleccionar tipo...</option>
                    {customerTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        Level {type.level} - {type.discount_percentage}% descuento
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <div className="d-flex align-items-center mt-4">
                    <Form.Check
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      label="Cliente activo"
                    />
                  </div>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Dirección</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Dirección completa del cliente..."
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {isEditing ? 'Actualizar' : 'Crear'} Cliente
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default Customers;
