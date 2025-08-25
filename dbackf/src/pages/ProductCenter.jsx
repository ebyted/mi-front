

import React from 'react';
import ProductSelect from '../components/ProductSelect';


const ProductCenter = () => {
	const [selectedProduct, setSelectedProduct] = React.useState(null);

	// Leer del localStorage al montar el componente
	React.useEffect(() => {
		const stored = localStorage.getItem('selected_product');
		if (stored) {
			setSelectedProduct(JSON.parse(stored));
		}
	}, []);

	// Callback para ProductSelect
	const handleProductSelect = (product) => {
		setSelectedProduct(product);
		// Ya se guarda en localStorage desde ProductSelect
		console.log('[ProductCenter] Producto seleccionado:', product);
	};

	return (
		<div>
			<ProductSelect onProductSelect={handleProductSelect} />
			{selectedProduct && (
				<div className="mt-4 p-3 border rounded bg-light">
					<h6 className="fw-bold text-success">Producto seleccionado:</h6>
					<pre style={{ fontSize: '0.95em', background: '#f8f9fa', padding: '8px', borderRadius: '4px' }}>
						{JSON.stringify(selectedProduct, null, 2)}
					</pre>
				</div>
			)}
		</div>
	);
};

export default ProductCenter;
