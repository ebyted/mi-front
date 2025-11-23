import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

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

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>{product ? 'Editar producto' : 'Crear producto'}</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>Nombre</Form.Label>
                        <Form.Control
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Nombre del producto"
                            required
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>SKU</Form.Label>
                        <Form.Control
                            type="text"
                            name="sku"
                            value={form.sku}
                            onChange={handleChange}
                            placeholder="SKU"
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Código de barras</Form.Label>
                        <Form.Control
                            type="text"
                            name="barcode"
                            value={form.barcode}
                            onChange={handleChange}
                            placeholder="Código de barras"
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Descripción</Form.Label>
                        <Form.Control
                            as="textarea"
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            placeholder="Descripción"
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Marca</Form.Label>
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
                        <Form.Label>Categoría</Form.Label>
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
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide}>
                        Cancelar
                    </Button>
                    <Button variant="primary" type="submit">
                        Guardar
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};



export default ProductFormModal;