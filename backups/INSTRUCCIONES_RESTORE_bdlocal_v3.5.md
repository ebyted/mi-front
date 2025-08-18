# Respaldo bdlocal_v3.5 - Instrucciones de Restauración

## Archivos de respaldo creados:

✅ **bdlocal_v3.5_.backup** (334 KB) - Formato custom/binario de PostgreSQL
✅ **bdlocal_v3.5_full_.sql** (2.2 MB) - Formato SQL plain text con INSERTs

## 🔄 Instrucciones de Restauración (SIN ERRORES UTF-8)

### Opción 1: Usando el archivo .backup (RECOMENDADO)

```bash
# Crear nueva base de datos
createdb -U postgres -E UTF8 --template=template0 maestro_inventario_restore

# Restaurar desde backup custom
pg_restore -U postgres -d maestro_inventario_restore --clean --if-exists --verbose bdlocal_v3.5_.backup
```

### Opción 2: Usando el archivo .sql

```bash
# Crear nueva base de datos con encoding UTF8
createdb -U postgres -E UTF8 --template=template0 maestro_inventario_restore

# Restaurar desde SQL con configuración UTF8
PGCLIENTENCODING=UTF8 psql -U postgres -d maestro_inventario_restore -f bdlocal_v3.5_full_.sql
```

### Opción 3: En Docker (como en el VPS)

```bash
# Copiar archivo al contenedor
docker cp bdlocal_v3.5_.backup nombre_contenedor_db:/tmp/

# Restaurar dentro del contenedor
docker exec nombre_contenedor_db pg_restore -U maestro -d maestro_inventario --clean --if-exists /tmp/bdlocal_v3.5_.backup
```

## 📊 Contenido del respaldo:

- **2,598 productos** completos con variantes y precios
- **317 marcas** y categorías
- **10 usuarios** con roles y permisos
- **Almacenes y stock** por ubicación
- **Movimientos de inventario** históricos
- **Órdenes de compra y venta**
- **Clientes y proveedores**
- **Estructura completa** de Django (migraciones, permisos, etc.)

## ⚠️ Notas importantes:

1. **Encoding**: Todos los backups están configurados con UTF8 para evitar problemas de caracteres
2. **Sin ownership**: Los backups no incluyen información de propietario para mayor compatibilidad
3. **Formato custom**: El archivo .backup es el más recomendado para restore completo
4. **Formato SQL**: El archivo .sql es más legible y editable si necesitas hacer modificaciones

## 🛠️ Solución de problemas comunes:

### Si aparece error de UTF-8:
```bash
export PGCLIENTENCODING=UTF8
# Luego ejecutar el comando de restore
```

### Si hay conflictos de permisos:
```bash
# Usar --no-owner --no-privileges en pg_restore
pg_restore -U postgres -d nombre_bd --clean --if-exists --no-owner --no-privileges archivo.backup
```

### Para verificar el encoding de la BD:
```sql
SELECT datname, encoding, datcollate, datctype FROM pg_database WHERE datname = 'maestro_inventario';
```

---
**Respaldo creado:** 18 de Agosto 2025, 21:10 UTC  
**Origen:** VPS 168.231.74.214 - Contenedor sanchobd-2y0ssb.1.xjngxaq8kjrzwsnuq6i97cwep  
**Versión:** bdlocal_v3.5  
**Tamaño total:** ~2.5 MB sin comprimir
