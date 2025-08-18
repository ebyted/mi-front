import React, { useState } from 'react';
import axios from 'axios';

const PaymentModal = ({ 
  show, 
  onClose, 
  onPaymentSaved, 
  orderId, 
  orderType, // 'purchase' or 'sale'
  orderNumber,
  totalAmount, 
  paidAmount = 0,
  currency = 'MXN'
}) => {
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'TRANSFERENCIA',
    reference_number: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const remainingAmount = totalAmount - paidAmount;

  const paymentMethods = [
    { value: 'EFECTIVO', label: 'Efectivo' },
    { value: 'TRANSFERENCIA', label: 'Transferencia Bancaria' },
    { value: 'CHEQUE', label: 'Cheque' },
    { value: 'TARJETA_CREDITO', label: 'Tarjeta de Crédito' },
    { value: 'TARJETA_DEBITO', label: 'Tarjeta de Débito' },
    { value: 'DEPOSITO', label: 'Depósito Bancario' }
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency
    }).format(amount || 0);
  };

  const handleInputChange = (field, value) => {
    setPaymentData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSavePayment = async () => {
    // Validaciones
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      alert('Por favor ingresa un monto válido');
      return;
    }

    if (parseFloat(paymentData.amount) > remainingAmount) {
      alert(`El monto no puede ser mayor al saldo pendiente: ${formatCurrency(remainingAmount)}`);
      return;
    }

    if (!paymentData.payment_method) {
      alert('Por favor selecciona un método de pago');
      return;
    }

    try {
      setSaving(true);
      
      const endpoint = orderType === 'purchase' 
        ? `${import.meta.env.VITE_API_URL}/purchase-order-payments/`
        : `${import.meta.env.VITE_API_URL}/sale-payments/`;

      const payload = {
        ...paymentData,
        amount: parseFloat(paymentData.amount),
        [orderType === 'purchase' ? 'purchase_order' : 'sale']: orderId
      };

      await axios.post(endpoint, payload);

      // Resetear formulario
      setPaymentData({
        amount: '',
        payment_method: 'TRANSFERENCIA',
        reference_number: '',
        notes: ''
      });

      alert('Pago registrado exitosamente');
      
      if (onPaymentSaved) {
        onPaymentSaved();
      }
      
      onClose();
      
    } catch (error) {
      console.error('Error registrando pago:', error);
      alert('Error al registrar el pago');
    } finally {
      setSaving(false);
    }
  };

  const handleSetFullAmount = () => {
    setPaymentData(prev => ({
      ...prev,
      amount: remainingAmount.toString()
    }));
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          {/* Header */}
          <div className="modal-header bg-success text-white">
            <h5 className="modal-title">
              <i className="bi bi-cash-coin me-2"></i>
              Registrar Pago - {orderType === 'purchase' ? 'Orden de Compra' : 'Venta'} #{orderNumber}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            {/* Información de la Orden */}
            <div className="card mb-4">
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-3">
                    <label className="form-label small text-muted">Monto Total</label>
                    <div className="fw-bold text-primary fs-5">
                      {formatCurrency(totalAmount)}
                    </div>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small text-muted">Pagado</label>
                    <div className="fw-bold text-success fs-5">
                      {formatCurrency(paidAmount)}
                    </div>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small text-muted">Saldo Pendiente</label>
                    <div className="fw-bold text-warning fs-5">
                      {formatCurrency(remainingAmount)}
                    </div>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small text-muted">Estado</label>
                    <div>
                      {remainingAmount <= 0 ? (
                        <span className="badge bg-success fs-6">Pagado</span>
                      ) : paidAmount > 0 ? (
                        <span className="badge bg-warning fs-6">Parcial</span>
                      ) : (
                        <span className="badge bg-danger fs-6">Pendiente</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {remainingAmount <= 0 ? (
              <div className="alert alert-success text-center">
                <i className="bi bi-check-circle-fill fs-1 mb-2 d-block"></i>
                <h5>Esta orden ya está completamente pagada</h5>
                <p>No hay saldo pendiente por pagar</p>
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
                      max={remainingAmount}
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
                    Máximo: {formatCurrency(remainingAmount)}
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
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              <i className="bi bi-x-circle me-2"></i>
              Cancelar
            </button>
            
            {remainingAmount > 0 && (
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
      </div>
    </div>
  );
};

export default PaymentModal;
