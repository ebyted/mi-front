import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

const InventoryGeneral = () => {
	const [warehouses, setWarehouses] = useState([]);
	const [products, setProducts] = useState([]);
	const [inventory, setInventory] = useState([]);
	const [selectedWarehouse, setSelectedWarehouse] = useState('');
	const [selectedProduct, setSelectedProduct] = useState('');
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		// Cargar almacenes y productos
		api.get('/warehouses/').then(r => setWarehouses(r.data));
		api.get('/products/').then(r => setProducts(Array.isArray(r.data) ? r.data : r.data.results || []));
	}, []);

	useEffect(() => {
		// Consultar inventario filtrado
		setLoading(true);
		let params = {};
		if (selectedWarehouse) params.warehouse = selectedWarehouse;
		if (selectedProduct) params.product = selectedProduct;
		api.get('/inventory/', { params })
			.then(r => setInventory(Array.isArray(r.data) ? r.data : r.data.results || []))
			.finally(() => setLoading(false));
	}, [selectedWarehouse, selectedProduct]);

	return (
		<div className="container py-4">
			<h2 className="mb-4">Consulta de Inventario</h2>
			<div className="row mb-3">
				<div className="col-md-4">
					<label className="form-label">Almacén</label>
					<select className="form-select" value={selectedWarehouse} onChange={e => setSelectedWarehouse(e.target.value)}>
						<option value="">Todos</option>
						{warehouses.map(w => (
							<option key={w.id} value={w.id}>{w.name}</option>
						))}
					</select>
				</div>
				<div className="col-md-6">
					<label className="form-label">Producto</label>
					<select className="form-select" value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
						<option value="">Todos</option>
						{products.map(p => (
							<option key={p.id} value={p.id}>{p.name}</option>
						))}
					</select>
				</div>
			</div>
			<div className="card shadow">
				<div className="card-body p-0">
					{loading ? (
						<div className="text-center py-5">Cargando inventario...</div>
					) : (
						<div className="table-responsive">
							<table className="table table-hover mb-0">
								<thead className="table-light">
									<tr>
										<th>Producto</th>
										<th>SKU</th>
										<th>Almacén</th>
										<th>Stock</th>
										<th>Lote</th>
										<th>Caducidad</th>
									</tr>
								</thead>
								<tbody>
									{inventory.length === 0 ? (
										<tr><td colSpan={6} className="text-center text-muted">No hay registros</td></tr>
									) : inventory.map(item => (
										<tr key={item.id}>
											<td>{item.product_name || item.product?.name || ''}</td>
											<td>{item.product_sku || item.product?.sku || ''}</td>
											<td>{item.warehouse_name || item.warehouse?.name || ''}</td>
											<td>{item.stock}</td>
											<td>{item.lote || ''}</td>
											<td>{item.expiration_date ? new Date(item.expiration_date).toLocaleDateString() : ''}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default InventoryGeneral;
