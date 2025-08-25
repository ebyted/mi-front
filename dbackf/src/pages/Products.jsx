import React, { useEffect, useState, useRef } from 'react';
import ProductSelect from '../components/ProductSelect';
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
  const [showDiscountModal, setShowDiscountModal] = useState({ show: false, productId: null, productName: '' });
  const formRef = useRef();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    api.get('products/?expand=brand,category,variants,warehouse_stocks').then(res => setProducts(res.data)).catch(() => setProducts([]));
    api.get('brands/').then(res => setBrands(res.data)).catch(() => setBrands([]));
    api.get('categories/').then(res => setCategories(res.data)).catch(() => setCategories([]));
    api.get('warehouses/').then(res => setWarehouses(res.data)).catch(() => setWarehouses([]));
  }, []);

  const filteredProducts = products.filter(p => {
    let matchesSearch = true;
    if (search && search.trim()) {
      const normalized = (txt) => String(txt || '').toLowerCase();
      const s = normalized(search);
      matchesSearch = normalized(p.name).includes(s) || normalized(p.sku).includes(s) || normalized(p.barcode).includes(s) || normalized(p.brand?.description || p.brand?.name || p.brand) .includes(s) || normalized(p.category?.description || p.category?.name || p.category).includes(s);
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
    if (!formData.productId) errors.push('Selecciona un producto');
    if (!formData.productVariantId) errors.push('Selecciona una variante');
    if (!formData.name.trim()) errors.push('Nombre requerido');
    if (!formData.sku.trim()) errors.push('SKU requerido');
    if (!formData.brand) errors.push('Marca requerida');
    if (!formData.category) errors.push('Categoría requerida');
    if (formData.minimum_stock && (isNaN(formData.minimum_stock) || parseFloat(formData.minimum_stock) < 0)) errors.push('Stock mínimo inválido');
    if (formData.maximum_stock && (isNaN(formData.maximum_stock) || parseFloat(formData.maximum_stock) < 0)) errors.push('Stock máximo inválido');
    if (formData.cantidad_corrugado && (isNaN(formData.cantidad_corrugado) || parseFloat(formData.cantidad_corrugado) < 0)) errors.push('Cantidad corrugado inválida');
    if (formData.image_url && formData.image_url.trim() && !/^https?:\/\/.+\.(jpg|jpeg|png|webp)$/i.test(formData.image_url)) errors.push('URL de imagen inválida');
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
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const payload = { ...formData };
      if (editId) {
        await api.patch(`products/${editId}/`, payload);
      } else {
        await api.post('products/', payload);
      }
      setShowForm(false);
      setEditId(null);
      setFormData({
        productId: '', productVariantId: '', name: '', sku: '', description: '', brand: '', category: '', barcode: '', minimum_stock: '', maximum_stock: '', cantidad_corrugado: '', status: 'REGULAR', is_active: true, group: '', image_url: ''
      });
      api.get('products/?expand=brand,category,variants,warehouse_stocks').then(res => setProducts(res.data)).catch(() => setProducts([]));
    } catch (err) {
      setFormError('Error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container-fluid py-3">
      <div className="row align-items-center mb-4">
        <div className="col">
          <h1 className={`mb-0 text-primary ${isMobile ? 'h4' : 'display-6'}`}>
            <i className="bi bi-box-seam me-2"></i>
            Productos
          </h1>
        </div>
        <div className="col-auto">
          <button className={`btn btn-primary ${isMobile ? 'btn-lg px-3' : ''}`} onClick={handleNew}>
            <i className="bi bi-plus-circle me-1"></i>
            {isMobile ? 'Nuevo' : 'Nuevo Producto'}
          </button>
        </div>
      </div>
      <div className="row g-2 mb-4">
        <div className="col">
          <div className="d-flex gap-3">
            <span className="badge bg-primary">Total: {products.length}</span>
            <span className="badge bg-success">Activos: {products.filter(p => p.is_active).length}</span>
            <span className="badge bg-info">Filtrados: {filteredProducts.length}</span>
          </div>
        </div>
      </div>
      <div className="row g-2 mb-3">
        <div className="col">
          <div className="input-group">
            <span className="input-group-text">
              <i className="bi bi-search"></i>
            </span>
            <input type="text" className="form-control" placeholder="Buscar productos..." value={search} onChange={e => setSearch(e.target.value)} />
            {search && (
              <button className="btn btn-outline-secondary" onClick={() => setSearch('')} title="Limpiar búsqueda">
                <i className="bi bi-x"></i>
              </button>
            )}
          </div>
        </div>
        <div className="col-auto">
          <button className="btn btn-outline-secondary" onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}>
            <i className={`bi ${viewMode === 'table' ? 'bi-grid-3x3-gap' : 'bi-table'}`}></i>
          </button>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-hover">
          <thead className="table-primary">
            <tr>
              <th>Nombre</th>
              <th>SKU</th>
              <th>Marca</th>
              <th>Categoría</th>
              <th>Activo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProducts.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.sku}</td>
                <td>{typeof p.brand === 'object' ? p.brand.description || p.brand.name : p.brand}</td>
                <td>{typeof p.category === 'object' ? p.category.description || p.category.name : p.category}</td>
                <td><span className={`badge ${p.is_active ? 'bg-success' : 'bg-danger'}`}>{p.is_active ? 'Activo' : 'Inactivo'}</span></td>
                <td>
                  <button className="btn btn-sm btn-outline-primary" onClick={() => handleEdit(p)}>✏️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && (
        <div className="modal fade show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className={`modal-dialog ${isMobile ? 'modal-fullscreen' : 'modal-lg modal-dialog-scrollable'}`}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editId ? 'Editar producto' : 'Nuevo producto'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowForm(false)}></button>
              </div>
              <div className="modal-body">
                <form ref={formRef} onSubmit={handleSubmit}>
                  <div className="row g-2">
                    <div className="col-12">
                      <label className="form-label fw-bold">Producto *</label>
                      <ProductSelect
                        products={products}
                        value={formData.productId}
                        onChange={handleProductSelect}
                        isMobile={isMobile}
                        required
                      />
                    </div>
                    {/* Aquí podrías agregar un select para variantes si ProductSelect no lo maneja */}
                    <div className="col-12">
                      <label className="form-label fw-bold">SKU</label>
                      <input type="text" name="sku" className="form-control" value={formData.sku} onChange={handleChange} required />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold">Marca</label>
                      <select name="brand" className="form-select" value={formData.brand} onChange={handleChange} required>
                        <option value="">Selecciona marca</option>
                        {brands.map(b => <option key={b.id} value={b.id}>{b.description || b.name}</option>)}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold">Categoría</label>
                      <select name="category" className="form-select" value={formData.category} onChange={handleChange} required>
                        <option value="">Selecciona categoría</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.description || c.name}</option>)}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold">Descripción</label>
                      <textarea name="description" className="form-control" value={formData.description} onChange={handleChange} rows={isMobile ? 4 : 3} />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold">Código de Barras</label>
                      <input type="text" name="barcode" className="form-control" value={formData.barcode} onChange={handleChange} />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-bold">Stock Mínimo</label>
                      <input type="number" name="minimum_stock" className="form-control" value={formData.minimum_stock} onChange={handleChange} min="0" />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-bold">Stock Máximo</label>
                      <input type="number" name="maximum_stock" className="form-control" value={formData.maximum_stock} onChange={handleChange} min="0" />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-bold">Cantidad Corrugado</label>
                      <input type="number" name="cantidad_corrugado" className="form-control" value={formData.cantidad_corrugado} onChange={handleChange} min="0" />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-bold">Grupo</label>
                      <input type="number" name="group" className="form-control" value={formData.group} onChange={handleChange} min="0" />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-bold">Estado</label>
                      <select name="status" className="form-select" value={formData.status} onChange={handleChange}>
                        <option value="REGULAR">Regular</option>
                        <option value="NUEVO">Nuevo</option>
                        <option value="OFERTA">Oferta</option>
                        <option value="REMATE">Remate</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-bold">Activo</label>
                      <div className="form-check">
                        <input type="checkbox" name="is_active" className="form-check-input" id="is_active" checked={formData.is_active} onChange={handleChange} />
                        <label className="form-check-label" htmlFor="is_active">Producto Activo</label>
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold">URL de Imagen</label>
                      <input type="url" name="image_url" className="form-control" value={formData.image_url} onChange={handleChange} />
                    </div>
                  </div>
                  {formError && <div className="alert alert-danger mt-3">{formError}</div>}
                </form>
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

export default Products;
