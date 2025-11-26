# Guía de Respaldo y Restauración PostgreSQL

## 📋 Comandos Exitosos para Respaldo y Restauración

Esta guía contiene los comandos que funcionaron correctamente para crear respaldos de PostgreSQL y restaurarlos en contenedores Docker del VPS.

---

## 🔧 Configuración Previa

### Variables de Entorno
```powershell
# Configurar contraseña para evitar prompts
$env:PGPASSWORD='maestro'
```

### Verificar Configuración de la Base de Datos
```powershell
# Verificar configuración actual de Django
python manage.py shell -c "from django.db import connection; print('Database:', connection.settings_dict)"
```

---

## 💾 Crear Respaldos (Local)

### 1. Respaldo Completo UTF-8 (Formato SQL)
```powershell
$env:PGPASSWORD='maestro'
pg_dump -h localhost -p 5434 -U maestro -d maestro_inventario --clean --if-exists --create --inserts --column-inserts --no-owner --no-privileges --encoding=UTF8 --verbose > bdlocal_utf8_completo.sql
```

### 2. Respaldo Completo Binario (Formato Custom)
```powershell
$env:PGPASSWORD='maestro'
pg_dump -h localhost -p 5434 -U maestro -d maestro_inventario --format=custom --clean --if-exists --create --no-owner --no-privileges --encoding=UTF8 --verbose > bdlocal_utf8_completo.dump
```

### 3. Respaldo Solo Esquema (Estructura)
```powershell
$env:PGPASSWORD='maestro'
pg_dump -h localhost -p 5434 -U maestro -d maestro_inventario --schema-only --no-owner --no-privileges | Out-File -FilePath bdlocal_schema_clean.sql -Encoding UTF8
```

### 4. Respaldo Solo Datos
```powershell
$env:PGPASSWORD='maestro'
pg_dump -h localhost -p 5434 -U maestro -d maestro_inventario --data-only --inserts --disable-triggers --no-owner --no-privileges | Out-File -FilePath bdlocal_data_clean.sql -Encoding UTF8
```

---

## 📤 Transferir Archivos al VPS

### Transferir Archivos por SCP
```bash
# Esquema
scp bdlocal_schema_clean.sql root@168.231.74.214:/tmp/

# Datos
scp bdlocal_data_clean.sql root@168.231.74.214:/tmp/

# Respaldo completo (alternativo)
scp bdlocal_utf8_completo.sql root@168.231.74.214:/tmp/
```

---

## 🔄 Restauración en VPS (Método Exitoso)

### Información del Contenedor
- **IP del VPS**: `168.231.74.214`
- **Contenedor de BD**: `sanchobd-2y0ssb.1.xjngxaq8kjrzwsnuq6i97cwep`
- **Base de Datos**: `maestro_inventario`
- **Usuario**: `maestro`
- **Contraseña**: `maestro`

### Paso 1: Limpiar Base de Datos Existente
```bash
ssh root@168.231.74.214 "docker exec sanchobd-2y0ssb.1.xjngxaq8kjrzwsnuq6i97cwep psql -U maestro -d maestro_inventario -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'"
```

### Paso 2: Restaurar Esquema (Estructura)
```bash
# Copiar archivo al contenedor
ssh root@168.231.74.214 "docker cp /tmp/bdlocal_schema_clean.sql sanchobd-2y0ssb.1.xjngxaq8kjrzwsnuq6i97cwep:/tmp/"

# Aplicar esquema
ssh root@168.231.74.214 "docker exec sanchobd-2y0ssb.1.xjngxaq8kjrzwsnuq6i97cwep psql -U maestro -d maestro_inventario -f /tmp/bdlocal_schema_clean.sql"
```

### Paso 3: Restaurar Datos
```bash
# Copiar archivo de datos al contenedor
ssh root@168.231.74.214 "docker cp /tmp/bdlocal_data_clean.sql sanchobd-2y0ssb.1.xjngxaq8kjrzwsnuq6i97cwep:/tmp/"

# Aplicar datos
ssh root@168.231.74.214 "docker exec sanchobd-2y0ssb.1.xjngxaq8kjrzwsnuq6i97cwep psql -U maestro -d maestro_inventario -f /tmp/bdlocal_data_clean.sql"
```

---

