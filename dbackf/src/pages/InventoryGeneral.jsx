
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const PAGE_SIZE = 20;

const InventoryGeneral = () => {
	const [warehouses, setWarehouses] = useState([]);
	const [productOptions, setProductOptions] = useState([]); // Para autocompletado
	const [selectedProduct, setSelectedProduct] = useState(null);
	const [selectedWarehouse, setSelectedWarehouse] = useState('');
	const [inventory, setInventory] = useState([]);
	const [loading, setLoading] = useState(false);
	const [productSearch, setProductSearch] = useState('');
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);

	// Cargar almacenes al inicio
	useEffect(() => {
		api.get('/warehouses/').then(r => setWarehouses(r.data));
	}, []);

	// Autocompletado remoto de productos
	useEffect(() => {
		if (productSearch.length < 2) {
			setProductOptions([]);
			return;
		}
		api.get('/products/', { params: { search: productSearch, page_size: 15 } })
			.then(r => setProductOptions(r.data.results || []));
	}, [productSearch]);

	// Cargar inventario con paginación y filtros
	useEffect(() => {
		setLoading(true);
		const params = {
			page,
			page_size: PAGE_SIZE
		};
		if (selectedWarehouse) params.warehouse = selectedWarehouse;
		if (selectedProduct) params.product = selectedProduct.id;
		api.get('/inventory/', { params })
			.then(r => {
				setInventory(r.data.results || []);
				setTotalPages(Math.ceil((r.data.count || 1) / PAGE_SIZE));
			})
			.finally(() => setLoading(false));
	}, [selectedWarehouse, selectedProduct, page]);

	return (
		<div className="container py-4">
			<h2 className="mb-4 fw-bold text-primary">Consulta de Inventario</h2>
			<div className="row mb-3">
				<div className="col-md-4 mb-2">
					<label className="form-label">Almacén</label>
					<select className="form-select" value={selectedWarehouse} onChange={e => setSelectedWarehouse(e.target.value)}>
						<option value="">Todos</option>
						{warehouses.map(w => (
							<option key={w.id} value={w.id}>{w.name}</option>
						))}
					</select>
				</div>
				<div className="col-md-4 mb-2">
					<label className="form-label">Producto</label>
					<input
						type="text"
						className="form-control"
						placeholder="Buscar producto por nombre o SKU..."
						value={productSearch}
						onChange={e => {
							setProductSearch(e.target.value);
							setSelectedProduct(null);
						}}
						autoComplete="off"
					/>
					{productSearch.length >= 2 && productOptions.length > 0 && (
						<div className="list-group position-absolute w-100 z-3" style={{ maxHeight: 200, overflowY: 'auto' }}>
							{productOptions.map(opt => (
								<button
									key={opt.id}
									type="button"
									className="list-group-item list-group-item-action"
									onClick={() => {
										setSelectedProduct(opt);
										setProductSearch(opt.name);
										setProductOptions([]);
									}}
								>
									{opt.name} <span className="text-muted">{opt.sku}</span>
								</button>
							))}
						</div>
					)}
				</div>
			</div>
			<div className="table-responsive">
				<table className="table table-bordered table-hover">
					<thead className="table-primary">
						<tr>
							<th>SKU</th>
							<th>Nombre</th>
							<th>Estado</th>
							<th>Marca</th>
							<th>Categoría</th>
							<th>Stock</th>
							<th>Mínimo</th>
							<th>Máximo</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr><td colSpan="8" className="text-center">Cargando...</td></tr>
						) : inventory.length === 0 ? (
							<tr><td colSpan="8" className="text-center">No hay productos con existencia</td></tr>
						) : (
							inventory.map((prod, idx) => (
								<tr key={idx}>
									<td><span className="fw-bold text-info">{prod.sku}</span></td>
									<td><span className="fw-bold text-primary">{prod.name}</span></td>
									<td><span className={`badge ${prod.status === 'REGULAR' ? 'bg-light text-dark' : 'bg-danger'}`}>{prod.status}</span></td>
									<td>{prod.brand || 'N/A'}</td>
									<td>{prod.category || 'N/A'}</td>
									<td><span className="badge bg-success fs-6">{prod.stock}</span></td>
									<td><span className="badge bg-warning text-dark">{prod.minimum_stock}</span></td>
									<td><span className="badge bg-warning text-dark">{prod.maximum_stock}</span></td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
			{/* Paginación */}
			<div className="d-flex justify-content-center align-items-center my-3">
				<button className="btn btn-outline-primary me-2" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>&laquo; Anterior</button>
				<span className="mx-2">Página {page} de {totalPages}</span>
				<button className="btn btn-outline-primary ms-2" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Siguiente &raquo;</button>
			</div>
		</div>
	);
};

export default InventoryGeneral;
