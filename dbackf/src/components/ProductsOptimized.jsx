import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Row, Col, Form, Button, Alert, Table, Pagination, Badge, InputGroup } from 'react-bootstrap';
import { FaSearch, FaFilter, FaClear, FaEye, FaEdit, FaTimes, FaSpinner } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import ProductModal from './ProductModal';
import ProductFormModal from './ProductFormModal';

const ProductsOptimized = () => {
    // Estados principales
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Estados de filtros
    const [filters, setFilters] = useState({
        search: '',
        brand: '',
        category: '',
        is_active: '',
        stock_status: ''
    });
    
    // Estados de paginación
    const [pagination, setPagination] = useState({
        page: 1,
        page_size: 50,
        total_pages: 0,
        total_count: 0,
        has_next: false,
        has_previous: false
    });
    
    // Estados para opciones de filtros
    const [brands, setBrands] = useState([]);
    const [categories, setCategories] = useState([]);
    
    // Estados de modales
    const [showModal, setShowModal] = useState(false);
    const [showFormModal, setShowFormModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    
    // Estado para controlar si se han aplicado filtros
    const [hasSearched, setHasSearched] = useState(false);
    
    // Cargar opciones de filtros al montar
    useEffect(() => {
        loadFilterOptions();
    }, []);
    
    const loadFilterOptions = async () => {
        try {
            // Cargar marcas
            const brandsResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/brands/`);
            if (brandsResponse.ok) {
                const brandsData = await brandsResponse.json();
                setBrands(brandsData.results || brandsData);
            }
            
            // Cargar categorías
            const categoriesResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/categories/`);
            if (categoriesResponse.ok) {
                const categoriesData = await categoriesResponse.json();
                setCategories(categoriesData.results || categoriesData);
            }
        } catch (error) {
            console.error('Error loading filter options:', error);
        }
    };
    
    const searchProducts = useCallback(async (searchFilters = filters, page = pagination.page) => {
        setLoading(true);
        setError(null);
        
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                page_size: pagination.page_size.toString(),
                ...Object.fromEntries(
                    Object.entries(searchFilters).filter(([_, value]) => value !== '')
                )
            });
            
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/products/search_filtered/?${params}`);
            
            if (!response.ok) {
                throw new Error('Error al buscar productos');
            }
            
            const data = await response.json();
            
            setProducts(data.results || []);
            setPagination({
                page: data.page || 1,
                page_size: data.page_size || 50,
                total_pages: data.total_pages || 0,
                total_count: data.count || 0,
                has_next: data.has_next || false,
                has_previous: data.has_previous || false
            });
            
            setHasSearched(true);
            
        } catch (error) {
            console.error('Error searching products:', error);
            setError('Error al cargar los productos. Por favor, intenta nuevamente.');
            toast.error('Error al cargar los productos');
        } finally {
            setLoading(false);
        }
    }, [filters, pagination.page_size]);
    
    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };
    
    const handleSearch = () => {
        setPagination(prev => ({ ...prev, page: 1 }));
        searchProducts(filters, 1);
    };
    
    const handleClearFilters = () => {
        setFilters({
            search: '',
            brand: '',
            category: '',
            is_active: '',
            stock_status: ''
        });
        setProducts([]);
        setHasSearched(false);
        setPagination(prev => ({ ...prev, page: 1 }));
    };
    
    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }));
        searchProducts(filters, newPage);
    };
    
    const handleViewProduct = (product) => {
        setSelectedProduct(product);
        setShowModal(true);
    };
    
    const handleEditProduct = (product) => {
        setSelectedProduct(product);
        setShowFormModal(true);
    };
    
    const handleCreateProduct = () => {
        setSelectedProduct(null);
        setShowFormModal(true);
    };
    
    const handleProductSaved = () => {
        setShowFormModal(false);
        if (hasSearched) {
            searchProducts(); // Refrescar la lista actual
        }
        toast.success('Producto guardado exitosamente');
    };
    
    // Función para renderizar el estado inicial
    const renderInitialState = () => (
        <div className="text-center py-5">
            <div className="mb-4">
                <FaSearch size={48} className="text-muted mb-3" />
                <h4 className="text-muted">Buscar Productos</h4>
                <p className="text-muted">
                    Utiliza los filtros para buscar entre más de 2000 productos.<br/>
                    Ingresa al menos un criterio de búsqueda para comenzar.
                </p>
            </div>
        </div>
    );
    
    // Función para renderizar la tabla de productos
    const renderProductsTable = () => (
        <div className="table-responsive">
            <Table striped bordered hover>
                <thead className="table-dark">
                    <tr>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Marca</th>
                        <th>Categoría</th>
                        <th>Stock</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((product) => (
                        <tr key={product.id}>
                            <td>
                                <code>{product.sku}</code>
                                {product.barcode && (
                                    <div><small className="text-muted">{product.barcode}</small></div>
                                )}
                            </td>
                            <td>
                                <strong>{product.name}</strong>
                                {product.description && (
                                    <div><small className="text-muted">{product.description}</small></div>
                                )}
                            </td>
                            <td>{product.brand?.name || 'Sin marca'}</td>
                            <td>{product.category?.name || 'Sin categoría'}</td>
                            <td>
                                <Badge bg={product.current_stock > 0 ? 'success' : 'danger'}>
                                    {product.current_stock || 0}
                                </Badge>
                                {product.minimum_stock && (
                                    <div><small className="text-muted">Min: {product.minimum_stock}</small></div>
                                )}
                            </td>
                            <td>
                                <Badge bg={product.is_active ? 'success' : 'secondary'}>
                                    {product.is_active ? 'Activo' : 'Inactivo'}
                                </Badge>
                            </td>
                            <td>
                                <div className="d-flex gap-1">
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() => handleViewProduct(product)}
                                        title="Ver detalles"
                                    >
                                        <FaEye />
                                    </Button>
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={() => handleEditProduct(product)}
                                        title="Editar"
                                    >
                                        <FaEdit />
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
    
    return (
        <div className="container-fluid">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2><strong>Gestión de Productos</strong></h2>
                <Button variant="success" onClick={handleCreateProduct}>
                    Crear Producto
                </Button>
            </div>
            
            {/* Panel de Filtros */}
            <Card className="mb-4">
                <Card.Header>
                    <div className="d-flex align-items-center gap-2">
                        <FaFilter />
                        <strong>Filtros de Búsqueda</strong>
                    </div>
                </Card.Header>
                <Card.Body>
                    <Row>
                        <Col md={4}>
                            <Form.Group className="mb-3">
                                <Form.Label>Búsqueda general</Form.Label>
                                <InputGroup>
                                    <Form.Control
                                        type="text"
                                        placeholder="Buscar por nombre, código, descripción..."
                                        value={filters.search}
                                        onChange={(e) => handleFilterChange('search', e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    />
                                </InputGroup>
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group className="mb-3">
                                <Form.Label>Marca</Form.Label>
                                <Form.Select
                                    value={filters.brand}
                                    onChange={(e) => handleFilterChange('brand', e.target.value)}
                                >
                                    <option value="">Todas las marcas</option>
                                    {brands.map(brand => (
                                        <option key={brand.id} value={brand.id}>
                                            {brand.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group className="mb-3">
                                <Form.Label>Categoría</Form.Label>
                                <Form.Select
                                    value={filters.category}
                                    onChange={(e) => handleFilterChange('category', e.target.value)}
                                >
                                    <option value="">Todas las categorías</option>
                                    {categories.map(category => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group className="mb-3">
                                <Form.Label>Estado</Form.Label>
                                <Form.Select
                                    value={filters.is_active}
                                    onChange={(e) => handleFilterChange('is_active', e.target.value)}
                                >
                                    <option value="">Todos</option>
                                    <option value="true">Activos</option>
                                    <option value="false">Inactivos</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group className="mb-3">
                                <Form.Label>Stock</Form.Label>
                                <Form.Select
                                    value={filters.stock_status}
                                    onChange={(e) => handleFilterChange('stock_status', e.target.value)}
                                >
                                    <option value="">Todos</option>
                                    <option value="ok">Con stock</option>
                                    <option value="zero">Sin stock</option>
                                    <option value="low">Stock bajo</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                    <div className="d-flex gap-2">
                        <Button 
                            variant="primary" 
                            onClick={handleSearch}
                            disabled={loading}
                        >
                            {loading ? <><FaSpinner className="fa-spin me-2" /> Buscando...</> : <><FaSearch className="me-2" /> Buscar</>}
                        </Button>
                        <Button 
                            variant="outline-secondary" 
                            onClick={handleClearFilters}
                            disabled={loading}
                        >
                            <FaTimes className="me-2" /> Limpiar
                        </Button>
                    </div>
                </Card.Body>
            </Card>
            
            {/* Área de Resultados */}
            <Card>
                <Card.Header>
                    <div className="d-flex justify-content-between align-items-center">
                        <strong>
                            {hasSearched ? `Productos (${pagination.total_count} encontrados)` : 'Productos'}
                        </strong>
                        {hasSearched && (
                            <small className="text-muted">
                                Página {pagination.page} de {pagination.total_pages}
                            </small>
                        )}
                    </div>
                </Card.Header>
                <Card.Body>
                    {error && (
                        <Alert variant="danger" className="mb-3">
                            {error}
                        </Alert>
                    )}
                    
                    {loading && (
                        <div className="text-center py-4">
                            <FaSpinner className="fa-spin me-2" size={24} />
                            <span>Cargando productos...</span>
                        </div>
                    )}
                    
                    {!loading && !hasSearched && renderInitialState()}
                    
                    {!loading && hasSearched && products.length === 0 && (
                        <div className="text-center py-4">
                            <h5 className="text-muted">No se encontraron productos</h5>
                            <p className="text-muted">Intenta modificar los criterios de búsqueda</p>
                        </div>
                    )}
                    
                    {!loading && hasSearched && products.length > 0 && renderProductsTable()}
                    
                    {/* Paginación */}
                    {hasSearched && pagination.total_pages > 1 && (
                        <div className="d-flex justify-content-center mt-4">
                            <Pagination>
                                <Pagination.First 
                                    onClick={() => handlePageChange(1)}
                                    disabled={!pagination.has_previous || loading}
                                />
                                <Pagination.Prev 
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={!pagination.has_previous || loading}
                                />
                                
                                {/* Páginas visibles */}
                                {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                                    const page = Math.max(1, pagination.page - 2) + i;
                                    if (page <= pagination.total_pages) {
                                        return (
                                            <Pagination.Item
                                                key={page}
                                                active={page === pagination.page}
                                                onClick={() => handlePageChange(page)}
                                                disabled={loading}
                                            >
                                                {page}
                                            </Pagination.Item>
                                        );
                                    }
                                    return null;
                                })}
                                
                                <Pagination.Next 
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={!pagination.has_next || loading}
                                />
                                <Pagination.Last 
                                    onClick={() => handlePageChange(pagination.total_pages)}
                                    disabled={!pagination.has_next || loading}
                                />
                            </Pagination>
                        </div>
                    )}
                </Card.Body>
            </Card>
            
            {/* Modales */}
            {showModal && selectedProduct && (
                <ProductModal
                    show={showModal}
                    onHide={() => setShowModal(false)}
                    product={selectedProduct}
                />
            )}
            
            {showFormModal && (
                <ProductFormModal
                    show={showFormModal}
                    onHide={() => setShowFormModal(false)}
                    product={selectedProduct}
                    onSave={handleProductSaved}
                />
            )}
            
            <ToastContainer />
        </div>
    );
};

export default ProductsOptimized;