#!/usr/bin/env python
"""
Script para exportar base de datos SQLite a archivo SQL de PostgreSQL
Genera un archivo .sql que puede importarse manualmente a PostgreSQL
"""

import sqlite3
import json
import os
from datetime import datetime

def export_sqlite_to_sql():
    """Exportar SQLite a archivo SQL compatible con PostgreSQL"""
    print("🔄 Exportando SQLite a formato SQL para PostgreSQL...")
    
    # Conectar a SQLite
    sqlite_conn = sqlite3.connect('db.sqlite3')
    sqlite_conn.row_factory = sqlite3.Row  # Para acceder por nombre de columna
    cursor = sqlite_conn.cursor()
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    sql_file = f"postgres_migration_{timestamp}.sql"
    
    with open(sql_file, 'w', encoding='utf-8') as f:
        f.write("-- Migración de SQLite a PostgreSQL\n")
        f.write(f"-- Generado: {datetime.now()}\n")
        f.write("-- Base de datos: maestro_inventario\n\n")
        
        f.write("BEGIN;\n\n")
        
        # Obtener todas las tablas
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        tables = cursor.fetchall()
        
        for table in tables:
            table_name = table[0]
            print(f"   📦 Procesando tabla: {table_name}")
            
            # Obtener datos de la tabla
            cursor.execute(f"SELECT * FROM {table_name}")
            rows = cursor.fetchall()
            
            if not rows:
                print(f"   ⚠️ Tabla {table_name} está vacía")
                continue
            
            # Obtener nombres de columnas
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns_info = cursor.fetchall()
            column_names = [col[1] for col in columns_info]
            
            f.write(f"-- Datos para tabla: {table_name}\n")
            f.write(f"-- Registros: {len(rows)}\n")
            
            # Generar INSERTs
            for row in rows:
                values = []
                for i, value in enumerate(row):
                    if value is None:
                        values.append('NULL')
                    elif isinstance(value, str):
                        # Escapar comillas simples
                        escaped_value = value.replace("'", "''")
                        values.append(f"'{escaped_value}'")
                    elif isinstance(value, bool):
                        values.append('TRUE' if value else 'FALSE')
                    else:
                        values.append(str(value))
                
                columns_str = ', '.join(column_names)
                values_str = ', '.join(values)
                
                f.write(f"INSERT INTO {table_name} ({columns_str}) VALUES ({values_str});\n")
            
            f.write(f"\n")
            print(f"   ✅ {table_name}: {len(rows)} registros exportados")
        
        f.write("COMMIT;\n")
    
    sqlite_conn.close()
    
    print(f"✅ Archivo SQL generado: {sql_file}")
    return sql_file

def create_postgres_setup_instructions(sql_file):
    """Crear archivo con instrucciones para configurar PostgreSQL"""
    instructions_file = f"INSTRUCCIONES_POSTGRES_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
    
    with open(instructions_file, 'w', encoding='utf-8') as f:
        f.write(f"""# Instrucciones para Migrar a PostgreSQL

## 📋 Resumen
- **Archivo SQL generado**: `{sql_file}`
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
docker run --name maestro_postgres \\
  -e POSTGRES_DB=maestro_inventario \\
  -e POSTGRES_USER=maestro \\
  -e POSTGRES_PASSWORD=maestro123 \\
  -p 5433:5432 \\
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
.venv\\Scripts\\activate
python manage.py migrate
```

### 4. Importar datos
```bash
# Opción A: Usando el archivo SQL generado
docker exec -i maestro_postgres psql -U maestro -d maestro_inventario < {sql_file}

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
\\dt

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
print(f"Users: {{User.objects.count()}}")
print(f"Products: {{Product.objects.count()}}")
print(f"Warehouses: {{Warehouse.objects.count()}}")
print(f"Movements: {{InventoryMovement.objects.count()}}")
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
- `{sql_file}` - Datos exportados
- `.env.postgres` - Configuración PostgreSQL
- `bdlocal_pre_postgres_*.sqlite3` - Respaldo SQLite
- Este archivo de instrucciones

¡Migración lista para ejecutar! 🚀
""")
    
    print(f"✅ Instrucciones creadas: {instructions_file}")
    return instructions_file

def main():
    """Función principal"""
    print("🚀 EXPORTACIÓN SQLITE → POSTGRESQL")
    print("=" * 50)
    print("Este script exporta tu SQLite a formato SQL de PostgreSQL")
    print("=" * 50)
    
    # Verificar que existe la BD SQLite
    if not os.path.exists('db.sqlite3'):
        print("❌ No se encuentra el archivo db.sqlite3")
        return False
    
    # Crear respaldo
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"bdlocal_pre_postgres_{timestamp}.sqlite3"
    
    try:
        import shutil
        shutil.copy2('db.sqlite3', backup_file)
        print(f"✅ Respaldo creado: {backup_file}")
    except Exception as e:
        print(f"⚠️ No se pudo crear respaldo: {e}")
    
    # Exportar a SQL
    try:
        sql_file = export_sqlite_to_sql()
    except Exception as e:
        print(f"❌ Error exportando datos: {e}")
        return False
    
    # Crear configuración PostgreSQL
    postgres_env = """# PostgreSQL settings para migración
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost
DATABASE_ENGINE=django.db.backends.postgresql
DATABASE_NAME=maestro_inventario
DATABASE_USER=maestro
DATABASE_PASSWORD=maestro123
DATABASE_HOST=localhost
DATABASE_PORT=5433
SECRET_KEY=inventario-maestro-inventario-secret-key-123456789abcdef
"""
    
    with open('.env.postgres', 'w', encoding='utf-8') as f:
        f.write(postgres_env)
    
    print("✅ Configuración PostgreSQL creada: .env.postgres")
    
    # Crear instrucciones
    try:
        instructions_file = create_postgres_setup_instructions(sql_file)
    except Exception as e:
        print(f"⚠️ Error creando instrucciones: {e}")
        instructions_file = None
    
    # Resumen final
    print("\n" + "=" * 50)
    print("🎉 EXPORTACIÓN COMPLETADA")
    print("=" * 50)
    print(f"📁 Respaldo SQLite: {backup_file}")
    print(f"📄 Archivo SQL: {sql_file}")
    print("⚙️ Configuración: .env.postgres")
    if instructions_file:
        print(f"📋 Instrucciones: {instructions_file}")
    
    print("\n🔄 PRÓXIMOS PASOS:")
    print("1. Configurar PostgreSQL (Docker o local)")
    print("2. Ejecutar migraciones Django")
    print("3. Importar datos SQL")
    print("4. Cambiar configuración a PostgreSQL")
    
    if instructions_file:
        print(f"\n📖 Ver instrucciones detalladas en: {instructions_file}")
    
    return True

if __name__ == "__main__":
    main()
