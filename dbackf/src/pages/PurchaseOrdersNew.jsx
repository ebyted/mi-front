import React, { useState } from 'react';
import ProductSelect from '../components/ProductSelect';

// Ejemplo de formulario de orden de compra con ProductSelect
function PurchaseOrdersNew() {
	const [items, setItems] = useState([
		{ product_variant: '', quantity: 1, unit_price: 0 }
	]);

	const handleItemChange = (index, field, value) => {
		const newItems = [...items];
		newItems[index][field] = value;
		setItems(newItems);
	};

	const addItem = () => {
		setItems([...items, { product_variant: '', quantity: 1, unit_price: 0 }]);
	};

	return (
		<div className="container py-4">
			<h2 className="mb-4">Nueva Orden de Compra</h2>
			<form>
				{/* Items de la orden */}
				<div className="mb-4">
					<h5>Productos</h5>
					{items.map((item, index) => (
						<div key={index} className="row g-2 mb-2 align-items-end">
							<div className="col-md-6">
								<ProductSelect
									value={item.product_variant}
									onChange={val => handleItemChange(index, 'product_variant', val)}
									placeholder="Buscar producto por nombre o SKU..."
									required
								/>
							</div>
							<div className="col-md-2">
								<input
									type="number"
									className="form-control"
									value={item.quantity}
									onChange={e => handleItemChange(index, 'quantity', e.target.value)}
									min="1"
									step="1"
									required
									placeholder="Cantidad"
								/>
							</div>
							<div className="col-md-2">
								<input
									type="number"
									className="form-control"
									value={item.unit_price}
									onChange={e => handleItemChange(index, 'unit_price', e.target.value)}
									min="0"
									step="0.01"
									required
									placeholder="Precio Unitario"
								/>
							</div>
							<div className="col-md-2">
								<button
									type="button"
									className="btn btn-outline-danger w-100"
									onClick={() => setItems(items.filter((_, i) => i !== index))}
									disabled={items.length === 1}
								>
									<i className="bi bi-trash"></i>
								</button>
							</div>
						</div>
					))}
					<button type="button" className="btn btn-success mt-2" onClick={addItem}>
						<i className="bi bi-plus-circle me-2"></i>
						Agregar Producto
					</button>
				</div>
				{/* ...otros campos del formulario... */}
			</form>
		</div>
	);
}

export default PurchaseOrdersNew;
