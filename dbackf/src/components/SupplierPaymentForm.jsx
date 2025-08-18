import React, { useState } from 'react';
import api from '../services/api';

const SupplierPaymentForm = ({ supplier, onPaymentSaved, onCancel }) => {
	const [formData, setFormData] = useState({
		amount: '',
		payment_method: 'TRANSFERENCIA',
		reference_number: '',
		notes: ''
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const paymentMethods = [
		{ value: 'EFECTIVO', label: 'Efectivo' },
		{ value: 'TRANSFERENCIA', label: 'Transferencia Bancaria' },
		{ value: 'CHEQUE', label: 'Cheque' },
		{ value: 'TARJETA', label: 'Tarjeta' },
		{ value: 'DEPOSITO', label: 'Depósito Bancario' }
	];

	const formatCurrency = (amount) => {
		return new Intl.NumberFormat('es-MX', {
			style: 'currency',
			currency: 'MXN'
		}).format(amount || 0);
	};

	const handleChange = (e) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value
		});
	};

	const handleSetFullAmount = () => {
		setFormData({
			...formData,
			amount: supplier.current_balance?.toString() || '0'
		});
	};

	const handleSavePayment = async (e) => {
		e.preventDefault();
		
		if (!formData.amount || parseFloat(formData.amount) <= 0) {
			setError('El monto debe ser mayor que 0');
			return;
		}

		if (parseFloat(formData.amount) > (supplier.current_balance || 0)) {
			setError('El monto no puede ser mayor al saldo actual');
			return;
		}

		setLoading(true);
		setError('');

		try {
			const paymentData = {
				supplier: supplier.id,
				amount: parseFloat(formData.amount),
				payment_method: formData.payment_method,
				reference_number: formData.reference_number,
				notes: formData.notes
			};

			await api.post('/supplier-payments/', paymentData);
			
			// Llamar al callback para actualizar la lista
			onPaymentSaved();
		} catch (err) {
			console.error('Error al registrar pago:', err);
			setError('Error al registrar el pago: ' + (err.response?.data?.message || err.message));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div>
			{/* Información del proveedor */}
			<div className="card mb-4 border-danger">
				<div className="card-header bg-danger text-white">
					<h6 className="mb-0">
						<i className="bi bi-building me-2"></i>
						Información del Proveedor
					</h6>
				</div>
				<div className="card-body">
					<div className="row g-3">
						<div className="col-md-6">
							<strong>Proveedor:</strong> {supplier.name}
						</div>
						<div className="col-md-6">
							<strong>Empresa:</strong> {supplier.company_name || 'No especificada'}
						</div>
						<div className="col-md-6">
							<strong>Saldo Actual:</strong> 
							<span className="text-danger fw-bold ms-2">
								{formatCurrency(supplier.current_balance || 0)}
							</span>
						</div>
						<div className="col-md-6">
							<strong>Límite de Crédito:</strong> 
							<span className="text-info fw-bold ms-2">
								{formatCurrency(supplier.credit_limit_decimal || 0)}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Formulario de pago */}
			<form onSubmit={handleSavePayment}>
				<div className="row g-3 mb-3">
					<div className="col-md-6">
						<label className="form-label fw-bold">
							<i className="bi bi-cash me-1"></i>
							Monto del Pago *
						</label>
						<div className="input-group">
							<span className="input-group-text">$</span>
							<input
								type="number"
								className="form-control"
								name="amount"
								value={formData.amount}
								onChange={handleChange}
								min="0.01"
								max={supplier.current_balance || 0}
								step="0.01"
								placeholder="0.00"
								required
							/>
							<button
								type="button"
								className="btn btn-outline-info"
								onClick={handleSetFullAmount}
								title="Pagar saldo completo"
							>
								<i className="bi bi-check-all"></i>
							</button>
						</div>
						<small className="text-muted">
							Máximo: {formatCurrency(supplier.current_balance || 0)}
						</small>
					</div>

					<div className="col-md-6">
						<label className="form-label fw-bold">
							<i className="bi bi-credit-card me-1"></i>
							Método de Pago *
						</label>
						<select
							className="form-select"
							name="payment_method"
							value={formData.payment_method}
							onChange={handleChange}
							required
						>
							{paymentMethods.map(method => (
								<option key={method.value} value={method.value}>
									{method.label}
								</option>
							))}
						</select>
					</div>

					<div className="col-md-12">
						<label className="form-label fw-bold">
							<i className="bi bi-hash me-1"></i>
							Número de Referencia
						</label>
						<input
							type="text"
							className="form-control"
							name="reference_number"
							value={formData.reference_number}
							onChange={handleChange}
							placeholder="Número de folio, transferencia, cheque, etc."
						/>
					</div>

					<div className="col-md-12">
						<label className="form-label fw-bold">
							<i className="bi bi-chat-left-text me-1"></i>
							Notas adicionales
						</label>
						<textarea
							className="form-control"
							name="notes"
							value={formData.notes}
							onChange={handleChange}
							rows="3"
							placeholder="Notas sobre el pago..."
						></textarea>
					</div>
				</div>

				{error && (
					<div className="alert alert-danger">
						<i className="bi bi-exclamation-triangle me-2"></i>
						{error}
					</div>
				)}

				{/* Resumen del pago */}
				{formData.amount && parseFloat(formData.amount) > 0 && (
					<div className="card mb-3 border-success">
						<div className="card-header bg-light">
							<h6 className="mb-0 text-success">
								<i className="bi bi-calculator me-2"></i>
								Resumen del Pago
							</h6>
						</div>
						<div className="card-body">
							<div className="row">
								<div className="col-md-6">
									<strong>Saldo Actual:</strong> 
									<span className="text-danger ms-2">
										{formatCurrency(supplier.current_balance || 0)}
									</span>
								</div>
								<div className="col-md-6">
									<strong>Pago a Realizar:</strong> 
									<span className="text-warning ms-2">
										{formatCurrency(parseFloat(formData.amount) || 0)}
									</span>
								</div>
								<div className="col-md-12 mt-2">
									<strong>Saldo Después del Pago:</strong> 
									<span className="text-success fw-bold ms-2">
										{formatCurrency((supplier.current_balance || 0) - (parseFloat(formData.amount) || 0))}
									</span>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Botones de acción */}
				<div className="d-flex justify-content-end gap-2">
					<button
						type="button"
						className="btn btn-secondary"
						onClick={onCancel}
						disabled={loading}
					>
						<i className="bi bi-x-circle me-2"></i>
						Cancelar
					</button>
					<button
						type="submit"
						className="btn btn-success"
						disabled={loading || !formData.amount || parseFloat(formData.amount) <= 0}
					>
						{loading ? (
							<>
								<span className="spinner-border spinner-border-sm me-2" role="status"></span>
								Registrando...
							</>
						) : (
							<>
								<i className="bi bi-check-circle me-2"></i>
								Registrar Pago
							</>
						)}
					</button>
				</div>
			</form>
		</div>
	);
};

export default SupplierPaymentForm;
