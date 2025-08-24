import React, { useState, useEffect } from 'react';
import ProductInventory from '../components/ProductInventory';
import ProductSelect from '../components/ProductSelect';
import { api } from '../services/api';

const InventoryGeneral = () => {
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [product, setProduct] = useState(null);
  const [inventoryMovements, setInventoryMovements] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cargar producto y movimientos por product_variant_id
  useEffect(() => {
    if (!selectedProductId) {
      setProduct(null);
      setInventoryMovements([]);
      return;
    }
    setLoading(true);
    // Obtener el product_variant y su producto
    api.get(`/product-variants/${selectedProductId}/`).then(res => {
      const variant = res.data;
      // Obtener el producto completo
      api.get(`/products/${variant.product}/`).then(resp => {
        setProduct({ ...resp.data, variant });
      });
    });
    // Obtener movimientos de inventario por product_variant_id
    api.get(`/inventory-movements/?product_variant_id=${selectedProductId}`).then(resp => {
      setInventoryMovements(resp.data.results || resp.data);
    }).finally(() => setLoading(false));
  }, [selectedProductId]);

  return (
    <div className="container py-5">
      <h1 className="display-5 mb-4 text-primary">Inventario General</h1>
      <div className="mb-4">
        <ProductSelect
          value={selectedProductId}
          onChange={setSelectedProductId}
          placeholder="Buscar producto por nombre o SKU..."
          required={false}
          className="w-100"
        />
      </div>
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3 text-muted">Cargando información de inventario...</p>
        </div>
      ) : (
        selectedProductId && (
          <ProductInventory product={product} inventoryMovements={inventoryMovements} />
        )
      )}
    </div>
  );
};

export default InventoryGeneral;
