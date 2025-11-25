import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Tab, Tabs } from 'react-bootstrap';
import api from '../api.js';

const ProductFormModal = ({ show, onHide, product, onSave, brands = [], categories = [] }) => {
    const [form, setForm] = useState({
        name: '',
        sku: '',
        barcode: '',
        description: '',
        brand: '',
        category: '',
        is_active: true,
    });
    const [key, setKey] = useState('principal');
    const [preview, setPreview] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);

    useEffect(() => {
        if (product) {
            setForm({
                name: product.name || '',
                sku: product.sku || '',
                barcode: product.barcode || '',
                description: product.description || '',
                brand: product.brand ? String(product.brand) : '',
                category: product.category ? String(product.category) : '',
                is_active: product.is_active !== undefined ? product.is_active : true,
            });
        } else {
            setForm({
                name: '',
                sku: '',
                barcode: '',
                description: '',
                brand: '',
                category: '',
                is_active: true,
            });
        }
        setKey('principal'); // Activa el primer tab al abrir el modal
    }, [product, show]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(form);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setSelectedFile(file);
        if (file) {
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleImageUpload = async () => {
        if (!selectedFile || !product?.id) return;
        const formData = new FormData();
        formData.append('product', product.id);
        formData.append('image', selectedFile);

        try {
            await api.post('/product-images/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            // Recarga las imágenes del producto si es necesario
            setSelectedFile(null);
            setPreview(null);
        } catch (err) {
            alert('Error al subir la imagen' + err.message);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    <i className={`bi ${product ? 'bi-pencil' : 'bi-person-plus'} me-2`}></i>
                    {product ? 'Editar producto' : 'Crear producto'}
                </Modal.Title>
            </Modal.Header>
                
                <Form onSubmit={handleSubmit}>
                <Modal.Body>

                    <Tabs
                        id="controlled-tab-example"
                        activeKey={key}
                        onSelect={(k) => setKey(k)}
                        className="mb-3"
                        >
                        <Tab eventKey="principal" title="Principal">
                            
                            <Form.Group className="mb-3">
                                <Form.Label htmlFor="name">Nombre</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    placeholder="Nombre del producto"
                                    required
                                />
                            </Form.Group >
                            <Form.Group className="mb-3">
                                <Form.Label htmlFor="sku">SKU</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="sku"
                                    value={form.sku}
                                    onChange={handleChange}
                                    placeholder="SKU"
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label htmlFor="barcode">Código de barras</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="barcode"
                                    value={form.barcode}
                                    onChange={handleChange}
                                    placeholder="Código de barras"
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label htmlFor="description">Descripción</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    name="description"
                                    value={form.description}
                                    onChange={handleChange}
                                    placeholder="Descripción"
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label htmlFor="brand">Marca</Form.Label>
                                <Form.Select
                                    name="brand"
                                    value={form.brand}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Selecciona una marca</option>
                                    {brands.map((b) => (
                                        <option key={b.id} value={String(b.id)}>{b.name}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label htmlFor="category" >Categoría</Form.Label>
                                <Form.Select
                                    name="category"
                                    value={form.category}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Selecciona una categoría</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={String(c.id)}>{c.name}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                            <Form.Group className="mb-3" controlId="is_active">
                                <Form.Check
                                    type="checkbox"
                                    name="is_active"
                                    label="Activo"
                                    checked={form.is_active}
                                    onChange={handleChange}
                                />
                            </Form.Group>

                        </Tab>
                        <Tab eventKey="imagenes" title="Imágenes">
                            <div>
                                <h5>Imágenes del producto</h5>
                                {product?.images?.length > 0 && (
                                    <div className="mb-3">
                                        <h6>Vistas preliminares:</h6>
                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                            {product.images.map(img => (
                                                <img
                                                    key={img.id}
                                                    src={img.image}
                                                    alt={`Vista previa ${img.id}`}
                                                    style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <input type="file" accept="image/*" onChange={handleFileChange} />
                                    <Button className="btn btn-primary mt-2" onClick={handleImageUpload}>
                                        Subir imagen
                                    </Button>
                                </div>
                                {preview && (
                                    <div>
                                        <h6>Vista previa:</h6>
                                        <img src={preview} alt="Preview" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8 }} />
                                    </div>
                                )}
                            </div>
                        </Tab>
                    </Tabs>
                    
                    
                </Modal.Body>
                <Modal.Footer>
                    
                    <Button  className="btn btn-outline-secondary" variant="primary" type="submit">
                        Guardar
                    </Button>
                    <Button className="btn btn-warning" variant="secondary" onClick={onHide}>
                        <i className="bi bi-x-lg me-1"></i>
                        Cancelar
                    </Button>
                </Modal.Footer>
                </Form>
        </Modal>
    );
};



export default ProductFormModal;