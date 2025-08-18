# Ejemplos de Uso - Restauración bdlocal_v3.5

## 🎯 Uso del script PowerShell

### Ejemplo básico:
```powershell
.\restore-database.ps1 -DatabaseName "maestro_inventario_restore"
```

### Con usuario específico:
```powershell
.\restore-database.ps1 -DatabaseName "maestro_inventario_test" -PostgresUser "mi_usuario"
```

### Con archivo SQL específico:
```powershell
.\restore-database.ps1 -DatabaseName "maestro_inventario_dev" -BackupFile "bdlocal_v3.5_full_.sql"
```

## 🔧 Comandos manuales alternativos

### PostgreSQL local en Windows:

#### Crear BD y restaurar (formato .backup):
```cmd
createdb -U postgres -E UTF8 --template=template0 maestro_inventario_local
pg_restore -U postgres -d maestro_inventario_local --clean --if-exists --no-owner bdlocal_v3.5_.backup
```

#### Crear BD y restaurar (formato .sql):
```cmd
createdb -U postgres -E UTF8 --template=template0 maestro_inventario_local
set PGCLIENTENCODING=UTF8
psql -U postgres -d maestro_inventario_local -f bdlocal_v3.5_full_.sql
```

### PostgreSQL en Docker (local):

#### Con docker-compose:
```yaml
# En tu docker-compose.yml local
services:
  postgres_local:
    image: postgres:15
    environment:
      POSTGRES_DB: maestro_inventario_local
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: tu_password
    ports:
      - "5432:5432"
    volumes:
      - ./backups:/backups
```

#### Comandos de restauración en Docker:
```bash
# Copiar archivo al contenedor
docker cp bdlocal_v3.5_.backup postgres_container:/tmp/

# Restaurar
docker exec postgres_container pg_restore -U postgres -d maestro_inventario_local --clean --if-exists /tmp/bdlocal_v3.5_.backup
```

## 🧪 Comandos de verificación

### Contar registros principales:
```sql
-- Conectar: psql -U postgres -d maestro_inventario_local

SELECT 'Productos' as tabla, COUNT(*) as total FROM main_producto
UNION ALL
SELECT 'Marcas' as tabla, COUNT(*) as total FROM main_marca
UNION ALL
SELECT 'Usuarios' as tabla, COUNT(*) as total FROM auth_user
UNION ALL
SELECT 'Almacenes' as tabla, COUNT(*) as total FROM main_almacen;
```

### Verificar encoding:
```sql
SELECT datname, encoding, datcollate, datctype 
FROM pg_database 
WHERE datname = 'maestro_inventario_local';
```

### Ver tablas creadas:
```sql
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

## 📝 Notas importantes

1. **Ejecutar PowerShell como Administrador**
2. **PostgreSQL debe estar instalado y en el PATH**
3. **Los archivos .backup son más eficientes que .sql**
4. **Siempre usar encoding UTF8 para evitar errores**
5. **El backup incluye estructura completa + datos**

## ❓ Solución de problemas

### Error: "comando no encontrado"
```powershell
# Agregar PostgreSQL al PATH
$env:PATH += ";C:\Program Files\PostgreSQL\15\bin"
```

### Error: "authentication failed"
```powershell
# Configurar variable de entorno para password
$env:PGPASSWORD = "tu_password_postgres"
```

### Error: "database already exists"
```sql
-- Eliminar BD existente si es necesario
DROP DATABASE IF EXISTS maestro_inventario_local;
```
