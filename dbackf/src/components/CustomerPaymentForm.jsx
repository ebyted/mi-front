import React, { useState } from 'react';
import api from '../services/api';

const CustomerPaymentForm = ({ customer, onPaymentSaved, onCancel }) => {
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'TRANSFERENCIA',
    reference_number: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const paymentMethods = [
    { value: 'EFECTIVO', label: 'Efectivo' },
    { value: 'TRANSFERENCIA', label: 'Transferencia Bancaria' },
    { value: 'CHEQUE', label: 'Cheque' },
    { value: 'TARJETA', label: 'Tarjeta de Crédito' },
    { value: 'DEPOSITO', label: 'Depósito Bancario' }
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0);
  };

  const handleInputChange = (field, value) => {
    setPaymentData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSetFullAmount = () => {
    setPaymentData(prev => ({
      ...prev,
      amount: customer.current_balance.toString()
    }));
  };

  const handleSavePayment = async () => {
    // Validaciones
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      alert('Por favor ingresa un monto válido');
      return;
    }

    if (parseFloat(paymentData.amount) > customer.current_balance) {
      alert(`El monto no puede ser mayor al saldo actual: ${formatCurrency(customer.current_balance)}`);
      return;
    }

    if (!paymentData.payment_method) {
      alert('Por favor selecciona un método de pago');
      return;
    }

    try {
      setSaving(true);
      
      const payload = {
        ...paymentData,
        amount: parseFloat(paymentData.amount),
        customer: customer.id
      };

      await api.post('/customer-payments/', payload);

      alert('Pago registrado exitosamente');
      
      if (onPaymentSaved) {
        onPaymentSaved();
      }
      
    } catch (error) {
      console.error('Error registrando pago:', error);
      alert('Error al registrar el pago: ' + (error.response?.data?.detail || error.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Información del Cliente */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label small text-muted">Cliente</label>
              <div className="fw-bold text-primary">
                {customer.name}
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label small text-muted">Código</label>
              <div className="fw-bold">
                <code>{customer.code}</code>
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label small text-muted">Saldo Actual</label>
              <div className="fw-bold text-danger fs-5">
                {formatCurrency(customer.current_balance)}
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label small text-muted">Límite de Crédito</label>
              <div className="fw-bold text-info">
                {formatCurrency(customer.credit_limit)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {customer.current_balance <= 0 ? (
        <div className="alert alert-success text-center">
          <i className="bi bi-check-circle-fill fs-1 mb-2 d-block"></i>
          <h5>Este cliente no tiene saldo pendiente</h5>
          <p>Su cuenta está al corriente</p>
        </div>
      ) : (
        <div className="row g-3">
          {/* Monto del Pago */}
          <div className="col-md-6">
            <label className="form-label">Monto del Pago *</label>
            <div className="input-group">
              <span className="input-group-text">$</span>
              <input
                type="number"
                className="form-control"
                min="0.01"
                max={customer.current_balance}
                step="0.01"
                value={paymentData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                placeholder="0.00"
              />
              <button 
                className="btn btn-outline-secondary"
                type="button"
                onClick={handleSetFullAmount}
                title="Pagar saldo completo"
              >
                <i className="bi bi-check-all"></i>
              </button>
            </div>
            <div className="form-text">
              Saldo disponible: {formatCurrency(customer.current_balance)}
            </div>
          </div>

          {/* Método de Pago */}
          <div className="col-md-6">
            <label className="form-label">Método de Pago *</label>
            <select
              className="form-select"
              value={paymentData.payment_method}
              onChange={(e) => handleInputChange('payment_method', e.target.value)}
            >
              {paymentMethods.map(method => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          {/* Número de Referencia */}
          <div className="col-12">
            <label className="form-label">Número de Referencia</label>
            <input
              type="text"
              className="form-control"
              value={paymentData.reference_number}
              onChange={(e) => handleInputChange('reference_number', e.target.value)}
              placeholder="Número de transferencia, cheque, etc."
            />
          </div>

          {/* Notas */}
          <div className="col-12">
            <label className="form-label">Notas Adicionales</label>
            <textarea
              className="form-control"
              rows="3"
              value={paymentData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Observaciones sobre el pago..."
            />
          </div>
        </div>
      )}

      {/* Botones */}
      <div className="d-flex justify-content-end gap-2 mt-4">
        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={onCancel}
        >
          <i className="bi bi-x-circle me-2"></i>
          Cancelar
        </button>
        
        {customer.current_balance > 0 && (
          <button 
            type="button" 
            className="btn btn-success"
            onClick={handleSavePayment}
            disabled={saving || !paymentData.amount}
          >
            {saving ? (
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
        )}
      </div>
    </div>
  );
};

export default CustomerPaymentForm;
