

import React from 'react';
import ProductSelect from '../components/ProductSelect';
import ProductInventory from '../components/ProductInventory';


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
						<div className="mb-2">
							<span className="fw-bold">Nombre:</span> {selectedProduct.name}<br/>
							<span className="fw-bold">SKU:</span> {selectedProduct.sku}<br/>
							<span className="fw-bold">ID:</span> {selectedProduct.id}<br/>
							<span className="fw-bold">Variante principal:</span> {selectedProduct.product_variant_id || 'N/A'}<br/>
							<span className="fw-bold">Categoría:</span> {selectedProduct.category_name || selectedProduct.category_name === '' ? selectedProduct.category_name : (selectedProduct.category && typeof selectedProduct.category === 'object' ? selectedProduct.category.name : selectedProduct.category) || 'N/A'}<br/>
							<span className="fw-bold">Marca:</span> {selectedProduct.brand_name || selectedProduct.brand_name === '' ? selectedProduct.brand_name : (selectedProduct.brand && typeof selectedProduct.brand === 'object' ? selectedProduct.brand.name : selectedProduct.brand) || 'N/A'}<br/>
							<span className="fw-bold">Descripción:</span> {selectedProduct.description || 'Sin descripción'}<br/>
						</div>
						{/* JSON oculto, solo datos elegantes */}
					</div>
				)}
						{/* Mostrar ProductInventory debajo del selector y detalles */}
						<div className="mt-5">
							<ProductInventory selectedProductObj={selectedProduct} />
						</div>
			</div>
		);
};

export default ProductCenter;
