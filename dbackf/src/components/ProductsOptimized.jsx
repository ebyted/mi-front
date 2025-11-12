import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Row, Col, Form, Button, Alert, Table, Pagination, Badge, InputGroup } from 'react-bootstrap';
import { api } from '../services/api';
// import ProductModal from './ProductModal';
// import ProductFormModal from './ProductFormModal';

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
    const [loadingFilters, setLoadingFilters] = useState(true);
    
    // Estados de modales
    const [showModal, setShowModal] = useState(false);
    const [showFormModal, setShowFormModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    
    // Estado para controlar si se han aplicado filtros
    const [hasSearched, setHasSearched] = useState(false);
    
    // Estado para mensaje de notificación
    const [notification, setNotification] = useState('');
    
    // Cargar opciones de filtros al montar
    useEffect(() => {
        console.log('Cargando opciones de filtros...');
        loadFilterOptions();
    }, []);
    
    const loadFilterOptions = async () => {
        try {
            setLoadingFilters(true);
            console.log('Iniciando carga de opciones de filtros...');
            
            // Cargar información de debug
            try {
                const debugResponse = await api.get('/debug/filters/');
                console.log('Debug info:', debugResponse.data);
            } catch (debugError) {
                console.warn('Debug endpoint no disponible:', debugError.message);
            }
            
            // Cargar marcas y categorías en paralelo
            const [brandsResponse, categoriesResponse] = await Promise.all([
                api.get('/brands/'),
                api.get('/categories/')
            ]);
            
            const brandsData = brandsResponse.data.results || brandsResponse.data;
            const categoriesData = categoriesResponse.data.results || categoriesResponse.data;
            
            setBrands(brandsData);
            setCategories(categoriesData);
            
            console.log('Marcas cargadas:', brandsData.length, brandsData);
            console.log('Categorías cargadas:', categoriesData.length, categoriesData);
            
            // Mostrar mensaje de éxito
            if (brandsData.length > 0 || categoriesData.length > 0) {
                console.log(`✅ Filtros cargados: ${brandsData.length} marcas, ${categoriesData.length} categorías`);
            } else {
                console.warn('⚠️ No se encontraron marcas ni categorías - considera crear datos de prueba');
                // Sugerir crear datos de prueba
                if (window.confirm('No se encontraron marcas ni categorías. ¿Deseas crear datos de prueba?')) {
                    await createTestData();
                }
            }
            
        } catch (error) {
            console.error('❌ Error loading filter options:', error);
            setError(`Error al cargar las opciones de filtros: ${error.message}`);
        } finally {
            setLoadingFilters(false);
        }
    };

    const createTestData = async () => {
        try {
            setNotification('Creando datos de prueba...');
            await api.post('/dashboard/initialize-test-data/');
            setNotification('✅ Datos de prueba creados exitosamente');
            console.log('Datos de prueba creados, recargando filtros...');
            // Recargar filtros después de crear datos
            await loadFilterOptions();
            // Limpiar notificación después de 3 segundos
            setTimeout(() => setNotification(''), 3000);
        } catch (error) {
            console.error('Error creando datos de prueba:', error);
            setNotification('❌ Error al crear datos de prueba');
            setTimeout(() => setNotification(''), 5000);
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
            
            const response = await api.get(`/products/search_filtered/?${params}`);
            const data = response.data;
            
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
            alert('Error al cargar los productos');
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
        alert('Producto guardado exitosamente');
    };
    
    // Función para renderizar el estado inicial
    const renderInitialState = () => (
        <div className="text-center py-5">
            <div className="mb-4">
                <i className="bi bi-search text-muted mb-3" style={{fontSize: '48px'}}></i>
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
                                        <i className="bi bi-eye"></i>
                                    </Button>
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={() => handleEditProduct(product)}
                                        title="Editar"
                                    >
                                        <i className="bi bi-pencil"></i>
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
                <div className="d-flex align-items-center gap-3">
                    <h2><strong>Gestión de Productos</strong></h2>
                    <Button 
                        variant="outline-info" 
                        size="sm" 
                        onClick={loadFilterOptions}
                        title="Recargar opciones de filtros"
                        disabled={loadingFilters}
                    >
                        {loadingFilters ? (
                            <><i className="bi bi-arrow-repeat spin"></i> Cargando...</>
                        ) : (
                            <><i className="bi bi-arrow-clockwise"></i> Recargar Filtros</>
                        )}
                    </Button>
                    {(brands.length === 0 && categories.length === 0 && !loadingFilters) && (
                        <Button 
                            variant="outline-warning" 
                            size="sm" 
                            onClick={createTestData}
                            title="Crear datos de prueba básicos"
                        >
                            <i className="bi bi-plus-circle"></i> Datos de Prueba
                        </Button>
                    )}
                </div>
                <Button variant="success" onClick={handleCreateProduct}>
                    Crear Producto
                </Button>
            </div>
            
            {/* Notificación */}
            {notification && (
                <Alert variant={notification.includes('❌') ? 'danger' : notification.includes('✅') ? 'success' : 'info'} className="mb-3">
                    {notification}
                </Alert>
            )}
            
            {/* Panel de Filtros */}
            <Card className="mb-4">
                <Card.Header>
                    <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-funnel"></i>
                        <strong>Filtros de Búsqueda</strong>
                        <small className={`ms-2 ${loadingFilters ? 'text-info' : brands.length === 0 && categories.length === 0 ? 'text-warning' : 'text-success'}`}>
                            {loadingFilters ? (
                                <><i className="bi bi-arrow-repeat spin"></i> Cargando opciones...</>
                            ) : brands.length === 0 && categories.length === 0 ? (
                                <><i className="bi bi-exclamation-triangle"></i> Sin datos - crea datos de prueba</>
                            ) : (
                                <><i className="bi bi-check-circle"></i> Marcas: {brands.length}, Categorías: {categories.length}</>
                            )}
                        </small>
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
                                    disabled={loadingFilters}
                                >
                                    <option value="">
                                        {loadingFilters ? 'Cargando marcas...' : 'Todas las marcas'}
                                    </option>
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
                                    disabled={loadingFilters}
                                >
                                    <option value="">
                                        {loadingFilters ? 'Cargando categorías...' : 'Todas las categorías'}
                                    </option>
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
                            {loading ? <><i className="bi bi-arrow-repeat spin me-2"></i> Buscando...</> : <><i className="bi bi-search me-2"></i> Buscar</>}
                        </Button>
                        <Button 
                            variant="outline-secondary" 
                            onClick={handleClearFilters}
                            disabled={loading}
                        >
                            <i className="bi bi-x-circle me-2"></i> Limpiar
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
                            <i className="bi bi-arrow-repeat spin me-2" style={{fontSize: '24px'}}></i>
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
            
            {/* Modales - Comentados temporalmente
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
            */}
            
            <style jsx>{`
                .spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default ProductsOptimized;