# Respaldo Local de Base de Datos PostgreSQL

## Archivo Generado
- **Nombre**: `bdtotal_local.sql`
- **Tamaño**: 101 KB (aprox.)
- **Fecha**: 02/08/2025
- **Tipo**: Respaldo completo con estructura y datos

## Características del Respaldo

✅ **Sin propietarios de objetos** (`--no-owner`)
✅ **Sin privilegios específicos** (`--no-privileges`)  
✅ **Con datos completos** (INSERT statements)
✅ **Formato columna por columna** (`--column-inserts`)
✅ **Compatible entre diferentes usuarios y servidores**

## Contenido del Respaldo

Este respaldo incluye:
- **Estructura completa** de todas las tablas
- **Todos los datos** de la aplicación
- **Índices y constrains**
- **Secuencias con valores actuales**
- **Tipos de datos personalizados**

### Tablas Incluidas:
- `users` - Usuarios del sistema
- `businesses` - Empresas
- `products` - Productos
- `product_variants` - Variantes de productos
- `warehouses` - Almacenes
- `inventory_movements` - Movimientos de inventario
- `product_warehouse_stocks` - Stock por almacén
- `categories` - Categorías
- `brands` - Marcas
- `suppliers` - Proveedores
- `purchase_orders` - Órdenes de compra
- Y todas las tablas relacionadas

## Cómo Restaurar

### En PostgreSQL Local:
```bash
# Crear nueva base de datos
docker exec maestro-postgres psql -U postgres -c "CREATE DATABASE nueva_bd;"

# Restaurar el respaldo
docker exec -i maestro-postgres psql -U postgres -d nueva_bd < bdtotal_local.sql
```

### En PostgreSQL Remoto:
```bash
# Con psql
psql -U usuario -d basededatos -h servidor < bdtotal_local.sql

# Con Docker
docker exec -i contenedor_postgres psql -U usuario -d basededatos < bdtotal_local.sql
```

### En Windows PowerShell:
```powershell
# Usar Get-Content para redirigir el archivo
Get-Content .\bdtotal_local.sql | docker exec -i contenedor_postgres psql -U usuario -d basededatos
```

## Características Especiales

1. **Sin problemas de usuarios**: El respaldo no incluye información específica de usuarios, por lo que puede restaurarse en cualquier servidor PostgreSQL sin conflictos de permisos.

2. **Datos en formato INSERT**: Todos los datos están en formato INSERT con nombres de columnas explícitos, lo que hace el respaldo muy portable.

3. **Secuencias actualizadas**: Las secuencias (auto-increment) mantienen sus valores actuales, evitando conflictos de claves primarias.

4. **Compatible con versiones**: Funciona en PostgreSQL 12+ sin problemas.

## Notas Importantes

- Este respaldo contiene TODOS los datos de producción actual
- Incluye usuarios, contraseñas hash, y datos sensibles
- Mantener seguro y no compartir públicamente
- Perfecto para migrar entre entornos de desarrollo

## Comando Original Usado

```bash
docker exec maestro-postgres pg_dump -U postgres -d maestro_inventario --no-owner --no-privileges --verbose --inserts --column-inserts > bdtotal_local.sql
```

## Verificación

Para verificar que el respaldo está completo:
```sql
-- Contar registros en tablas principales
SELECT 'products' as tabla, COUNT(*) as registros FROM products
UNION ALL
SELECT 'product_variants', COUNT(*) FROM product_variants
UNION ALL
SELECT 'inventory_movements', COUNT(*) FROM inventory_movements
UNION ALL
SELECT 'users', COUNT(*) FROM users;
```

---
**Creado**: 02/08/2025  
**Por**: Sistema de Respaldos Maestro Inventario
