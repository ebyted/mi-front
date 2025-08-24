import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useProducts } from '../hooks/useProducts';
import { api } from '../services/api';

/**
 * Selector de productos optimizado con búsqueda y lazy loading
 * Implementa debounce, dropdown virtual y carga on-demand
 */
const ProductSelect = ({ 
  value, 
  onChange, 
  placeholder = "Buscar producto por nombre o SKU...",
  required = false,
  disabled = false,
  className = "",
  error = null,
  onProductSelect = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  
  const { 
    products, 
    loading, 
    searchProducts,
    resetProducts 
  } = useProducts({
    initialLoad: false,
    pageSize: 30,
    autoLoad: false
  });

  // Encontrar producto seleccionado
  const selectedProduct = products.find(p => p.id === parseInt(value));

  /**
   * Manejo de búsqueda con debounce
   */
  const handleSearch = useCallback((searchTerm) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      if (searchTerm.length >= 2) {
        searchProducts(searchTerm);
        setIsOpen(true);
      } else if (searchTerm.length === 0) {
        resetProducts();
        setIsOpen(false);
      }
    }, 300);

    setSearchTimeout(timeout);
  }, [searchProducts, resetProducts, searchTimeout]);

  /**
   * Selección de producto
   */
  const handleSelect = async (product) => {
    onChange(product.id);
    setInputValue(product.name);
    setIsOpen(false);

    let fullProduct = product;
    let errorFetching = false;
    let errorMessage = '';
    // Validar que el producto tenga id antes de consultar el endpoint
    if (!product.variants || !Array.isArray(product.variants)) {
      if (!product.id) {
        errorFetching = true;
        errorMessage = 'El producto seleccionado no tiene un ID válido.';
      } else {
        try {
          const endpoint = `/products/${product.id}/`;
          const resp = await api.get(endpoint);
          fullProduct = resp.data;
        } catch (err) {
          errorFetching = true;
          if (err.response && err.response.status === 404) {
            errorMessage = `No se encontró el producto en el endpoint /products/${product.id}/ (404).`;
          } else {
            errorMessage = 'No se pudo obtener la información completa del producto.';
          }
          fullProduct = product;
        }
      }
    }

    // Validar variantes
    let product_variant_id = null;
    if (fullProduct.variants && Array.isArray(fullProduct.variants) && fullProduct.variants.length > 0) {
      product_variant_id = fullProduct.variants[0].id;
    } else {
      errorFetching = true;
      errorMessage = 'El producto seleccionado no tiene variantes disponibles.';
    }

    // Devuelve el objeto extendido con product_variant_id
    const productWithVariantId = { ...fullProduct, product_variant_id };

    if (onProductSelect) {
      onProductSelect(productWithVariantId);
    }

    // Blur input para cerrar teclado móvil
    if (inputRef.current) {
      inputRef.current.blur();
    }

    // Mostrar advertencia si falta información crítica
    if (errorFetching && errorMessage) {
      window.setTimeout(() => {
        alert(errorMessage);
      }, 100);
    }
  };

  /**
   * Cambio en el input
   */
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    handleSearch(val);
  };

  /**
   * Manejo de focus
   */
  const handleFocus = () => {
    if (inputValue.length >= 2) {
      setIsOpen(true);
    }
  };

  /**
   * Limpiar selección
   */
  const clearSelection = () => {
    onChange('');
    setInputValue('');
    setIsOpen(false);
    resetProducts();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  /**
   * Cerrar dropdown al hacer clic fuera
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        inputRef.current && 
        !inputRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Actualizar input cuando cambia el producto seleccionado
   */
  useEffect(() => {
    if (selectedProduct) {
      setInputValue(selectedProduct.name);
    } else if (value === '' || value === null || value === undefined) {
      setInputValue('');
    }
  }, [selectedProduct, value]);

  /**
   * Cleanup timeout
   */
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  return (
  <div className={`position-relative ${className}`}>
      {/* Input principal */}
      <div className="input-group">
        <input
          ref={inputRef}
          type="text"
          className={`form-control ${error ? 'is-invalid' : ''}`}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
        />
        
        {/* Botón limpiar */}
        {value && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={clearSelection}
            disabled={disabled}
          >
            ✖️
          </button>
        )}
      </div>
      
      {/* Mensaje de error */}
      {error && (
        <div className="invalid-feedback d-block">
          {error}
        </div>
      )}
      
      {/* Dropdown de productos */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className="dropdown-menu show w-100 shadow-lg border-0"
          style={{ 
            maxHeight: '350px', 
            overflowY: 'auto', 
            zIndex: 1050,
            marginTop: '2px'
          }}
        >
          {/* Estado de carga */}
          {loading && (
            <div className="dropdown-item text-center py-3">
              <div className="spinner-border spinner-border-sm text-info me-2" role="status">
                <span className="visually-hidden">Buscando...</span>
              </div>
              <span className="text-muted">Buscando productos...</span>
            </div>
          )}
          {/* Lista de productos */}
          {!loading && products.length > 0 && products.map(product => (
            <button
              key={product.id}
              type="button"
              className="dropdown-item d-flex justify-content-between align-items-start py-2 px-3"
              onClick={() => handleSelect(product)}
            >
              <div className="flex-grow-1 me-2">
                <div className="fw-bold text-truncate" title={product.name}>
                  {product.name}
                </div>
                <div className="d-flex gap-2 mt-1">
                  <small className="text-muted">
                    SKU: {product.sku || product.code || 'N/A'}
                  </small>
                  {product.brand_name && (
                    <small className="text-info">
                      {product.brand_name}
                    </small>
                  )}
                </div>
              </div>
              <div className="text-end">
                <span className="badge bg-light text-dark">
                  ID: {product.id}
                </span>
              </div>
            </button>
          ))}
          {/* Estado vacío */}
          {!loading && products.length === 0 && inputValue.length >= 2 && (
            <div className="dropdown-item text-center py-3 text-muted">
              🔍 No se encontraron productos para "{inputValue}"
            </div>
          )}
          {/* Instrucciones de búsqueda */}
          {!loading && inputValue.length < 2 && (
            <div className="dropdown-item text-center py-3 text-muted">
              ℹ️ Escriba al menos 2 caracteres para buscar
            </div>
          )}
          {/* Footer con contador */}
          {!loading && products.length > 0 && (
            <>
              <div className="dropdown-divider"></div>
              <div className="dropdown-item-text text-center small text-muted">
                {products.length} producto{products.length !== 1 ? 's' : ''} encontrado{products.length !== 1 ? 's' : ''}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductSelect;
