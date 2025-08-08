# Maestro Inventario

Sistema integral de gestión de inventario con backend robusto en Django y frontend moderno en React + Vite + TailwindCSS.

**Estado:** Desplegado en producción con Dokploy + Docker

---

## Backend (Django)

- **Framework:** Django 5.2.4
- **API REST:** Django REST Framework
- **Tareas automáticas:** Celery + Redis
- **Documentación API:** Swagger/OpenAPI (`drf-yasg`)
- **Autenticación:** JWT
- **Importación/Exportación:** Excel/CSV
- **Auditoría:** Registro de acciones
- **Respaldo/Restauración:** Descarga y carga de respaldo

### Instalación
1. Clona el repositorio y entra a la carpeta raíz.
2. Activa el entorno virtual:
   ```
   .\venv\Scripts\activate
   ```
3. Instala dependencias:
   ```
   pip install -r requirements.txt
   ```
4. Ejecuta migraciones:
   ```
   python manage.py migrate
   ```
5. Inicia el servidor:
   ```
   python manage.py runserver
   ```

### Modelos principales
- **User**: email, nombre, rol, negocio, permisos
- **Role**: nombre, negocio
- **Business**: datos de la empresa
- **Product**: nombre, descripción, sku, precio, imagen, activo
- **ProductVariant**: variantes, precios, stock, activo
- **Category**: nombre, descripción, activo
- **Brand**: nombre, país, activo
- **Warehouse**: nombre, dirección, activo
- **SalesOrder**: cliente, fecha, estado, total
- **SalesOrderItem**: producto, cantidad, precio
- **AuditLog**: usuario, acción, modelo, objeto, fecha

### Documentación API
- Swagger: [`/swagger/`](http://localhost:8030/swagger/)
- Redoc: [`/redoc/`](http://localhost:8030/redoc/)

---

## Frontend (React + Vite)

- **Framework:** React 18 + Vite
- **Estilos:** TailwindCSS
- **Internacionalización:** i18next
- **Exportación:** xlsx, file-saver
- **Interfaz:** Sidebar responsivo, dashboard, filtros, tienda moderna
- **Importadores:** Excel/CSV en todas las vistas principales
- **Tienda:** Vista exclusiva para clientes/vendedores, productos activos, carrito, pedidos
- **Automatización:** Panel para tareas programadas
- **Ayuda y documentación:** Página de ayuda y API pública

### Instalación
1. Entra a la carpeta `frontend_maestro_inventario`.
2. Instala dependencias:
   ```
   npm install
   ```
3. Inicia el servidor de desarrollo:
   ```
   npm run dev
   ```

### Páginas principales
- Dashboard
- Productos, Categorías, Marcas, Almacenes
- Movimientos, Órdenes de compra/venta, Cotizaciones
- Importadores, Roles, Usuarios
- Auditoría, Respaldo/Restauración
- Automatización de tareas
- Tienda en línea
- Ayuda y API pública

---

## Estructura recomendada

```
Maestro_inventario/
├── core/                # App principal Django
├── maestro_inventario_backend/ # Configuración Django
├── frontend_maestro_inventario/ # Frontend React
├── requirements.txt     # Dependencias backend
├── README.md            # Documentación
├── manage.py            # Django
└── ...
```

---

## Contacto y soporte
¿Dudas o problemas? Escribe a soporte@maestroinventario.com
