import React, { useEffect, useState } from 'react';
import api from '../services/api'; // Asegúrate que api.js esté correctamente configurado

const ProductsNew = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {        
        fetchProducts();
    }, []);

    const fetchProducts = async (searchTerm = '') => {
        setLoading(true);
        try {
            const params = searchTerm ? { search: searchTerm } : {};
            const response = await api.get('/products/', { params });
            setProducts(response.data.results || response.data); // Ajusta según tu backend
        } catch (err) {
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchProducts(search);
    };
    
    return (
        <div className="container py-5">
            <h2>Listado de productos</h2>
            <form className="mb-4 d-flex gap-2" onSubmit={handleSearch}>
                <input
                    type="text"
                    className="form-control"
                    placeholder="Buscar por nombre, SKU, marca..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
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
