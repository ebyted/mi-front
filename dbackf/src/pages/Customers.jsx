import React, { useEffect, useState } from 'react';
import api from '../services/api';

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
	});
	const [editingId, setEditingId] = useState(null);
	const [search, setSearch] = useState('');
	const [page, setPage] = useState(1);
	const pageSize = 10;

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
		try {
			if (editingId) {
				await api.put(`/customers/${editingId}/`, form);
			} else {
				await api.post('/customers/', form);
			}
			setForm({ name: '', email: '', phone: '', address: '', code: '', level: 1 });
			setEditingId(null);
			loadCustomers();
		} catch (err) {
			setError('Error al guardar el cliente');
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
				<div className="row g-3">
					<div className="col-md-4">
						<input name="name" className="form-control" placeholder="Nombre" value={form.name} onChange={handleChange} required />
					</div>
					<div className="col-md-3">
						<input name="email" className="form-control" placeholder="Email" value={form.email} onChange={handleChange} />
					</div>
					<div className="col-md-2">
						<input name="phone" className="form-control" placeholder="Teléfono" value={form.phone} onChange={handleChange} />
					</div>
					<div className="col-md-3">
						<input name="address" className="form-control" placeholder="Dirección" value={form.address} onChange={handleChange} />
					</div>
					<div className="col-md-2">
						<input name="code" className="form-control" placeholder="Código" value={form.code} onChange={handleChange} />
					</div>
					<div className="col-md-2">
						<select name="level" className="form-select" value={form.level} onChange={handleChange}>
							<option value={1}>🥉 Nivel 1</option>
							<option value={2}>🥈 Nivel 2</option>
							<option value={3}>🥇 Nivel 3</option>
							<option value={4}>💎 Nivel 4</option>
						</select>
					</div>
					<div className="col-md-2">
						<button type="submit" className="btn btn-success w-100">{editingId ? 'Actualizar' : 'Crear'}</button>
					</div>
					{editingId && (
						<div className="col-md-2">
							<button type="button" className="btn btn-secondary w-100" onClick={() => { setEditingId(null); setForm({ name: '', email: '', phone: '', address: '', code: '', level: 1 }); }}>Cancelar</button>
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
			{error && <div className="alert alert-danger">{error}</div>}
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
									<th>Dirección</th>
									<th>Código</th>
									<th>Nivel</th>
									<th>Acciones</th>
								</tr>
							</thead>
							<tbody>
								{paged.map(c => (
									<tr key={c.id}>
										<td>{c.name}</td>
										<td>{c.email}</td>
										<td>{c.phone}</td>
										<td>{c.address}</td>
										<td>{c.code}</td>
										<td><span className={`badge ${levelBadges[c.level || 1]}`}>Nivel {c.level || 1}</span></td>
										<td>
											<button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleEdit(c)}><i className="bi bi-pencil"></i></button>
											<button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(c.id)}><i className="bi bi-trash"></i></button>
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
		</div>
	);
}

export default Customers;
