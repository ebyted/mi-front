import React, { useEffect, useState } from 'react';
import api from '../services/api';
import CreditStatusCard from '../components/CreditStatusCard';
import SupplierPaymentForm from '../components/SupplierPaymentForm';

const levelBadges = {
	1: 'bg-secondary',
	2: 'bg-info',
	3: 'bg-warning',
	4: 'bg-success',
};

function Suppliers() {
	const [suppliers, setSuppliers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [form, setForm] = useState({
		name: '',
		company_name: '',
		tax_id: '',
		email: '',
		phone: '',
		address: '',
		payment_terms: '',
		discount_percentage: 0,
		contact_person: '',
		business: 1, // ID del business por defecto
		has_credit: false,
		credit_limit_decimal: 0,
		credit_days: 30,
		current_balance: 0,
		notes: '',
	});
	const [editingId, setEditingId] = useState(null);
	const [search, setSearch] = useState('');
	const [page, setPage] = useState(1);
	const pageSize = 10;
	
	// Estados para gestión de crédito
	const [selectedSupplier, setSelectedSupplier] = useState(null);
	const [showPaymentModal, setShowPaymentModal] = useState(false);

	// Funciones auxiliares
	const formatCurrency = (amount) => {
		return new Intl.NumberFormat('es-MX', {
			style: 'currency',
			currency: 'MXN'
		}).format(amount || 0);
	};

	const handlePaymentSaved = async () => {
		// Recargar la lista de proveedores para actualizar los saldos
		await loadSuppliers();
		setShowPaymentModal(false);
		setSelectedSupplier(null);
	};

	useEffect(() => {
		loadSuppliers();
	}, []);

	const loadSuppliers = async () => {
		setLoading(true);
		try {
			const res = await api.get('/suppliers/');
			setSuppliers(res.data || []);
		} catch (err) {
			setError('No se pudo cargar los proveedores');
		} finally {
			setLoading(false);
		}
	};

	const handleChange = e => {
		setForm({ ...form, [e.target.name]: e.target.value });
	};

	const handleEdit = supplier => {
		setForm({
			name: supplier.name || '',
			company_name: supplier.company_name || '',
			tax_id: supplier.tax_id || '',
			email: supplier.email || '',
			phone: supplier.phone || '',
			address: supplier.address || '',
			payment_terms: supplier.payment_terms || '',
			discount_percentage: supplier.discount_percentage || 0,
			contact_person: supplier.contact_person || '',
			business: supplier.business || 1,
			has_credit: supplier.has_credit || false,
			credit_limit_decimal: supplier.credit_limit_decimal || 0,
			credit_days: supplier.credit_days || 30,
			current_balance: supplier.current_balance || 0,
			notes: supplier.notes || '',
		});
		setEditingId(supplier.id);
	};

	const handleDelete = async id => {
		if (!window.confirm('¿Eliminar este proveedor?')) return;
		try {
			await api.delete(`/suppliers/${id}/`);
			loadSuppliers();
		} catch (err) {
			setError('Error al eliminar el proveedor');
		}
	};

	const handleSubmit = async e => {
		e.preventDefault();
		try {
			// Preparar datos para enviar al backend
			const submitData = {
				name: form.name,
				company_name: form.company_name,
				tax_id: form.tax_id,
				email: form.email,
				phone: form.phone,
				address: form.address,
				payment_terms: form.payment_terms,
				discount_percentage: parseFloat(form.discount_percentage) || 0,
				contact_person: form.contact_person,
				business: form.business,
				is_active: true,
				has_credit: form.has_credit,
				credit_limit_decimal: parseFloat(form.credit_limit_decimal) || 0,
				credit_days: parseInt(form.credit_days) || 30,
				current_balance: parseFloat(form.current_balance) || 0,
				notes: form.notes,
			};

			if (editingId) {
				await api.put(`/suppliers/${editingId}/`, submitData);
			} else {
				await api.post('/suppliers/', submitData);
			}
			setForm({ 
				name: '', company_name: '', tax_id: '', email: '', phone: '', address: '', 
				payment_terms: '', discount_percentage: 0, contact_person: '', business: 1, 
				has_credit: false, credit_limit_decimal: 0, credit_days: 30, current_balance: 0, notes: '' 
			});
			setEditingId(null);
			loadSuppliers();
		} catch (err) {
			console.error('Error completo:', err);
			console.error('Respuesta del servidor:', err.response?.data);
			setError(`Error al guardar el proveedor: ${err.response?.data?.message || err.message}`);
		}
	};

	// Búsqueda y paginación
	const filtered = suppliers.filter(s =>
		s.name?.toLowerCase().includes(search.toLowerCase()) ||
		s.company_name?.toLowerCase().includes(search.toLowerCase()) ||
		s.email?.toLowerCase().includes(search.toLowerCase()) ||
		s.contact_person?.toLowerCase().includes(search.toLowerCase())
	);
	const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
	const totalPages = Math.ceil(filtered.length / pageSize);

	return (
		<div className="container py-4">
			<h2 className="mb-4 text-primary">🏭 Gestión de Proveedores</h2>
			<form className="card p-3 mb-4" onSubmit={handleSubmit}>
				<div className="row g-3">
					<div className="col-md-3">
						<input name="name" className="form-control" placeholder="Nombre del proveedor *" value={form.name} onChange={handleChange} required />
					</div>
					<div className="col-md-3">
						<input name="company_name" className="form-control" placeholder="Empresa" value={form.company_name} onChange={handleChange} />
					</div>
					<div className="col-md-2">
						<input name="tax_id" className="form-control" placeholder="RFC/Tax ID" value={form.tax_id} onChange={handleChange} />
					</div>
					<div className="col-md-2">
						<input name="email" type="email" className="form-control" placeholder="Email" value={form.email} onChange={handleChange} />
					</div>
					<div className="col-md-2">
						<input name="phone" className="form-control" placeholder="Teléfono" value={form.phone} onChange={handleChange} />
					</div>
					
					<div className="col-md-4">
						<input name="address" className="form-control" placeholder="Dirección" value={form.address} onChange={handleChange} />
					</div>
					<div className="col-md-2">
						<input name="payment_terms" className="form-control" placeholder="Términos de pago" value={form.payment_terms} onChange={handleChange} />
					</div>
					<div className="col-md-2">
						<input name="discount_percentage" type="number" className="form-control" placeholder="% Descuento" value={form.discount_percentage} onChange={handleChange} min="0" max="100" step="0.1" />
					</div>
					<div className="col-md-4">
						<input name="contact_person" className="form-control" placeholder="Persona de contacto" value={form.contact_person} onChange={handleChange} />
					</div>
					
					{/* Campos de Crédito */}
					<div className="col-md-12">
						<div className="form-check">
							<input 
								className="form-check-input" 
								type="checkbox" 
								name="has_credit" 
								checked={form.has_credit} 
								onChange={(e) => setForm({...form, has_credit: e.target.checked})}
								id="hasCredit"
							/>
							<label className="form-check-label fw-bold text-danger" htmlFor="hasCredit">
								💳 Proveedor con Crédito (nos otorga crédito)
							</label>
						</div>
					</div>
					
					{form.has_credit && (
						<>
							<div className="col-md-3">
								<label className="form-label small text-muted">Límite de Crédito</label>
								<div className="input-group">
									<span className="input-group-text">$</span>
									<input 
										name="credit_limit_decimal" 
										type="number" 
										className="form-control" 
										placeholder="0.00" 
										value={form.credit_limit_decimal} 
										onChange={handleChange} 
										min="0" 
										step="0.01"
									/>
								</div>
							</div>
							<div className="col-md-2">
								<label className="form-label small text-muted">Días de Crédito</label>
								<input 
									name="credit_days" 
									type="number" 
									className="form-control" 
									placeholder="30" 
									value={form.credit_days} 
									onChange={handleChange} 
									min="1"
								/>
							</div>
							<div className="col-md-3">
								<label className="form-label small text-muted">Saldo Actual (Deuda)</label>
								<div className="input-group">
									<span className="input-group-text">$</span>
									<input 
										name="current_balance" 
										type="number" 
										className="form-control" 
										placeholder="0.00" 
										value={form.current_balance} 
										onChange={handleChange} 
										min="0" 
										step="0.01"
									/>
								</div>
							</div>
						</>
					)}
					
					<div className="col-md-12">
						<textarea name="notes" className="form-control" rows="2" placeholder="Notas adicionales..." value={form.notes} onChange={handleChange}></textarea>
					</div>
					
					<div className="col-md-2">
						<button type="submit" className="btn btn-success w-100">{editingId ? 'Actualizar' : 'Crear'}</button>
					</div>
					{editingId && (
						<div className="col-md-2">
							<button type="button" className="btn btn-secondary w-100" onClick={() => { 
								setEditingId(null); 
								setForm({ 
									name: '', company_name: '', tax_id: '', email: '', phone: '', address: '', 
									payment_terms: '', discount_percentage: 0, contact_person: '', business: 1, 
									has_credit: false, credit_limit_decimal: 0, credit_days: 30, current_balance: 0, notes: '' 
								}); 
							}}>Cancelar</button>
						</div>
					)}
				</div>
			</form>
			<div className="mb-3 d-flex justify-content-between align-items-center">
				<input className="form-control w-50" placeholder="Buscar por nombre, empresa, email o contacto..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
				<div>
					<span className="badge bg-primary">Total: {filtered.length}</span>
				</div>
			</div>
			{error && <div className="alert alert-danger">{error}</div>}
			{loading ? (
				<div className="text-center py-5">
					<div className="spinner-border text-primary" role="status"></div>
					<p className="mt-2">Cargando proveedores...</p>
				</div>
			) : (
				<div className="card shadow">
					<div className="card-header bg-light">
						<h5 className="mb-0">Lista de Proveedores <span className="badge bg-primary ms-2">{filtered.length}</span></h5>
					</div>
					<div className="table-responsive">
						<table className="table table-hover mb-0">
							<thead className="table-primary">
								<tr>
									<th>Proveedor</th>
									<th>Empresa</th>
									<th>Contacto</th>
									<th>Términos</th>
									<th>Crédito</th>
									<th>Saldo</th>
									<th>Acciones</th>
								</tr>
							</thead>
							<tbody>
								{paged.map(s => (
									<tr key={s.id}>
										<td>
											<div className="fw-bold">{s.name}</div>
											{s.tax_id && <small className="text-muted">RFC: {s.tax_id}</small>}
										</td>
										<td>
											<div>{s.company_name}</div>
											{s.address && <small className="text-muted">{s.address.substring(0, 30)}...</small>}
										</td>
										<td>
											<div>{s.contact_person}</div>
											<small className="text-muted">{s.email}</small><br />
											<small className="text-muted">{s.phone}</small>
										</td>
										<td>
											<small>{s.payment_terms}</small>
											{s.discount_percentage > 0 && (
												<div>
													<span className="badge bg-info">{s.discount_percentage}% desc.</span>
												</div>
											)}
										</td>
										<td>
											{s.has_credit ? (
												<div>
													<div className="small text-danger fw-bold">
														💳 ${new Intl.NumberFormat('es-MX').format(s.credit_limit_decimal || 0)}
													</div>
													<small className="text-muted">{s.credit_days || 0} días</small>
												</div>
											) : (
												<span className="badge bg-secondary">
													<i className="bi bi-cash me-1"></i>Contado
												</span>
											)}
										</td>
										<td>
											{s.has_credit ? (
												<div className={`small fw-bold ${
													(s.current_balance || 0) > 0 ? 'text-danger' : 'text-success'
												}`}>
													${new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2 }).format(s.current_balance || 0)}
												</div>
											) : (
												<span className="text-muted">-</span>
											)}
										</td>
										<td>
											<div className="btn-group" role="group">
												<button 
													className="btn btn-sm btn-outline-primary" 
													onClick={() => handleEdit(s)}
													title="Editar proveedor"
												>
													<i className="bi bi-pencil"></i>
												</button>
												{s.has_credit && (s.current_balance || 0) > 0 && (
													<button 
														className="btn btn-sm btn-outline-success" 
														onClick={() => {
															setSelectedSupplier(s);
															setShowPaymentModal(true);
														}}
														title="Registrar pago"
													>
														<i className="bi bi-cash-coin"></i>
													</button>
												)}
												<button 
													className="btn btn-sm btn-outline-info"
													onClick={() => {
														setSelectedSupplier(s);
													}}
													title="Ver detalles de crédito"
												>
													<i className="bi bi-eye"></i>
												</button>
												<button 
													className="btn btn-sm btn-outline-danger" 
													onClick={() => handleDelete(s.id)}
													title="Eliminar proveedor"
												>
													<i className="bi bi-trash"></i>
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					{/* Paginación */}
					<div className="card-footer d-flex justify-content-between align-items-center">
						<button className="btn btn-outline-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</button>
						<span>Página {page} de {totalPages}</span>
						<button className="btn btn-outline-secondary" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Siguiente</button>
					</div>
				</div>
			)}

			{/* Modal de Estado de Crédito */}
			{selectedSupplier && !showPaymentModal && (
				<div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
					<div className="modal-dialog modal-lg">
						<div className="modal-content">
							<div className="modal-header">
								<h5 className="modal-title">
									💳 Estado de Crédito - {selectedSupplier.name}
								</h5>
								<button 
									type="button" 
									className="btn-close"
									onClick={() => setSelectedSupplier(null)}
								></button>
							</div>
							<div className="modal-body">
								<CreditStatusCard
									entityName={selectedSupplier.name}
									hasCredit={selectedSupplier.has_credit}
									creditLimit={selectedSupplier.credit_limit_decimal || 0}
									currentBalance={selectedSupplier.current_balance || 0}
									creditDays={selectedSupplier.credit_days || 0}
									type="supplier"
								/>
								
								{selectedSupplier.has_credit && (
									<div className="mt-4">
										<h6 className="text-primary mb-3">
											<i className="bi bi-info-circle me-2"></i>
											Información del Proveedor
										</h6>
										<div className="row g-3">
											<div className="col-md-6">
												<strong>Empresa:</strong> {selectedSupplier.company_name || 'No especificada'}
											</div>
											<div className="col-md-6">
												<strong>RFC:</strong> {selectedSupplier.tax_id || 'No especificado'}
											</div>
											<div className="col-md-6">
												<strong>Email:</strong> {selectedSupplier.email || 'No especificado'}
											</div>
											<div className="col-md-6">
												<strong>Teléfono:</strong> {selectedSupplier.phone || 'No especificado'}
											</div>
											<div className="col-md-12">
												<strong>Dirección:</strong> {selectedSupplier.address || 'No especificada'}
											</div>
											<div className="col-md-6">
												<strong>Contacto:</strong> {selectedSupplier.contact_person || 'No especificado'}
											</div>
											<div className="col-md-6">
												<strong>Términos de pago:</strong> {selectedSupplier.payment_terms || 'No especificados'}
											</div>
											{selectedSupplier.notes && (
												<div className="col-md-12">
													<strong>Notas:</strong> 
													<div className="bg-light p-2 rounded mt-1">{selectedSupplier.notes}</div>
												</div>
											)}
										</div>
									</div>
								)}
							</div>
							<div className="modal-footer">
								{selectedSupplier.has_credit && (selectedSupplier.current_balance || 0) > 0 && (
									<button 
										className="btn btn-success"
										onClick={() => setShowPaymentModal(true)}
									>
										<i className="bi bi-cash-coin me-2"></i>
										Registrar Pago
									</button>
								)}
								<button 
									className="btn btn-secondary"
									onClick={() => setSelectedSupplier(null)}
								>
									Cerrar
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Modal de Pago - Versión para proveedores */}
			{showPaymentModal && selectedSupplier && (
				<div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
					<div className="modal-dialog modal-lg">
						<div className="modal-content">
							<div className="modal-header bg-success text-white">
								<h5 className="modal-title">
									<i className="bi bi-cash-coin me-2"></i>
									Registrar Pago - Proveedor: {selectedSupplier.name}
								</h5>
								<button 
									type="button" 
									className="btn-close btn-close-white"
									onClick={() => setShowPaymentModal(false)}
								></button>
							</div>
							<div className="modal-body">
								<SupplierPaymentForm 
									supplier={selectedSupplier}
									onPaymentSaved={handlePaymentSaved}
									onCancel={() => setShowPaymentModal(false)}
								/>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default Suppliers;
