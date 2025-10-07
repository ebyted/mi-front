import React, { useState } from 'react';
import ProductInventory from '../components/ProductInventory';
import ProductSelect from '../components/ProductSelect';

const InventoryGeneral = () => {
	const [selectedProductObj, setSelectedProductObj] = useState(null);

	return (
		<div className="container py-4">
			<h2 className="mb-4">Inventario General</h2>
			<div className="mb-3">
				<ProductSelect
					value={selectedProductObj ? selectedProductObj.id : ''}
					onProductSelect={setSelectedProductObj}
					placeholder="Buscar producto para ver inventario..."
				/>
			</div>
			<ProductInventory selectedProductObj={selectedProductObj} />
		</div>
	);
};

export default InventoryGeneral;
