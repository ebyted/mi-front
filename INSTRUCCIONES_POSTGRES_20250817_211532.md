# Instrucciones para Migrar a PostgreSQL

## 📋 Resumen
- **Archivo SQL generado**: `postgres_migration_20250817_211532.sql`
- **Base de datos destino**: `maestro_inventario`
- **Usuario**: `maestro`
- **Password**: `maestro123`
- **Puerto**: `5433` (local) o `5432` (Docker)

## 🐘 Opción 1: Usar Docker (Recomendado)

### 1. Iniciar PostgreSQL con Docker
```bash
# Usar el docker-compose incluido
docker-compose -f docker-compose.postgres.yml up -d

# O crear contenedor manualmente
docker run --name maestro_postgres \
  -e POSTGRES_DB=maestro_inventario \
  -e POSTGRES_USER=maestro \
  -e POSTGRES_PASSWORD=maestro123 \
  -p 5433:5432 \
  -d postgres:15
```

### 2. Verificar que PostgreSQL está funcionando
```bash
docker exec -it maestro_postgres psql -U maestro -d maestro_inventario -c "SELECT version();"
```

### 3. Ejecutar migraciones Django
```bash
# Cambiar configuración a PostgreSQL
copy .env.postgres .env

# Activar entorno virtual y migrar
.venv\Scripts\activate
python manage.py migrate
```

### 4. Importar datos
```bash
# Opción A: Usando el archivo SQL generado
docker exec -i maestro_postgres psql -U maestro -d maestro_inventario < postgres_migration_20250817_211532.sql

# Opción B: Usando Django loaddata (si tienes el JSON)
python manage.py loaddata sqlite_dump_*.json
```

## 🖥️ Opción 2: PostgreSQL Local

### 1. Instalar PostgreSQL
- Descargar desde: https://www.postgresql.org/download/windows/
- Instalar en puerto 5433
- Usuario: maestro
- Password: maestro123

### 2. Crear base de datos
```sql
CREATE DATABASE maestro_inventario;
CREATE USER maestro WITH PASSWORD 'maestro123';
GRANT ALL PRIVILEGES ON DATABASE maestro_inventario TO maestro;
```

### 3. Seguir pasos 3 y 4 de la opción Docker

## ⚙️ Configuración Django

### Archivo .env.postgres (ya creado)
```env
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost
DATABASE_ENGINE=django.db.backends.postgresql
DATABASE_NAME=maestro_inventario
DATABASE_USER=maestro
DATABASE_PASSWORD=maestro123
DATABASE_HOST=localhost
DATABASE_PORT=5433
SECRET_KEY=inventario-maestro-inventario-secret-key-123456789abcdef
```

### Para cambiar a PostgreSQL:
```bash
copy .env.postgres .env
# Reiniciar servidor Django
```

### Para volver a SQLite:
```bash
# Restaurar .env original
copy .env.backup .env  # si existe
# O editar manualmente .env
```

## 🔍 Verificación

### Verificar datos importados
```sql
-- Conectar a PostgreSQL
psql -h localhost -p 5433 -U maestro -d maestro_inventario

-- Verificar tablas
\dt

-- Contar registros en tablas principales
SELECT 'Users' as tabla, count(*) as registros FROM core_user
UNION ALL
SELECT 'Products', count(*) FROM core_product
UNION ALL
SELECT 'Warehouses', count(*) FROM core_warehouse
UNION ALL
SELECT 'Movements', count(*) FROM core_inventorymovement;
```

### Verificar desde Django
```python
# En Django shell
python manage.py shell

from core.models import User, Product, Warehouse, InventoryMovement
print(f"Users: {User.objects.count()}")
print(f"Products: {Product.objects.count()}")
print(f"Warehouses: {Warehouse.objects.count()}")
print(f"Movements: {InventoryMovement.objects.count()}")
```

## 🚨 Solución de Problemas

### Error de conexión
- Verificar que PostgreSQL está corriendo
- Verificar puerto (5433 local, 5432 Docker)
- Verificar credenciales

### Error de codificación
- Asegurar que PostgreSQL use UTF-8
- Verificar configuración CLIENT_ENCODING

### Error de permisos
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO maestro;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO maestro;
```

## 📁 Archivos generados
- `postgres_migration_20250817_211532.sql` - Datos exportados
- `.env.postgres` - Configuración PostgreSQL
- `bdlocal_pre_postgres_*.sqlite3` - Respaldo SQLite
- Este archivo de instrucciones

¡Migración lista para ejecutar! 🚀
