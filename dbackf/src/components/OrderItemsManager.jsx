import React, { useState } from 'react';
import ProductSelect from './ProductSelect';

const OrderItemsManager = ({ items, setItems }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    product_variant: '',
    quantity: 1,
    unit_price: 0,
    product_name: '',
    product_code: ''
  });

  const addItem = () => {
    if (!newItem.product_variant || newItem.quantity <= 0) {
      alert('Producto y cantidad son requeridos');
      return;
    }
    
    // Validar duplicados
    const exists = items.find(item => item.product_variant === newItem.product_variant);
    if (exists) {
      alert('Este producto ya está agregado');
      return;
    }

    setItems([...items, { 
      ...newItem,
      quantity: parseFloat(newItem.quantity),
      unit_price: parseFloat(newItem.unit_price)
    }]);
    setNewItem({ 
      product_variant: '', 
      quantity: 1, 
      unit_price: 0,
      product_name: '',
      product_code: ''
    });
    setShowAddForm(false);
  };

  const updateItem = (index, field, value) => {
    const updated = items.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    );
    setItems(updated);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      return total + (parseFloat(item.quantity) * parseFloat(item.unit_price));
    }, 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0);
  };

  return (
    <div className="order-items-manager">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">Items de la Orden ({items.length})</h6>
        <button 
          type="button" 
          className="btn btn-outline-success btn-sm"
          onClick={() => setShowAddForm(true)}
        >
          <i className="bi bi-plus-circle me-1"></i>
          Agregar Producto
        </button>
      </div>

      {/* Formulario de agregar */}
      {showAddForm && (
        <div className="card border-success mb-3">
          <div className="card-body">
            <div className="row g-2 align-items-end">
              <div className="col-md-6">
                <ProductSelect
                  value={newItem.product_variant}
                  onChange={(value, product) => {
                    setNewItem(prev => ({
                      ...prev, 
                      product_variant: value,
                      product_name: product?.name || '',
                      product_code: product?.code || '',
                      unit_price: product?.sale_price || 0
                    }));
                  }}
                  placeholder="Seleccionar producto..."
                />
              </div>
              <div className="col-md-2">
                <input
                  type="number"
                  className="form-control"
                  placeholder="Cant."
                  value={newItem.quantity}
                  onChange={(e) => setNewItem(prev => ({...prev, quantity: e.target.value}))}
                  min="1"
                />
              </div>
              <div className="col-md-2">
                <input
                  type="number"
                  className="form-control"
                  placeholder="Precio"
                  value={newItem.unit_price}
                  onChange={(e) => setNewItem(prev => ({...prev, unit_price: e.target.value}))}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="col-md-2">
                <div className="btn-group w-100">
                  <button type="button" className="btn btn-success btn-sm" onClick={addItem}>
                    <i className="bi bi-check"></i>
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddForm(false)}>
                    <i className="bi bi-x"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de items */}
      {items.length > 0 ? (
        <div className="table-responsive">
          <table className="table table-sm">
            <thead className="table-light">
              <tr>
                <th>Producto</th>
                <th width="100">Cantidad</th>
                <th width="120">Precio Unit.</th>
                <th width="120">Subtotal</th>
                <th width="80">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td>
                    <small className="text-muted">SKU: {item.product_code || 'N/A'}</small><br/>
                    {item.product_name || 'Producto no encontrado'}
                  </td>
                  <td>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      min="1"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td>
                    <strong>{formatCurrency(parseFloat(item.quantity) * parseFloat(item.unit_price))}</strong>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => removeItem(index)}
                      title="Eliminar"
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="table-success">
              <tr>
                <th colSpan="3">Total de la Orden:</th>
                <th>{formatCurrency(calculateTotal())}</th>
                <th></th>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="text-center py-4 text-muted">
          <i className="bi bi-cart-x display-6"></i>
          <p className="mt-2">No hay productos agregados</p>
        </div>
      )}
    </div>
  );
};

export default OrderItemsManager;