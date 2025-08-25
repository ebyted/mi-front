import React, { useState } from 'react';
import ProductSelect from '../components/ProductSelect';
import ProductInventory from '../components/ProductInventory';

const ProductCenter = () => {
	const [selectedProduct, setSelectedProduct] = useState(null);

	const handleProductSelect = (product) => {
		setSelectedProduct(product);
	};

	return (
		<div>
			<ProductSelect onProductSelect={handleProductSelect} />
			<div className="mt-4">
				<ProductInventory selectedProductObj={selectedProduct} />
			</div>
		</div>
	);
};

export default ProductCenter;
