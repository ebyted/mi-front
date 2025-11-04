import React, { useState } from 'react';
import ProductSelect from './ProductSelect';

const SalesOrderItemsManager = ({ items, onChange, products, readOnly = false }) => {
  const setItems = onChange;
  
  console.log('SalesOrderItemsManager render:', { 
    itemsCount: items?.length || 0, 
    readOnly, 
    hasOnChange: !!onChange,
    hasProducts: !!products && products.length > 0
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    product_variant: '',
    quantity: 1,
    price: 0,
    product_name: '',
    product_code: ''
  });

  const addItem = () => {
    if (!newItem.product_variant || newItem.quantity <= 0) {
      alert('Producto y cantidad son requeridos');
      return;
    }
    
    // Validar duplicados
    const exists = items.find(item => item.product_variant_id === newItem.product_variant);
    if (exists) {
      alert('Este producto ya está agregado');
      return;
    }

    const newItemToAdd = { 
      product_variant_id: newItem.product_variant,
      quantity: parseFloat(newItem.quantity),
      price: parseFloat(newItem.price),
      product_name: newItem.product_name,
      product_code: newItem.product_code
    };

    console.log('Adding new sales item:', newItemToAdd);
    setItems([...items, newItemToAdd]);
    
    setNewItem({ 
      product_variant: '', 
      quantity: 1, 
      price: 0,
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
      return total + (parseFloat(item.quantity) * parseFloat(item.price));
    }, 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0);
  };

  return (
    <div className="sales-order-items-manager">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">Items del Pedido ({items.length})</h6>
        {!readOnly && (
          <button 
            type="button" 
            className="btn btn-outline-success btn-sm"
            onClick={() => {
              console.log('Agregar Producto clicked - showAddForm será:', !showAddForm);
              setShowAddForm(true);
            }}
          >
            <i className="bi bi-plus-circle me-1"></i>
            Agregar Producto
          </button>
        )}
      </div>

      {/* Formulario de agregar */}
      {showAddForm && !readOnly && (
        <div className="card border-success mb-3">
          <div className="card-body">
            <div className="row g-2 align-items-end">
              <div className="col-md-6">
                <ProductSelect
                  value={newItem.product_variant}
                  onChange={(value, product) => {
                    console.log('ProductSelect onChange (Sales):', { value, product });
                    setNewItem(prev => ({
                      ...prev, 
                      product_variant: value,
                      product_name: product?.name || '',
                      product_code: product?.code || product?.sku || '',
                      price: product?.sale_price || product?.price || 0
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
                  value={newItem.price}
                  onChange={(e) => setNewItem(prev => ({...prev, price: e.target.value}))}
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
                      className={`form-control form-control-sm ${readOnly ? 'bg-light' : ''}`}
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      min="1"
                      readOnly={readOnly}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className={`form-control form-control-sm ${readOnly ? 'bg-light' : ''}`}
                      value={item.price}
                      onChange={(e) => updateItem(index, 'price', e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td>
                    <strong>{formatCurrency(parseFloat(item.quantity) * parseFloat(item.price))}</strong>
                  </td>
                  <td>
                    {!readOnly && (
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => removeItem(index)}
                        title="Eliminar"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="table-info">
              <tr>
                <th colSpan="3">Total del Pedido:</th>
                <th>{formatCurrency(calculateTotal())}</th>
                <th></th>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="text-center py-4 text-muted">
          <i className="bi bi-bag-x display-6"></i>
          <p className="mt-2">No hay productos agregados al pedido</p>
        </div>
      )}
    </div>
  );
};

export default SalesOrderItemsManager;