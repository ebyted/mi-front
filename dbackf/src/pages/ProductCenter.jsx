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
			   {/* Título con margen superior para evitar que el navbar lo tape */}
			   <h1 className="fw-bold text-primary" style={{ marginTop: '80px', fontSize: '2rem', letterSpacing: '1px' }}>
				   Información de producto
			   </h1>
			   <div className="mt-4">
				   <ProductInventory selectedProductObj={selectedProduct} />
			   </div>
		   </div>
	);
};

export default ProductCenter;
