import React, { useEffect, useState } from 'react';
import api from '../services/api';

const ProductsNew = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isActive, setIsActive] = useState(null);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(52);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchProducts(search, isActive, page);
    }, [search, isActive, page]);

    const fetchProducts = async (searchTerm = '', activeFilter = null) => {
        setLoading(true);
        try {
            const params = {};
            if (searchTerm) params.search = searchTerm;
            if (activeFilter !== null) {
                params.is_active = activeFilter ? true : false;
            }
            params.page = page;
            params.page_size = pageSize;
            const response = await api.get('/products/', { params });
            setProducts(response.data.results || response.data);
            // Si la respuesta tiene paginación estándar DRF
            if (response.data.count !== undefined && response.data.results !== undefined) {
                setTotalPages(Math.ceil(response.data.count / pageSize));
            } else {
                setTotalPages(1);
            }
        } catch (err) {
            setProducts([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1); // Reinicia a la primera página al buscar
    };

    return (
        <div className="container py-5">
            <h2>Listado de productos</h2>
            <form className="mb-4 d-flex gap-2 align-items-center" onSubmit={handleSearch}>
                <input
                    type="text"
                    className="form-control"
                    placeholder="Buscar por nombre, SKU, marca..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                    <div className="form-check ms-2">
                        <input
                            className="form-check-input"
                            type="radio"
                            name="activoInactivo"
                            id="todos"
                            checked={isActive === null}
                            onChange={() => setIsActive(null)}
                        />
                        <label className="form-check-label" htmlFor="todos">Todos</label>
                    </div>
                    <div className="form-check ms-2">
                        <input
                            className="form-check-input"
                            type="radio"
                            name="activoInactivo"
                            id="activo"
                            checked={isActive === true}
                            onChange={() => setIsActive(true)}
                        />
                        <label className="form-check-label" htmlFor="activo">Activo</label>
                    </div>
                    <div className="form-check ms-2">
                        <input
                            className="form-check-input"
                            type="radio"
                            name="activoInactivo"
                            id="inactivo"
                            checked={isActive === false}
                            onChange={() => setIsActive(false)}
                        />
                        <label className="form-check-label" htmlFor="inactivo">Inactivo</label>
                    </div>
                <button className="btn btn-primary" type="submit" aria-label="Buscar">
                    <span className="bi bi-search" aria-hidden="true"></span>
                </button>
            </form>
            {loading ? (
                <p>Cargando...</p>
            ) : (
                <>
                <nav className="d-flex justify-content-center align-items-center mb-3" style={{maxWidth: '100vw', overflowX: 'auto'}}>
                    <ul className="pagination mb-0" style={{maxWidth: '100%'}}>
                        <li className={`page-item${page === 1 ? ' disabled' : ''}`}>
                            <button className="page-link" onClick={() => setPage(1)} disabled={page === 1} title="Primera">&#171;</button>
                        </li>
                        <li className={`page-item${page === 1 ? ' disabled' : ''}`}>
                            <button className="page-link" onClick={() => setPage(page - 1)} disabled={page === 1} title="Anterior">&#8249;</button>
                        </li>
                        <li className="page-item active">
                            <span className="page-link" style={{minWidth: 60}}>{page} / {totalPages}</span>
                        </li>
                        <li className={`page-item${page === totalPages ? ' disabled' : ''}`}>
                            <button className="page-link" onClick={() => setPage(page + 1)} disabled={page === totalPages} title="Siguiente">&#8250;</button>
                        </li>
                        <li className={`page-item${page === totalPages ? ' disabled' : ''}`}>
                            <button className="page-link" onClick={() => setPage(totalPages)} disabled={page === totalPages} title="Última">&#187;</button>
                        </li>
                    </ul>
                </nav>
                <table className="table table-striped">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>SKU</th>
                            <th>Marca</th>
                            <th>Categoría</th>
                            <th>Activo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(product => (
                            <tr key={product.id}>
                                <td>{product.id}</td>
                                <td>{product.name}</td>
                                <td>{product.sku}</td>
                                <td>{product.brand_name}</td>
                                <td>{product.category_name}</td>
                                <td>{product.is_active ? 'Sí' : 'No'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </>
            )}
        </div>
    );
};

export default ProductsNew;
