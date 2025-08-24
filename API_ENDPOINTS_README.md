# Documentación de Endpoints API - Maestro Inventario

Esta documentación resume los principales endpoints REST disponibles en el backend Django del sistema Maestro Inventario. Para detalles completos y pruebas interactivas, consulta `/swagger/` o `/redoc/` en tu servidor.

---

## Endpoints Principales (DRF ModelViewSet)

Todos los endpoints siguen la convención REST:
- Listar: `GET /api/<endpoint>/`
- Detalle: `GET /api/<endpoint>/<id>/`
- Crear: `POST /api/<endpoint>/`
- Actualizar: `PUT/PATCH /api/<endpoint>/<id>/`
- Eliminar: `DELETE /api/<endpoint>/<id>/`

### Usuarios y Negocio
- `/api/users/` — Usuarios
- `/api/businesses/` — Empresas
- `/api/roles/` — Roles

### Productos y Variantes
- `/api/products/` — Productos
- `/api/products/search_all/` — Búsqueda sin paginación
- `/api/products/simple_list/` — Lista simple
- `/api/product-variants/` — Variantes de producto
- `/api/categories/` — Categorías
- `/api/brands/` — Marcas
- `/api/units/` — Unidades

### Inventario y Almacenes
- `/api/warehouses/` — Almacenes
- `/api/product-warehouse-stocks/` — Stock por almacén y producto
- `/api/inventory-movements/` — Movimientos de inventario
- `/api/inventory-movement-details/` — Detalles de movimientos
- `/api/current-inventory/` — Inventario actual (vista especial)

### Proveedores y Compras
- `/api/suppliers/` — Proveedores
- `/api/supplier-products/` — Productos de proveedor
- `/api/purchase-orders/` — Órdenes de compra
- `/api/purchase-order-items/` — Ítems de orden de compra
- `/api/purchase-order-receipts/` — Recepciones de compra
- `/api/purchase-order-receipt-items/` — Ítems de recepción

### Ventas y Cotizaciones
- `/api/sales-orders/` — Pedidos de venta
- `/api/sales-order-items/` — Ítems de pedido de venta
- `/api/quotations/` — Cotizaciones
- `/api/quotation-items/` — Ítems de cotización

### Otros Endpoints
- `/api/exchange-rates/` — Tipos de cambio
- `/api/customer-types/` — Tipos de cliente
- `/api/customers/` — Clientes
- `/api/audit-logs/` — Auditoría
- `/api/menu-options/` — Opciones de menú

---

## Endpoints Especiales para Product Center (`/pc/`)
- `/pc/products/search/` — Búsqueda avanzada de productos
- `/pc/products/<id>/` — Detalle completo de producto
- `/pc/products/<id>/variants/` — Variantes del producto
- `/pc/products/<id>/kardex/` — Kardex y movimientos
- `/pc/products/<id>/stock/` — Stock en almacenes
- `/pc/products/<id>/suppliers/` — Proveedores del producto
- `/pc/products/<id>/orders/` — Órdenes relacionadas
- `/pc/products/<id>/auditlog/` — Auditoría del producto

---

## Autenticación y Seguridad
- `/api/token/` — Obtener token JWT
- `/api/token/refresh/` — Refrescar token
- Todos los endpoints requieren autenticación JWT salvo los públicos.

---

## Referencias
- [Swagger UI](http://localhost:8030/swagger/)
- [Redoc](http://localhost:8030/redoc/)

---

**Actualiza este documento si agregas nuevos endpoints personalizados o vistas especiales.**
