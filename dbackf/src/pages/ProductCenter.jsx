

import React, { useState, useEffect } from 'react';
import ProductSelect from '../components/ProductSelect';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const ProductCenter = () => {
	const [selectedProductId, setSelectedProductId] = useState(null);
	const [kardex, setKardex] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	// Cargar historial de inventario (Kardex) al seleccionar producto
	useEffect(() => {
		if (!selectedProductId) {
			setKardex([]);
			setError(null);
			return;
		}
		setLoading(true);
		setError(null);

		axios.get(`${API_URL}/pc/products/${selectedProductId}/kardex/`, {
			headers: {
				Authorization: `Bearer ${localStorage.getItem('token')}`,
			},
		})
			.then(res => setKardex(Array.isArray(res.data) ? res.data : []))
			.catch(() => setError('No se pudo cargar el historial de inventario.'))
			.finally(() => setLoading(false));
	}, [selectedProductId]);

	// Detectar si los movimientos son de variante por prefijo en los campos
	const isVariant = kardex.length > 0 && Object.keys(kardex[0]).some(k => k.startsWith('variant_'));

	return (
		<div className="container mt-4">
			<h2>Centro de Productos</h2>
			<ProductSelect
				value={selectedProductId}
				onChange={setSelectedProductId}
				placeholder="Buscar producto por nombre o SKU..."
				required
			/>
			{/* Kardex */}
			{selectedProductId && (
				<div className="mt-4">
					<h4>Historial de Inventario (Kardex)</h4>
					{loading && (
						<div className="text-center my-3">
							<div className="spinner-border text-primary" role="status">
								<span className="visually-hidden">Cargando...</span>
							</div>
						</div>
					)}
					{error && (
						<div className="alert alert-danger">{error}</div>
					)}
					{!loading && !error && kardex.length === 0 && (
						<div className="alert alert-warning">No hay movimientos para este producto.</div>
					)}
					{!loading && !error && kardex.length > 0 && (
						   <div className="row">
							   {kardex.map((mov, idx) => {
								   const tipo = isVariant ? mov.variant_movement_type ?? mov.movement_type : mov.movement_type;
								   const entrada = ((tipo === 'INGRESO') ? (isVariant ? mov.variant_quantity_in ?? mov.quantity_in : mov.quantity_in) : '');
								   const salida = ((tipo === 'EGRESO') ? (isVariant ? mov.variant_quantity_out ?? mov.quantity_out : mov.quantity_out) : '');
								   return (
									   <div key={idx} className="col-12 col-md-6 col-lg-4 mb-3">
										   <div className="card shadow-sm h-100">
											   <div className="card-body p-3">
												   <div className="d-flex justify-content-between align-items-center mb-2">
													   <span className="fw-bold">{isVariant ? mov.variant_date ?? mov.date : mov.date}</span>
													   <span className={`badge ${tipo === 'INGRESO' ? 'bg-success' : tipo === 'EGRESO' ? 'bg-danger' : 'bg-secondary'}`}>{tipo}</span>
												   </div>
												   <div className="mb-2">
													   <span className="text-success">Entrada: <b>{entrada}</b></span>
													   <span className="ms-3 text-danger">Salida: <b>{salida}</b></span>
												   </div>
												   <div className="mb-1 small text-muted">Almacén: {isVariant ? mov.variant_warehouse ?? mov.warehouse : mov.warehouse}</div>
												   <div className="mb-1 small text-muted">Referencia: {isVariant ? mov.variant_reference ?? mov.reference : mov.reference}</div>
												   <div className="mb-1 small text-muted">Saldo: {isVariant ? mov.variant_balance ?? mov.balance : mov.balance}</div>
												   <div className="mb-1 small text-muted">Precio Unit.: ${(isVariant ? mov.variant_unit_cost ?? mov.unit_cost : mov.unit_cost)?.toFixed(2) ?? '0.00'}</div>
												   <div className="mb-1 small text-muted">Valor Total: ${(isVariant ? mov.variant_total_value ?? mov.total_value : mov.total_value)?.toFixed(2) ?? '0.00'}</div>
												   <div className="mb-1 small text-muted">Usuario: {isVariant ? mov.variant_user ?? mov.user : mov.user}</div>
												   <div className="mb-1 small text-muted">Notas: {isVariant ? mov.variant_notes ?? mov.notes : mov.notes}</div>
											   </div>
										   </div>
									   </div>
								   );
							   })}
						   </div>
					)}
				</div>
			)}
		</div>
	);
};

export default ProductCenter;
