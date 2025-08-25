import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

/**
 * Hook personalizado para manejo optimizado de productos
 * Implementa paginación, búsqueda con debounce y carga lazy
 */
export const useProducts = (options = {}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  
  const {
    initialLoad = true,
    pageSize = 50,
    enableSearch = true,
    autoLoad = false
  } = options;

  /**
   * Carga productos con paginación y filtros
   */
  const loadProducts = useCallback(async (search = '', reset = false) => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const currentPage = reset ? 1 : page;
      const params = new URLSearchParams({
        page: currentPage,
        page_size: pageSize,
        ...(search && { search: search.trim() })
      });
      
      const response = await api.get('/products-search/', { params: { search: search.trim() } });
      const newProducts = Array.isArray(response.data) ? response.data : [];
      if (reset) {
        setProducts(newProducts);
        setPage(1);
      } else {
        setProducts(prev => [...prev, ...newProducts]);
      }
      setHasMore(false);
      
  // ...el resto del código permanece igual...
      
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Error al cargar productos');
      if (reset) setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [pageSize, loading, page]);

  /**
   * Búsqueda de productos con debounce
   */
    const searchProducts = useCallback(async (search) => {
      setSearchTerm(search);
      if (search.length >= 2) {
        setLoading(true);
        try {
          // Usar el endpoint estándar de productos, solo si search tiene 2+ caracteres
      const response = await api.get('/products-search/', { params: { search: search.trim() } });
          const allProducts = Array.isArray(response.data) ? response.data : [];
          // Filtrar por nombre o SKU
          const normalizedSearch = search.trim().toLowerCase();
          const filtered = allProducts.filter(product => {
            const name = (product.name || '').toLowerCase();
            const idStr = String(product.id);
            return name.includes(normalizedSearch) || idStr.includes(normalizedSearch);
          });
          setProducts(filtered);
          setPage(1);
          setHasMore(false);
        } catch (err) {
          console.error('Error en búsqueda de productos:', err);
          setProducts([]);
          setHasMore(false);
        } finally {
          setLoading(false);
        }
      } else {
        // Nunca hacer petición si <2 caracteres
        setProducts([]);
        setHasMore(true);
        setPage(1);
        if (autoLoad && search.length === 0) {
          await loadProducts('', true);
        }
      }
    }, [autoLoad, loadProducts]);

  /**
   * Cargar más productos (para infinite scroll)
   */
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadProducts(searchTerm, false);
    }
  }, [hasMore, loading, loadProducts, searchTerm]);

  /**
   * Reiniciar productos
   */
  const resetProducts = useCallback(() => {
    setProducts([]);
    setSearchTerm('');
    setPage(1);
    setHasMore(true);
    setError(null);
  }, []);

  // Carga inicial
  useEffect(() => {
    if (initialLoad || autoLoad) {
      loadProducts('', true);
    }
  }, [initialLoad, autoLoad, loadProducts]);

  return {
    products,
    loading,
    error,
    searchTerm,
    hasMore,
    page,
    loadProducts,
    searchProducts,
    loadMore,
    resetProducts,
    setProducts
  };
};
