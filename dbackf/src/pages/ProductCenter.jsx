

import React, { useState, useEffect, useRef } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import * as XLSX from 'xlsx';
import ProductSelect from '../components/ProductSelect';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const ProductCenter = () => {
			 const [selectedProductId, setSelectedProductId] = useState(null);
			 const [showModal, setShowModal] = useState(false);
			 const [movForm, setMovForm] = useState({
				 type: '',
				 quantity: '',
				 warehouse: '',
				 reference: '',
				 notes: '',
			 });
			const [movMsg, setMovMsg] = useState('');
			const [warehouses, setWarehouses] = useState([]);
		const productSelectRef = useRef(null);
	 const [selectedProduct, setSelectedProduct] = useState(null);
	 const [kardex, setKardex] = useState([]);
	 const [loading, setLoading] = useState(false);
	 const [error, setError] = useState(null);
	 const [viewMode, setViewMode] = useState('grid'); // 'cards' o 'grid'
	 const [filter, setFilter] = useState({
		 from: '',
		 to: '',
		 type: '',
		 search: ''
	 });

	// Cargar historial de inventario (Kardex) al seleccionar producto
		 // Foco automático en selector de producto al cargar
		 useEffect(() => {
			 if (productSelectRef.current) {
				 productSelectRef.current.focus();
			 }
		 }, []);

		 useEffect(() => {
		   if (!selectedProductId) {
			   setKardex([]);
			   setError(null);
			   setSelectedProduct(null);
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

	   // Obtener el producto seleccionado (solo nombre y sku)
	   useEffect(() => {
		   if (!selectedProductId) {
			   setSelectedProduct(null);
			   return;
		   }
		   axios.get(`${API_URL}/pc/products/${selectedProductId}/`, {
			   headers: {
				   Authorization: `Bearer ${localStorage.getItem('token')}`,
			   },
		   })
			   .then(res => setSelectedProduct(res.data))
			   .catch(() => setSelectedProduct(null));
	   }, [selectedProductId]);

		 // Detectar si los movimientos son de variante por prefijo en los campos
		 const isVariant = kardex.length > 0 && Object.keys(kardex[0]).some(k => k.startsWith('variant_'));

		 // Filtrar kardex por los filtros activos
		 const filteredKardex = kardex.filter(mov => {
			 // Fecha
			 if (filter.from && new Date(mov.date) < new Date(filter.from)) return false;
			 if (filter.to && new Date(mov.date) > new Date(filter.to)) return false;
			 // Tipo
			 if (filter.type && ((isVariant ? mov.variant_movement_type ?? mov.movement_type : mov.movement_type) !== filter.type)) return false;
			 // Referencia/notas
			 if (filter.search && !(
				 (mov.reference || '').toLowerCase().includes(filter.search.toLowerCase()) ||
				 (mov.notes || '').toLowerCase().includes(filter.search.toLowerCase())
			 )) return false;
			 return true;
		 });

			// Exportar a Excel

			// Cargar almacenes reales al abrir modal
			useEffect(() => {
				if (showModal) {
					axios.get(`${API_URL}/pc/warehouses/`, {
						headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
					})
						.then(res => setWarehouses(Array.isArray(res.data) ? res.data : []))
						.catch(() => setWarehouses([]));
				}
			}, [showModal]);
	 // Registrar nuevo movimiento
	 const handleNewMovement = async (e) => {
		 e.preventDefault();
		 if (!movForm.type || !movForm.quantity || !movForm.warehouse) {
			 setMovMsg('Completa los campos obligatorios.');
			 return;
		 }
		 try {
			 await axios.post(`${API_URL}/pc/inventory/movements/`, {
				 product: selectedProductId,
				 movement_type: movForm.type,
				 quantity: movForm.quantity,
				 warehouse: movForm.warehouse,
				 reference: movForm.reference,
				 notes: movForm.notes,
			 }, {
				 headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
			 });
			 setMovMsg('Movimiento registrado correctamente.');
			 setTimeout(() => setMovMsg(''), 2000);
			 setShowModal(false);
			 setMovForm({ type: '', quantity: '', warehouse: '', reference: '', notes: '' });
			 // Opcional: recargar kardex
			 setTimeout(() => {
				 setSelectedProductId(selectedProductId);
			 }, 500);
		 } catch {
			 setMovMsg('Error al registrar movimiento.');
		 }
	 };
			const [exportMsg, setExportMsg] = useState('');
			const handleExportExcel = () => {
				if (!filteredKardex.length) return window.alert('No hay movimientos para exportar.');
				const data = filteredKardex.map(mov => ({
					Fecha: isVariant ? mov.variant_date ?? mov.date : mov.date,
					Tipo: isVariant ? mov.variant_movement_type ?? mov.movement_type : mov.movement_type,
					Entrada: (isVariant ? mov.variant_quantity_in ?? mov.quantity_in : mov.quantity_in),
					Salida: (isVariant ? mov.variant_quantity_out ?? mov.quantity_out : mov.quantity_out),
					Saldo: isVariant ? mov.variant_balance ?? mov.balance : mov.balance,
					'Precio Unitario': (isVariant ? mov.variant_unit_cost ?? mov.unit_cost : mov.unit_cost),
					'Valor Total': (isVariant ? mov.variant_total_value ?? mov.total_value : mov.total_value),
					Referencia: isVariant ? mov.variant_reference ?? mov.reference : mov.reference,
					Almacen: isVariant ? mov.variant_warehouse ?? mov.warehouse : mov.warehouse,
					Usuario: isVariant ? mov.variant_user ?? mov.user : mov.user,
					Notas: isVariant ? mov.variant_notes ?? mov.notes : mov.notes,
				}));
				const ws = XLSX.utils.json_to_sheet(data);
				const wb = XLSX.utils.book_new();
				XLSX.utils.book_append_sheet(wb, ws, 'Kardex');
				XLSX.writeFile(wb, `Kardex_${selectedProduct?.sku || selectedProductId || 'producto'}.xlsx`);
				setExportMsg('Archivo Excel exportado correctamente.');
				setTimeout(() => setExportMsg(''), 2500);
			};

			 // Estilos visuales adicionales
			 const cardStyle = {
				 transition: 'box-shadow 0.2s',
				 border: '1px solid #e3e3e3',
				 borderRadius: '0.75rem',
			 };
			 const cardHoverStyle = {
				 boxShadow: '0 0 16px 2px #0d6efd33',
				 border: '1.5px solid #0d6efd',
			 };
			 const [hoveredCard, setHoveredCard] = useState(null);

			 const rowHoverStyle = {
				 background: '#f5faff',
				 transition: 'background 0.2s',
			 };
			 const [hoveredRow, setHoveredRow] = useState(null);
		// Detectar si hay filtros activos
		const filtrosActivos = filter.from || filter.to || filter.type || filter.search;

		return (
		<div className="container mt-4" role="main" aria-label="Centro de Productos">
			<h2 tabIndex={0}>Centro de Productos</h2>
			   <ProductSelect
				   ref={productSelectRef}
				   value={selectedProductId}
				   onChange={setSelectedProductId}
				   onProductSelect={product => setSelectedProduct(product)}
				   placeholder="Buscar producto por nombre o SKU..."
				   required
				   aria-label="Buscar producto por nombre o SKU"
			   />
			{/* Barra superior con resumen y acciones */}
			{selectedProductId && (
				<div className="mt-4">
					   <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 bg-light rounded p-3 shadow-sm border border-primary-subtle" aria-label="Resumen de producto y acciones">
						<div>
							<h4 className="mb-1" tabIndex={0}>{selectedProduct ? `${selectedProduct.name} (${selectedProduct.sku || selectedProduct.code || ''})` : 'Historial de Inventario (Kardex)'}</h4>
							{/* Resumen rápido */}
							   <div className="d-flex flex-wrap gap-3" aria-label="Resumen visual de movimientos">
								   {filtrosActivos && <span className="badge bg-warning text-dark" title="Filtros activos">Filtros activos</span>}
								<span className="badge bg-info text-dark" title="Total de movimientos">Movimientos: {filteredKardex.length}</span>
								<span className="badge bg-success" title="Total de ingresos">Entradas: {filteredKardex.filter(mov => (isVariant ? mov.variant_movement_type ?? mov.movement_type : mov.movement_type) === 'INGRESO').length}</span>
								<span className="badge bg-danger" title="Total de egresos">Salidas: {filteredKardex.filter(mov => (isVariant ? mov.variant_movement_type ?? mov.movement_type : mov.movement_type) === 'EGRESO').length}</span>
								<span className="badge bg-secondary" title="Stock actual">Stock actual: {filteredKardex.length > 0 ? (isVariant ? filteredKardex[filteredKardex.length-1].variant_balance ?? filteredKardex[filteredKardex.length-1].balance : filteredKardex[filteredKardex.length-1].balance) : '-'}</span>
							</div>
						</div>
						<div className="d-flex gap-2">
							   <button className="btn btn-outline-success btn-sm" title="Nuevo movimiento" aria-label="Nuevo movimiento" tabIndex={0} onClick={() => setShowModal(true)}>
								   <i className="bi bi-plus-circle me-1"></i> Nuevo movimiento
							   </button>
							<button className="btn btn-outline-primary btn-sm" title="Exportar a Excel" aria-label="Exportar a Excel" tabIndex={0} onClick={handleExportExcel}> 
								<i className="bi bi-file-earmark-excel me-1"></i> Exportar
							</button>
							<button className="btn btn-outline-secondary btn-sm" title="Imprimir Kardex" aria-label="Imprimir Kardex" tabIndex={0} onClick={() => window.print()}>
								<i className="bi bi-printer me-1"></i> Imprimir
							</button>
										 {/* Modal para nuevo movimiento */}
													 <Modal show={showModal} onHide={() => { setShowModal(false); setMovMsg(''); setMovForm({ type: '', quantity: '', warehouse: '', reference: '', notes: '' }); }} centered>
											 <Modal.Header closeButton>
												 <Modal.Title>Registrar movimiento</Modal.Title>
											 </Modal.Header>
											 <form onSubmit={handleNewMovement}>
												 <Modal.Body>
																		 <div className="mb-2">
																			 <label className="form-label">Tipo *</label>
																			 <select className={`form-select ${!movForm.type ? 'is-invalid' : ''}`} value={movForm.type} onChange={e => setMovForm(f => ({...f, type: e.target.value}))} required>
																				 <option value="">Selecciona...</option>
																				 <option value="INGRESO">Ingreso</option>
																				 <option value="EGRESO">Egreso</option>
																			 </select>
																			 {!movForm.type && <div className="invalid-feedback">Selecciona el tipo de movimiento.</div>}
																		 </div>
																		 <div className="mb-2">
																			 <label className="form-label">Cantidad *</label>
																			 <input
																				 type="number"
																				 className={`form-control ${movForm.quantity <= 0 ? 'is-invalid' : ''}`}
																				 value={movForm.quantity}
																				 onChange={e => {
																					 const val = e.target.value;
																					 if (/^\d*\.?\d*$/.test(val)) {
																						 setMovForm(f => ({...f, quantity: val}));
																					 }
																				 }}
																				 required
																				 min={1}
																				 step="any"
																			 />
																			 {movForm.quantity <= 0 && <div className="invalid-feedback">Debe ser mayor a cero.</div>}
																			 {movForm.quantity && !/^\d*\.?\d*$/.test(movForm.quantity) && <div className="text-danger small">Solo números positivos.</div>}
																		 </div>
																							 <div className="mb-2">
																								 <label className="form-label">Almacén *</label>
																								 <select className={`form-select ${!movForm.warehouse ? 'is-invalid' : ''}`} value={movForm.warehouse} onChange={e => setMovForm(f => ({...f, warehouse: e.target.value}))} required>
																									 <option value="">Selecciona almacén...</option>
																									 {warehouses.map(w => (
																										 <option key={w.id} value={w.id}>{w.name}</option>
																									 ))}
																								 </select>
																								 {!movForm.warehouse && <div className="invalid-feedback">Selecciona un almacén.</div>}
																							 </div>
																		 <div className="mb-2">
																			 <label className="form-label">Referencia</label>
																			 <input
																				 type="text"
																				 className="form-control"
																				 value={movForm.reference}
																				 onChange={e => setMovForm(f => ({...f, reference: e.target.value}))}
																				 list="ref-list"
																				 autoComplete="off"
																				 maxLength={50}
																			 />
																			 <datalist id="ref-list">
																				 {[...new Set(filteredKardex.map(m => m.reference).filter(r => r))].slice(0, 8).map((ref, i) => (
																					 <option key={i} value={ref} />
																				 ))}
																			 </datalist>
																			 {movForm.reference.length > 50 && <div className="text-danger small">Máximo 50 caracteres.</div>}
																		 </div>
													 <div className="mb-2">
														 <label className="form-label">Notas</label>
														 <textarea
															 className={`form-control ${movForm.notes.length > 200 ? 'is-invalid' : ''}`}
															 value={movForm.notes}
															 onChange={e => setMovForm(f => ({...f, notes: e.target.value}))}
															 rows={2}
															 maxLength={250}
															 list="notes-list"
															 autoComplete="off"
														 />
														 <datalist id="notes-list">
															 {[...new Set(filteredKardex.map(m => m.notes).filter(n => n))].slice(0, 8).map((note, i) => (
																 <option key={i} value={note} />
															 ))}
														 </datalist>
														 {movForm.notes.length > 200 && (
															 <div className="invalid-feedback">Máximo 200 caracteres permitidos.</div>
														 )}
													 </div>
													 {/* Feedback visual de errores y éxito al registrar */}
													 {movMsg === 'Completa los campos obligatorios.' && (
														 <div className="alert alert-danger py-1 mt-2">
															 <ul className="mb-0 ps-3">
																 {!movForm.type && <li>Selecciona el tipo de movimiento.</li>}
																 {(!movForm.quantity || movForm.quantity <= 0) && <li>La cantidad debe ser mayor a cero.</li>}
																 {!movForm.warehouse && <li>Selecciona un almacén.</li>}
																 {movForm.reference.length > 50 && <li>Referencia: máximo 50 caracteres.</li>}
																 {movForm.notes.length > 200 && <li>Notas: máximo 200 caracteres.</li>}
															 </ul>
														 </div>
													 )}
													 {movMsg === 'Movimiento registrado correctamente.' && (
														 <div className="alert alert-success py-1 mt-2">
															 <i className="bi bi-check-circle me-1"></i> Movimiento registrado correctamente.
														 </div>
													 )}
													 {movMsg === 'Error al registrar movimiento.' && (
														 <div className="alert alert-danger py-1 mt-2">
															 <i className="bi bi-x-circle me-1"></i> Error al registrar movimiento.
														 </div>
													 )}
												 </Modal.Body>
													 <Modal.Footer>
														 <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
														 <Button
															 variant="primary"
															 type="submit"
															 disabled={
																 !movForm.type ||
																 !movForm.quantity ||
																 movForm.quantity <= 0 ||
																 !movForm.warehouse ||
																 movForm.reference.length > 50 ||
																 movForm.notes.length > 200
															 }
														 >
															 Registrar
														 </Button>
													 </Modal.Footer>
											 </form>
										 </Modal>
										 </div>
					</div>
					{/* Filtros avanzados y vista */}
					<div className="mb-3 d-flex flex-wrap gap-2 align-items-center" aria-label="Filtros y vista">
						<button
							className={`btn btn-outline-primary btn-sm me-2 ${viewMode === 'cards' ? 'active' : ''}`}
							onClick={() => setViewMode('cards')}
							aria-label="Vista de cartas"
							tabIndex={0}
							title="Ver como cartas"
						>
							<i className="bi bi-grid-3x3-gap-fill me-1"></i> Cartas
						</button>
						<button
							className={`btn btn-outline-secondary btn-sm ${viewMode === 'grid' ? 'active' : ''}`}
							onClick={() => setViewMode('grid')}
							aria-label="Vista de tabla"
							tabIndex={0}
							title="Ver como tabla"
						>
							<i className="bi bi-table me-1"></i> Tabla
						</button>
						{/* Filtros funcionales */}
						<input type="date" className="form-control form-control-sm w-auto" value={filter.from} onChange={e => setFilter(f => ({...f, from: e.target.value}))} placeholder="Desde" aria-label="Filtrar desde fecha" tabIndex={0} />
						<input type="date" className="form-control form-control-sm w-auto" value={filter.to} onChange={e => setFilter(f => ({...f, to: e.target.value}))} placeholder="Hasta" aria-label="Filtrar hasta fecha" tabIndex={0} />
						<select className="form-select form-select-sm w-auto" value={filter.type} onChange={e => setFilter(f => ({...f, type: e.target.value}))} aria-label="Filtrar por tipo" tabIndex={0}>
							<option value="">Todos los tipos</option>
							<option value="INGRESO">Ingreso</option>
							<option value="EGRESO">Egreso</option>
						</select>
						<input type="text" className="form-control form-control-sm w-auto" value={filter.search} onChange={e => setFilter(f => ({...f, search: e.target.value}))} placeholder="Referencia o notas..." aria-label="Filtrar por referencia o notas" tabIndex={0} />
					</div>
					   {loading && (
						   <div className="text-center my-3 animate__animated animate__fadeIn animate__faster">
							   <div className="spinner-border text-primary" role="status">
								   <span className="visually-hidden">Cargando...</span>
							   </div>
						   </div>
					   )}
					   {error && (
						   <div className="alert alert-danger animate__animated animate__shakeX" style={{background:'#fff3cd', color:'#842029', border:'1px solid #ffeeba'}}>{error}</div>
					   )}
					   {exportMsg && (
						   <div className="alert alert-success animate__animated animate__fadeIn" style={{background:'#d1e7dd', color:'#0f5132', border:'1px solid #badbcc'}}>{exportMsg}</div>
					   )}
					   {!loading && !error && filteredKardex.length === 0 && (
						   <div className="alert alert-warning animate__animated animate__fadeIn" style={{background:'#fff3cd', color:'#664d03', border:'1px solid #ffeeba'}}>No hay movimientos para este producto.</div>
					   )}
					{!loading && !error && filteredKardex.length > 0 && viewMode === 'cards' && (
						<div className="row">
							{filteredKardex.map((mov, idx) => {
								const tipo = isVariant ? mov.variant_movement_type ?? mov.movement_type : mov.movement_type;
								const entrada = ((tipo === 'INGRESO') ? (isVariant ? mov.variant_quantity_in ?? mov.quantity_in : mov.quantity_in) : '');
								const salida = ((tipo === 'EGRESO') ? (isVariant ? mov.variant_quantity_out ?? mov.quantity_out : mov.quantity_out) : '');
								return (
									<div key={idx} className="col-12 col-md-6 col-lg-4 mb-3">
										<div
											className="card shadow-sm h-100 animate__animated animate__fadeIn"
											style={hoveredCard === idx ? {...cardStyle, ...cardHoverStyle} : cardStyle}
											onMouseEnter={() => setHoveredCard(idx)}
											onMouseLeave={() => setHoveredCard(null)}
											tabIndex={0}
											title={`Movimiento ${tipo}`}
										>
											<div className="card-body p-3">
												<div className="d-flex justify-content-between align-items-center mb-2">
													<span className="fw-bold" title="Fecha del movimiento">{isVariant ? mov.variant_date ?? mov.date : mov.date}</span>
													<span className={`badge ${tipo === 'INGRESO' ? 'bg-success' : tipo === 'EGRESO' ? 'bg-danger' : 'bg-secondary'}`} title={tipo === 'INGRESO' ? 'Ingreso' : tipo === 'EGRESO' ? 'Egreso' : 'Otro'}>{tipo}</span>
												</div>
												<div className="mb-2">
													<span className="text-success" title="Cantidad de entrada">Entrada: <b>{entrada}</b></span>
													<span className="ms-3 text-danger" title="Cantidad de salida">Salida: <b>{salida}</b></span>
												</div>
												<div className="mb-1 small text-muted" title="Almacén">Almacén: {isVariant ? mov.variant_warehouse ?? mov.warehouse : mov.warehouse}</div>
												<div className="mb-1 small text-muted" title="Referencia">Referencia: {isVariant ? mov.variant_reference ?? mov.reference : mov.reference}</div>
												<div className="mb-1 small text-muted" title="Saldo">Saldo: {isVariant ? mov.variant_balance ?? mov.balance : mov.balance}</div>
												<div className="mb-1 small text-muted" title="Precio unitario">Precio Unit.: {(isVariant ? mov.variant_unit_cost ?? mov.unit_cost : mov.unit_cost)?.toFixed(2) ?? '0.00'}</div>
												<div className="mb-1 small text-muted" title="Valor total">Valor Total: {(isVariant ? mov.variant_total_value ?? mov.total_value : mov.total_value)?.toFixed(2) ?? '0.00'}</div>
												<div className="mb-1 small text-muted" title="Usuario">Usuario: {isVariant ? mov.variant_user ?? mov.user : mov.user}</div>
												<div className="mb-1 small text-muted" title="Notas">Notas: {isVariant ? mov.variant_notes ?? mov.notes : mov.notes}</div>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
					{!loading && !error && filteredKardex.length > 0 && viewMode === 'grid' && (
						<div className="table-responsive animate__animated animate__fadeIn">
							<table className="table table-bordered table-sm align-middle">
								<thead className="table-light">
									<tr>
										<th title="Fecha del movimiento">Fecha</th>
										<th title="Tipo de movimiento">Tipo</th>
										<th title="Cantidad de entrada">Entrada</th>
										<th title="Cantidad de salida">Salida</th>
										<th title="Saldo después del movimiento">Saldo</th>
										<th title="Precio unitario">Precio Unit.</th>
										<th title="Valor total">Valor Total</th>
										<th title="Referencia">Referencia</th>
										<th title="Almacén">Almacén</th>
										<th title="Usuario">Usuario</th>
										<th title="Notas">Notas</th>
									</tr>
								</thead>
								<tbody>
									{filteredKardex.map((mov, idx) => {
										const tipo = isVariant ? mov.variant_movement_type ?? mov.movement_type : mov.movement_type;
										const entrada = ((tipo === 'INGRESO') ? (isVariant ? mov.variant_quantity_in ?? mov.quantity_in : mov.quantity_in) : '');
										const salida = ((tipo === 'EGRESO') ? (isVariant ? mov.variant_quantity_out ?? mov.quantity_out : mov.quantity_out) : '');
										return (
											<tr key={idx}
												style={hoveredRow === idx ? rowHoverStyle : {}}
												onMouseEnter={() => setHoveredRow(idx)}
												onMouseLeave={() => setHoveredRow(null)}
												tabIndex={0}
												title={`Movimiento ${tipo}`}
											>
												<td title="Fecha del movimiento">{isVariant ? mov.variant_date ?? mov.date : mov.date}</td>
												<td>
													<span className={`badge ${tipo === 'INGRESO' ? 'bg-success' : tipo === 'EGRESO' ? 'bg-danger' : 'bg-secondary'}`} title={tipo === 'INGRESO' ? 'Ingreso' : tipo === 'EGRESO' ? 'Egreso' : 'Otro'}>{tipo}</span>
												</td>
												<td className="text-success" title="Cantidad de entrada">{entrada}</td>
												<td className="text-danger" title="Cantidad de salida">{salida}</td>
												<td title="Saldo después del movimiento">{isVariant ? mov.variant_balance ?? mov.balance : mov.balance}</td>
												<td title="Precio unitario">${(isVariant ? mov.variant_unit_cost ?? mov.unit_cost : mov.unit_cost)?.toFixed(2) ?? '0.00'}</td>
												<td title="Valor total">${(isVariant ? mov.variant_total_value ?? mov.total_value : mov.total_value)?.toFixed(2) ?? '0.00'}</td>
												<td title="Referencia">{isVariant ? mov.variant_reference ?? mov.reference : mov.reference}</td>
												<td title="Almacén">{isVariant ? mov.variant_warehouse ?? mov.warehouse : mov.warehouse}</td>
												<td title="Usuario">{isVariant ? mov.variant_user ?? mov.user : mov.user}</td>
												<td title="Notas">{isVariant ? mov.variant_notes ?? mov.notes : mov.notes}</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

export default ProductCenter;