## ✅ Verificación de la Restauración

### Verificar Tablas Creadas
```bash
ssh root@168.231.74.214 "docker exec sanchobd-2y0ssb.1.xjngxaq8kjrzwsnuq6i97cwep psql -U maestro -d maestro_inventario -c '\dt' | head -20"
```

### Verificar Conteos de Registros
```bash
ssh root@168.231.74.214 "docker exec sanchobd-2y0ssb.1.xjngxaq8kjrzwsnuq6i97cwep psql -U maestro -d maestro_inventario -c 'SELECT COUNT(*) as productos FROM core_product; SELECT COUNT(*) as marcas FROM core_brand; SELECT COUNT(*) as categorias FROM core_category; SELECT COUNT(*) as usuarios FROM core_user; SELECT COUNT(*) as almacenes FROM core_warehouse;'"
```

---

## 🔍 Comandos de Diagnóstico

### Verificar Estado del Contenedor
```bash
ssh root@168.231.74.214 "docker ps | grep sanchobd"
```

### Verificar Conexión a Base de Datos
```bash
ssh root@168.231.74.214 "docker exec sanchobd-2y0ssb.1.xjngxaq8kjrzwsnuq6i97cwep psql -U maestro -d maestro_inventario -c 'SELECT version();'"
```

### Listar Bases de Datos
```bash
ssh root@168.231.74.214 "docker exec sanchobd-2y0ssb.1.xjngxaq8kjrzwsnuq6i97cwep psql -U maestro -c '\l'"
```

---

## 📊 Resultados de la Última Restauración Exitosa

```
 productos: 2,598 registros
 marcas: 317 registros  
 categorias: 96 registros
 usuarios: 9 registros
 almacenes: 2 registros
```

---

## 🚨 Notas Importantes

### Problemas de Codificación Resueltos
- **Problema**: `ERROR: invalid byte sequence for encoding "UTF8": 0xff`
- **Solución**: Usar `Out-File -Encoding UTF8` en PowerShell en lugar de redirección `>`
- **Método Exitoso**: Separar esquema y datos en archivos distintos

### Opciones de pg_dump Críticas
- `--clean --if-exists`: Limpia antes de crear
- `--no-owner --no-privileges`: Evita problemas de permisos
- `--inserts`: Usa INSERT en lugar de COPY (más compatible)
- `--disable-triggers`: Desactiva triggers durante restauración de datos
- `--encoding=UTF8`: Especifica codificación explícita

### Método Recomendado
1. **Esquema primero**: Crear estructura de tablas
2. **Datos después**: Insertar registros con triggers desactivados
3. **Verificación**: Contar registros para validar integridad

---

## 🔄 Comando Completo (Una Sola Línea)

### Para Esquema y Datos por Separado (Método Exitoso)
```bash
# Completo: Limpieza + Esquema + Datos
ssh root@168.231.74.214 "docker exec sanchobd-2y0ssb.1.xjngxaq8kjrzwsnuq6i97cwep psql -U maestro -d maestro_inventario -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;' && docker cp /tmp/bdlocal_schema_clean.sql sanchobd-2y0ssb.1.xjngxaq8kjrzwsnuq6i97cwep:/tmp/ && docker exec sanchobd-2y0ssb.1.xjngxaq8kjrzwsnuq6i97cwep psql -U maestro -d maestro_inventario -f /tmp/bdlocal_schema_clean.sql && docker cp /tmp/bdlocal_data_clean.sql sanchobd-2y0ssb.1.xjngxaq8kjrzwsnuq6i97cwep:/tmp/ && docker exec sanchobd-2y0ssb.1.xjngxaq8kjrzwsnuq6i97cwep psql -U maestro -d maestro_inventario -f /tmp/bdlocal_data_clean.sql"
```

---

## 📝 Archivos Generados

- `bdlocal_utf8_completo.sql` (4.5MB) - Respaldo completo UTF-8
- `bdlocal_utf8_completo.dump` (692KB) - Respaldo binario comprimido
- `bdlocal_schema_clean.sql` (87KB) - Solo estructura de tablas
- `bdlocal_data_clean.sql` (1.2MB) - Solo datos

---

*Documento actualizado: 18 de agosto de 2025*
*Última restauración exitosa: 18/08/2025 06:17 AM*
