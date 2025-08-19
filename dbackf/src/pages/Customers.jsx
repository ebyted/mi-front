import React, { useEffect, useState } from 'react';
import api from '../services/api';
import CreditStatusCard from '../components/CreditStatusCard';
import CustomerPaymentForm from '../components/CustomerPaymentForm';

const levelBadges = {
	1: 'bg-secondary',
	2: 'bg-info',
	3: 'bg-warning',
	4: 'bg-success',
};

function Customers() {
	const [customers, setCustomers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [form, setForm] = useState({
		name: '',
		email: '',
		phone: '',
		address: '',
		code: '',
		level: 1,
		business: 1, // ID del business por defecto
		customer_type: 1, // ID del customer_type por defecto
		has_credit: false,
		credit_limit: 0,
		credit_days: 30,
		current_balance: 0,
	});
	const [editingId, setEditingId] = useState(null);
	const [search, setSearch] = useState('');
	const [page, setPage] = useState(1);
	const pageSize = 10;
	
	// Estados para gestión de crédito
	const [selectedCustomer, setSelectedCustomer] = useState(null);
	const [showPaymentModal, setShowPaymentModal] = useState(false);

	// Funciones auxiliares
	const formatCurrency = (amount) => {
		return new Intl.NumberFormat('es-MX', {
			style: 'currency',
			currency: 'MXN'
		}).format(amount || 0);
	};

	const handlePaymentSaved = async () => {
		// Recargar la lista de clientes para actualizar los saldos
		await loadCustomers();
		setShowPaymentModal(false);
		setSelectedCustomer(null);
	};

	useEffect(() => {
		loadCustomers();
	}, []);

	const loadCustomers = async () => {
		setLoading(true);
		try {
			const res = await api.get('/customers/');
			setCustomers(res.data || []);
		} catch (err) {
			setError('No se pudo cargar los clientes');
		} finally {
			setLoading(false);
		}
	};

	const handleChange = e => {
		setForm({ ...form, [e.target.name]: e.target.value });
	};

	const handleEdit = customer => {
		setForm({
			name: customer.name || '',
			email: customer.email || '',
			phone: customer.phone || '',
			address: customer.address || '',
			code: customer.code || '',
			level: customer.level || 1,
			business: customer.business || 1,
			customer_type: customer.customer_type || 1,
			has_credit: customer.has_credit || false,
			credit_limit: customer.credit_limit || 0,
			credit_days: customer.credit_days || 30,
			current_balance: customer.current_balance || 0,
		});
		setEditingId(customer.id);
	};

	const handleDelete = async id => {
		if (!window.confirm('¿Eliminar este cliente?')) return;
		await api.delete(`/customers/${id}/`);
		loadCustomers();
	};

	const handleSubmit = async e => {
		e.preventDefault();
		
		// Validar campos obligatorios
		if (!form.name.trim()) {
			setError('El nombre del cliente es obligatorio');
			return;
		}
		if (!form.code.trim()) {
			setError('El código del cliente es obligatorio');
			return;
		}
		if (!form.email.trim()) {
			setError('El email del cliente es obligatorio');
			return;
		}
		
		// Limpiar error previo
		setError('');
		
		try {
		// Preparar datos para enviar al backend
		const submitData = {
			name: form.name.trim(),
			email: form.email.trim().toLowerCase(),
			phone: form.phone.trim(),
			address: form.address.trim(),
			code: form.code.trim().toUpperCase(),
			business: form.business,
			customer_type: form.customer_type,
			is_active: true,
			has_credit: form.has_credit,
			credit_limit: parseFloat(form.credit_limit) || 0,
			credit_days: parseInt(form.credit_days) || 30,
			current_balance: parseFloat(form.current_balance) || 0,
		};			if (editingId) {
				await api.put(`/customers/${editingId}/`, submitData);
			} else {
				await api.post('/customers/', submitData);
			}
			setForm({ name: '', email: '', phone: '', address: '', code: '', level: 1, business: 1, customer_type: 1, has_credit: false, credit_limit: 0, credit_days: 30, current_balance: 0 });
			setEditingId(null);
			loadCustomers();
		} catch (err) {
			console.error('Error completo:', err);
			console.error('Respuesta del servidor:', err.response?.data);
			
			// Manejo específico de errores de validación del backend
			if (err.response?.status === 400 && err.response?.data) {
				const backendErrors = err.response.data;
				let errorMessage = 'Error de validación:\n';
				
				// Mostrar errores específicos por campo
				Object.keys(backendErrors).forEach(field => {
					const fieldErrors = Array.isArray(backendErrors[field]) 
						? backendErrors[field] 
						: [backendErrors[field]];
					
					fieldErrors.forEach(error => {
						switch(field) {
							case 'code':
								errorMessage += `• Código: ${error}\n`;
								break;
							case 'email':
								errorMessage += `• Email: ${error}\n`;
								break;
							case 'name':
								errorMessage += `• Nombre: ${error}\n`;
								break;
							case 'customer_type':
								errorMessage += `• Tipo de cliente: ${error}\n`;
								break;
							default:
								errorMessage += `• ${field}: ${error}\n`;
						}
					});
				});
				
				setError(errorMessage);
			} else {
				setError(`Error al guardar el cliente: ${err.response?.data?.message || err.message}`);
			}
		}
	};

	// Búsqueda y paginación
	const filtered = customers.filter(c =>
		c.name?.toLowerCase().includes(search.toLowerCase()) ||
		c.email?.toLowerCase().includes(search.toLowerCase()) ||
		c.code?.toLowerCase().includes(search.toLowerCase())
	);
	const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
	const totalPages = Math.ceil(filtered.length / pageSize);

	return (
		<div className="container py-4">
			<h2 className="mb-4 text-primary">Gestión de Clientes</h2>
			<form className="card p-3 mb-4" onSubmit={handleSubmit}>
				<div className="card-header bg-light mb-3">
					<h6 className="mb-0 text-muted">
						<i className="bi bi-info-circle me-2"></i>
						Campos obligatorios marcados con <span className="text-danger">*</span>
					</h6>
				</div>
				<div className="row g-3">
					<div className="col-md-4">
						<label className="form-label small text-muted">Nombre <span className="text-danger">*</span></label>
						<input name="name" className="form-control" placeholder="Nombre del cliente" value={form.name} onChange={handleChange} required />
					</div>
					<div className="col-md-3">
						<label className="form-label small text-muted">Email <span className="text-danger">*</span></label>
						<input name="email" type="email" className="form-control" placeholder="cliente@email.com" value={form.email} onChange={handleChange} required />
					</div>
					<div className="col-md-2">
						<label className="form-label small text-muted">Teléfono</label>
						<input name="phone" className="form-control" placeholder="123-456-7890" value={form.phone} onChange={handleChange} />
					</div>
					<div className="col-md-3">
						<label className="form-label small text-muted">Dirección</label>
						<input name="address" className="form-control" placeholder="Dirección del cliente" value={form.address} onChange={handleChange} />
					</div>
					<div className="col-md-2">
						<label className="form-label small text-muted">Código <span className="text-danger">*</span></label>
						<input 
							name="code" 
							className="form-control" 
							placeholder="CLI001" 
							value={form.code} 
							onChange={handleChange} 
							required 
							style={{textTransform: 'uppercase'}}
						/>
					</div>
					<div className="col-md-2">
						<label className="form-label small text-muted">Tipo de Cliente <span className="text-danger">*</span></label>
						<select name="customer_type" className="form-select" value={form.customer_type} onChange={handleChange} required>
							<option value={1}>🥉 Nivel 1 (0%)</option>
							<option value={2}>🥈 Nivel 2 (5%)</option>
							<option value={3}>🥇 Nivel 3 (10%)</option>
							<option value={4}>💎 Nivel 4 (15%)</option>
						</select>
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
							<label className="form-check-label fw-bold text-primary" htmlFor="hasCredit">
								💳 Cliente con Crédito
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
										name="credit_limit" 
										type="number" 
										className="form-control" 
										placeholder="0.00" 
										value={form.credit_limit} 
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
								<label className="form-label small text-muted">Saldo Actual</label>
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
					<div className="col-md-2">
						<button type="submit" className="btn btn-success w-100">{editingId ? 'Actualizar' : 'Crear'}</button>
					</div>
					{editingId && (
						<div className="col-md-2">
							<button type="button" className="btn btn-secondary w-100" onClick={() => { setEditingId(null); setForm({ name: '', email: '', phone: '', address: '', code: '', level: 1, business: 1, customer_type: 1, has_credit: false, credit_limit: 0, credit_days: 30, current_balance: 0 }); }}>Cancelar</button>
						</div>
					)}
				</div>
			</form>
			<div className="mb-3 d-flex justify-content-between align-items-center">
				<input className="form-control w-50" placeholder="Buscar por nombre, email o código..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
				<div>
					<span className="badge bg-primary">Total: {filtered.length}</span>
				</div>
			</div>
			{error && (
				<div className="alert alert-danger">
					<h6 className="alert-heading mb-2">
						<i className="bi bi-exclamation-triangle me-2"></i>
						Error al guardar el cliente
					</h6>
					<div style={{whiteSpace: 'pre-line'}}>{error}</div>
				</div>
			)}
			{loading ? (
				<div className="text-center py-5">
					<div className="spinner-border text-primary" role="status"></div>
					<p className="mt-2">Cargando clientes...</p>
				</div>
			) : (
				<div className="card shadow">
					<div className="card-header bg-light">
						<h5 className="mb-0">Lista de Clientes <span className="badge bg-primary ms-2">{filtered.length}</span></h5>
					</div>
					<div className="table-responsive">
						<table className="table table-hover mb-0">
							<thead className="table-primary">
								<tr>
									<th>Nombre</th>
									<th>Email</th>
									<th>Teléfono</th>
									<th>Código</th>
									<th>Nivel</th>
									<th>Crédito</th>
									<th>Saldo</th>
									<th>Acciones</th>
								</tr>
							</thead>
							<tbody>
								{paged.map(c => (
									<tr key={c.id}>
										<td>
											<div className="fw-bold">{c.name}</div>
											{c.address && <small className="text-muted">{c.address}</small>}
										</td>
										<td>
											<small>{c.email}</small>
										</td>
										<td>
											<small>{c.phone}</small>
										</td>
										<td>
											<code className="small">{c.code}</code>
										</td>
										<td>
											<span className={`badge ${levelBadges[c.level || 1]}`}>
												Nivel {c.level || 1}
											</span>
										</td>
										<td>
											{c.has_credit ? (
												<div>
													<div className="small text-success fw-bold">
														💳 ${new Intl.NumberFormat('es-MX').format(c.credit_limit || 0)}
													</div>
													<small className="text-muted">{c.credit_days || 0} días</small>
												</div>
											) : (
												<span className="badge bg-secondary">
													<i className="bi bi-cash me-1"></i>Contado
												</span>
											)}
										</td>
										<td>
											{c.has_credit ? (
												<div className={`small fw-bold ${
													(c.current_balance || 0) > 0 ? 'text-danger' : 'text-success'
												}`}>
													${new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2 }).format(c.current_balance || 0)}
												</div>
											) : (
												<span className="text-muted">-</span>
											)}
										</td>
										<td>
											<div className="btn-group" role="group">
												<button 
													className="btn btn-sm btn-outline-primary" 
													onClick={() => handleEdit(c)}
													title="Editar cliente"
												>
													<i className="bi bi-pencil"></i>
												</button>
												{c.has_credit && (c.current_balance || 0) > 0 && (
													<button 
														className="btn btn-sm btn-outline-success" 
														onClick={() => {
															setSelectedCustomer(c);
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
														setSelectedCustomer(c);
													}}
													title="Ver detalles de crédito"
												>
													<i className="bi bi-eye"></i>
												</button>
												<button 
													className="btn btn-sm btn-outline-danger" 
													onClick={() => handleDelete(c.id)}
													title="Eliminar cliente"
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
			{selectedCustomer && !showPaymentModal && (
				<div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
					<div className="modal-dialog modal-lg">
						<div className="modal-content">
							<div className="modal-header">
								<h5 className="modal-title">
									💳 Estado de Crédito - {selectedCustomer.name}
								</h5>
								<button 
									type="button" 
									className="btn-close"
									onClick={() => setSelectedCustomer(null)}
								></button>
							</div>
							<div className="modal-body">
								<CreditStatusCard
									entityName={selectedCustomer.name}
									hasCredit={selectedCustomer.has_credit}
									creditLimit={selectedCustomer.credit_limit || 0}
									currentBalance={selectedCustomer.current_balance || 0}
									creditDays={selectedCustomer.credit_days || 0}
									type="customer"
								/>
								
								{selectedCustomer.has_credit && (
									<div className="mt-4">
										<h6 className="text-primary mb-3">
											<i className="bi bi-info-circle me-2"></i>
											Información del Cliente
										</h6>
										<div className="row g-3">
											<div className="col-md-6">
												<strong>Email:</strong> {selectedCustomer.email || 'No especificado'}
											</div>
											<div className="col-md-6">
												<strong>Teléfono:</strong> {selectedCustomer.phone || 'No especificado'}
											</div>
											<div className="col-md-12">
												<strong>Dirección:</strong> {selectedCustomer.address || 'No especificada'}
											</div>
											<div className="col-md-6">
												<strong>Código:</strong> <code>{selectedCustomer.code}</code>
											</div>
											<div className="col-md-6">
												<strong>Nivel:</strong> 
												<span className={`badge ms-2 ${levelBadges[selectedCustomer.level || 1]}`}>
													Nivel {selectedCustomer.level || 1}
												</span>
											</div>
										</div>
									</div>
								)}
							</div>
							<div className="modal-footer">
								{selectedCustomer.has_credit && (selectedCustomer.current_balance || 0) > 0 && (
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
									onClick={() => setSelectedCustomer(null)}
								>
									Cerrar
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Modal de Pago - Versión simplificada para clientes */}
			{showPaymentModal && selectedCustomer && (
				<div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
					<div className="modal-dialog modal-lg">
						<div className="modal-content">
							<div className="modal-header bg-success text-white">
								<h5 className="modal-title">
									<i className="bi bi-cash-coin me-2"></i>
									Registrar Pago - Cliente: {selectedCustomer.name}
								</h5>
								<button 
									type="button" 
									className="btn-close btn-close-white"
									onClick={() => setShowPaymentModal(false)}
								></button>
							</div>
							<div className="modal-body">
								<CustomerPaymentForm 
									customer={selectedCustomer}
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

export default Customers;
