import React from 'react';

const CreditStatusCard = ({ 
  entityName, 
  hasCredit, 
  creditLimit, 
  currentBalance, 
  creditDays,
  type = 'customer' // 'customer' or 'supplier'
}) => {
  const getBalanceColor = () => {
    if (!hasCredit) return 'text-secondary';
    const percentage = (currentBalance / creditLimit) * 100;
    if (percentage >= 90) return 'text-danger';
    if (percentage >= 70) return 'text-warning';
    return 'text-success';
  };

  const getProgressPercentage = () => {
    if (!hasCredit || creditLimit === 0) return 0;
    return Math.min((currentBalance / creditLimit) * 100, 100);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0);
  };

  if (!hasCredit) {
    return (
      <div className="card border-secondary">
        <div className="card-body text-center py-3">
          <i className="bi bi-cash text-secondary fs-2 mb-2"></i>
          <h6 className="card-title text-secondary">Sin Crédito</h6>
          <p className="card-text small text-muted">
            {type === 'customer' ? 'Cliente' : 'Proveedor'} maneja solo pagos de contado
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-primary">
      <div className="card-header bg-primary text-white py-2">
        <div className="d-flex align-items-center">
          <i className="bi bi-credit-card me-2"></i>
          <h6 className="mb-0">Estado de Crédito</h6>
        </div>
      </div>
      <div className="card-body">
        <div className="row g-3">
          {/* Límite de Crédito */}
          <div className="col-md-6">
            <label className="form-label small text-muted">Límite de Crédito</label>
            <div className="fs-5 fw-bold text-primary">
              {formatCurrency(creditLimit)}
            </div>
          </div>

          {/* Saldo Actual */}
          <div className="col-md-6">
            <label className="form-label small text-muted">Saldo Actual</label>
            <div className={`fs-5 fw-bold ${getBalanceColor()}`}>
              {formatCurrency(currentBalance)}
            </div>
          </div>

          {/* Días de Crédito */}
          <div className="col-md-6">
            <label className="form-label small text-muted">Días de Crédito</label>
            <div className="fs-6 fw-semibold text-info">
              <i className="bi bi-calendar3 me-1"></i>
              {creditDays} días
            </div>
          </div>

          {/* Crédito Disponible */}
          <div className="col-md-6">
            <label className="form-label small text-muted">Crédito Disponible</label>
            <div className="fs-6 fw-semibold text-success">
              {formatCurrency(creditLimit - currentBalance)}
            </div>
          </div>
        </div>

        {/* Barra de Progreso */}
        <div className="mt-3">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span className="small text-muted">Utilización de Crédito</span>
            <span className="small fw-bold">{getProgressPercentage().toFixed(1)}%</span>
          </div>
          <div className="progress" style={{ height: '8px' }}>
            <div 
              className={`progress-bar ${
                getProgressPercentage() >= 90 ? 'bg-danger' : 
                getProgressPercentage() >= 70 ? 'bg-warning' : 'bg-success'
              }`}
              role="progressbar"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>

        {/* Alertas */}
        {getProgressPercentage() >= 90 && (
          <div className="alert alert-danger alert-sm mt-3 mb-0 py-2">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            <small>¡Crédito casi agotado!</small>
          </div>
        )}
        
        {getProgressPercentage() >= 70 && getProgressPercentage() < 90 && (
          <div className="alert alert-warning alert-sm mt-3 mb-0 py-2">
            <i className="bi bi-exclamation-circle-fill me-2"></i>
            <small>Crédito en nivel de precaución</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreditStatusCard;
