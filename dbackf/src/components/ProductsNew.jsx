import React, { useEffect, useState } from 'react';
import api from '../services/api';

const ProductsNew = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isActive, setIsActive] = useState(null);

    useEffect(() => {
        fetchProducts(search, isActive);
    }, [search, isActive]);

    const fetchProducts = async (searchTerm = '', activeFilter = null) => {
        setLoading(true);
        try {
            const params = {};
            if (searchTerm) params.search = searchTerm;
            if (activeFilter !== null) params.is_active = activeFilter ? 'true' : 'false';
            const response = await api.get('/products/', { params });
            setProducts(response.data.results || response.data);
        } catch (err) {
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        // El estado 'search' ya dispara el efecto
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
                        type="checkbox"
                        id="activo"
                        checked={isActive === true}
                        onChange={() => setIsActive(isActive === true ? null : true)}
                    />
                    <label className="form-check-label" htmlFor="activo">Activo</label>
                </div>
                <div className="form-check ms-2">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        id="inactivo"
                        checked={isActive === false}
                        onChange={() => setIsActive(isActive === false ? null : false)}
                    />
                    <label className="form-check-label" htmlFor="inactivo">Inactivo</label>
                </div>
                <button className="btn btn-primary" type="submit">
                    Buscar
                </button>
            </form>
            {loading ? (
                <p>Cargando...</p>
            ) : (
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
            )}
        </div>
    );
};

export default ProductsNew;
