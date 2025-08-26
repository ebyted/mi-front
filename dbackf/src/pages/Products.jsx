import React, { useEffect, useState, useRef } from 'react';
// import ProductSelect from '../components/ProductSelect';
import api from '../services/api';
import useDocumentTitle from '../hooks/useDocumentTitle';
import DiscountManager from '../components/DiscountManager';

function Products() {
  useDocumentTitle('Productos');
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ brand: '', category: '', warehouse: '', isActive: '', stockStatus: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState('table');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
  productId: '',
  productVariantId: '',
  name: '',
  sku: '',
  description: '',
  brand: '',
  category: '',
  barcode: '',
  minimum_stock: '',
  maximum_stock: '',
  cantidad_corrugado: '',
  status: 'REGULAR',
  is_active: true,
  group: '',
  image_url: ''
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState('');
  const [mainMessage, setMainMessage] = useState({ type: '', text: '' });
  const [showDiscountModal, setShowDiscountModal] = useState({ show: false, productId: null, productName: '' });
  const formRef = useRef();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Usar endpoint search_all para traer todos los productos sin paginación
    api.get('products/search_all/')
      .then(res => {
        if (Array.isArray(res.data)) {
          setProducts(res.data);
        } else {
          setProducts([]);
        }
      })
      .catch(() => setProducts([]));
    api.get('brands/').then(res => setBrands(res.data)).catch(() => setBrands([]));
    api.get('categories/').then(res => setCategories(res.data)).catch(() => setCategories([]));
    api.get('warehouses/').then(res => setWarehouses(res.data)).catch(() => setWarehouses([]));
  }, []);

  // Filtro adicional por categoría y marca
  const [filteredProducts, setFilteredProducts] = useState([]);
  const applyFilters = () => {
    const result = products.filter(p => {
      let matchesSearch = true;
      if (search && search.trim()) {
        const normalized = (txt) => String(txt || '').toLowerCase();
        const s = normalized(search);
        const brandText = p.brand && typeof p.brand === 'object'
          ? (p.brand.description ?? p.brand.name ?? '')
          : (p.brand ?? '');
        const categoryText = p.category && typeof p.category === 'object'
          ? (p.category.description ?? p.category.name ?? '')
          : (p.category ?? '');
        matchesSearch = normalized(p.name).includes(s)
          || normalized(p.sku).includes(s)
          || normalized(p.barcode).includes(s)
          || normalized(brandText).includes(s)
          || normalized(categoryText).includes(s);
      }
      const matchesBrand = !filters.brand || String(typeof p.brand === 'object' ? p.brand?.id : p.brand) === filters.brand;
      const matchesCategory = !filters.category || String(typeof p.category === 'object' ? p.category?.id : p.category) === filters.category;
      const matchesActive = !filters.isActive || (filters.isActive === 'true' ? p.is_active === true : p.is_active === false);
      let matchesStock = true;
      if (filters.stockStatus) {
        if (filters.stockStatus === 'low' && p.minimum_stock) matchesStock = (p.minimum_stock || 0) < 10;
        else if (filters.stockStatus === 'ok') matchesStock = (p.minimum_stock || 0) >= 10;
      }
      return matchesSearch && matchesBrand && matchesCategory && matchesActive && matchesStock;
    });
    setFilteredProducts(result);
    setPage(1);
  };
  useEffect(() => {
    setFilteredProducts(products);
  }, [products]);

  // Paginación local sobre los productos filtrados
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const paginatedProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);

  const handleEdit = (product) => {
    setEditId(product.id);
    setFormError('');
    setFormData({
      productId: product.id,
      productVariantId: product.variants?.[0]?.id || '',
      name: product.name || '',
      sku: product.sku || '',
      description: product.description || '',
      brand: typeof product.brand === 'object' ? product.brand.id : product.brand || '',
      category: typeof product.category === 'object' ? product.category.id : product.category || '',
      barcode: product.barcode || '',
      minimum_stock: product.minimum_stock || '',
      maximum_stock: product.maximum_stock || '',
      cantidad_corrugado: product.cantidad_corrugado || '',
      status: product.status || 'REGULAR',
      is_active: product.is_active ?? true,
      group: product.group || '',
      image_url: product.image_url || ''
    });
    setShowForm(true);
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleNew = () => {
    setEditId(null);
    setFormError('');
    setFormData({
      productId: '',
      productVariantId: '',
      name: '',
      sku: '',
      description: '',
      brand: '',
      category: '',
      barcode: '',
      minimum_stock: '',
      maximum_stock: '',
      cantidad_corrugado: '',
      status: 'REGULAR',
      is_active: true,
      group: '',
      image_url: ''
    });
    setShowForm(true);
  };

  const handleProductSelect = (product) => {
    setFormData(fd => ({
      ...fd,
      productId: product.id,
      productVariantId: product.variants?.[0]?.id || '',
      name: product.name,
      sku: product.sku,
      brand: typeof product.brand === 'object' ? product.brand.id : product.brand,
      category: typeof product.category === 'object' ? product.category.id : product.category
    }));
  };

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const validateForm = () => {
    const errors = [];
    // Solo pedir variante en alta, no en edición
    if (!editId && !formData.productVariantId) errors.push('Selecciona una variante');
    // Validar campos obligatorios
  if (!formData.name || !formData.name.trim()) errors.push('Nombre es obligatorio');
  if (!formData.sku || !formData.sku.trim()) errors.push('SKU es obligatorio');
  if (!formData.brand) errors.push('Marca es obligatoria');
  if (!formData.category) errors.push('Categoría es obligatoria');
    // Validar campos numéricos
    if (formData.minimum_stock && (isNaN(formData.minimum_stock) || parseFloat(formData.minimum_stock) < 0)) errors.push('Stock mínimo inválido');
    if (formData.maximum_stock && (isNaN(formData.maximum_stock) || parseFloat(formData.maximum_stock) < 0)) errors.push('Stock máximo inválido');
    if (formData.cantidad_corrugado && (isNaN(formData.cantidad_corrugado) || parseFloat(formData.cantidad_corrugado) < 0)) errors.push('Cantidad corrugado inválida');
    // Validar imagen
    if (formData.image_url && formData.image_url.trim() && !/^https?:\/\/.+\.(jpg|jpeg|png|webp)$/i.test(formData.image_url)) errors.push('URL de imagen inválida');
    // Validar relación de stocks
    if (formData.minimum_stock && formData.maximum_stock && parseFloat(formData.maximum_stock) < parseFloat(formData.minimum_stock)) errors.push('Stock máximo debe ser mayor que mínimo');
    if (errors.length > 0) {
      setFormError(errors.join(', '));
      return false;
    }
    return true;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      // Limpiar status inválido antes de enviar
      let safeStatus = formData.status === 'NORMAL' ? 'REGULAR' : formData.status;
      // Limpiar payload para PUT (edición)
      if (editId) {
        // Solo enviar los campos esperados por el backend
        let payload = {
          name: formData.name === '' ? null : formData.name,
          sku: formData.sku === '' ? null : formData.sku,
          description: formData.description === '' ? null : formData.description,
          brand: formData.brand === '' ? null : Number(formData.brand),
          category: formData.category === '' ? null : Number(formData.category),
          barcode: formData.barcode === '' ? null : formData.barcode,
          minimum_stock: formData.minimum_stock === '' ? null : Number(formData.minimum_stock),
          maximum_stock: formData.maximum_stock === '' ? null : Number(formData.maximum_stock),
          cantidad_corrugado: formData.cantidad_corrugado === '' ? null : Number(formData.cantidad_corrugado),
          status: safeStatus === '' ? null : safeStatus,
          is_active: formData.is_active,
          group: formData.group === '' ? null : Number(formData.group),
          image_url: formData.image_url === '' ? null : formData.image_url,
          business: 1
        };
        console.log('PUT payload:', payload); // Debug: ver exactamente lo que se envía
        await api.put(`products/${editId}/`, payload);
        var successMsg = '¡Producto editado correctamente!';
      } else {
        // Para alta, también limpiar status
        let postData = { ...formData, status: safeStatus };
        await api.post('products/', postData);
        var successMsg = '¡Producto creado correctamente!';
      }
      setShowForm(false);
      setEditId(null);
      setFormData({
        productId: '', productVariantId: '', name: '', sku: '', description: '', brand: '', category: '', barcode: '', minimum_stock: '', maximum_stock: '', cantidad_corrugado: '', status: 'REGULAR', is_active: true, group: '', image_url: ''
      });
      // Refrescar productos usando el endpoint correcto tras guardar
      api.get('products/')
        .then(res => {
          if (Array.isArray(res.data)) {
            setProducts(res.data);
          } else if (res.data && Array.isArray(res.data.results)) {
            setProducts(res.data.results);
          } else {
            setProducts([]);
          }
        })
        .catch(() => setProducts([]));
      setMainMessage({ type: 'success', text: successMsg });
      setTimeout(() => setMainMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      let errorMsg = 'Error al guardar';
      if (err.response && err.response.data) {
        if (typeof err.response.data === 'string') {
          errorMsg = err.response.data;
        } else if (typeof err.response.data === 'object') {
          errorMsg = Object.entries(err.response.data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' | ');
        }
      }
      setFormError(errorMsg);
      setFormSuccess('');
      setMainMessage({ type: 'error', text: errorMsg });
      setTimeout(() => setMainMessage({ type: '', text: '' }), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container-fluid py-3">
      {/* Mensaje principal de éxito/falla */}
      {mainMessage.text && (
        <div className={`alert ${mainMessage.type === 'success' ? 'alert-success' : 'alert-danger'} mb-3`} role="alert">
          {mainMessage.text}
        </div>
      )}
      {/* ...existing code... */}
      {/* Sección principal de productos */}
      {/* ...existing code... */}
      {/* Sección para crear batch de productos */}
      <div className="row mt-5">
        <div className="col-12">
          <div className="card shadow-sm border-primary mb-4">
            <div className="card-header bg-primary text-white">
              <h4 className="mb-0">Crear Batch de Productos</h4>
            </div>
            <div className="card-body bg-light">
              {/* Aquí se integra el componente ProductBatch */}
              <ProductBatch />
            </div>
          </div>
        </div>
      </div>
      {/* ...existing code... */}
      {showForm && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{backgroundColor: 'rgba(0,0,0,0.5)'}}
          onClick={e => {
            if (e.target === e.currentTarget) setShowForm(false);
          }}
        >
          <div
            className={`modal-dialog ${isMobile ? 'modal-fullscreen' : 'modal-lg modal-dialog-scrollable'}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editId ? 'Editar producto' : 'Nuevo producto'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowForm(false)}></button>
              </div>
              {/* Mensaje de error arriba del modal */}
              {formError && <div className="alert alert-danger mx-3 mt-3 mb-0">{formError}</div>}
              <div className="modal-body">
                {/* ...existing code... */}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" disabled={isSubmitting} onClick={() => setShowForm(false)}>
                  ✖ Cancelar
                </button>
                <button type="button" className="btn btn-primary" disabled={isSubmitting} onClick={() => formRef.current?.requestSubmit()}>
                  {isSubmitting ? (<span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>) : '💾 Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showDiscountModal.show && (
        <DiscountManager
          productId={showDiscountModal.productId}
          productName={showDiscountModal.productName}
          onClose={() => setShowDiscountModal({show: false, productId: null, productName: ''})}
        />
      )}
    </div>
  );
}

import ProductBatch from '../components/ProductBatch';
export default Products;
