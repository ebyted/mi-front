#!/bin/bash
# Script para sincronizar base de datos local con VPS

echo "🚀 Sincronizando base de datos local con VPS..."

# Variables de configuración
LOCAL_DB_NAME="maestro_inventario"
LOCAL_DB_USER="postgres"
LOCAL_DB_HOST="localhost"
LOCAL_DB_PORT="5432"

VPS_HOST="tu-servidor.com"
VPS_DB_NAME="maestro_inventario"
VPS_DB_USER="postgres"
VPS_DB_PORT="5432"

# 1. Crear dump de la base de datos local
echo "📦 Creando dump de base de datos local..."
docker-compose exec postgres pg_dump -U $LOCAL_DB_USER -h $LOCAL_DB_HOST -p $LOCAL_DB_PORT $LOCAL_DB_NAME > backup_local.sql

# 2. Comprimir el archivo
echo "🗜️ Comprimiendo backup..."
gzip backup_local.sql

# 3. Subir al VPS
echo "⬆️ Subiendo backup al VPS..."
scp backup_local.sql.gz usuario@$VPS_HOST:/tmp/

# 4. Conectar al VPS y restaurar
echo "🔄 Conectando al VPS para restaurar..."
ssh usuario@$VPS_HOST << 'EOF'
  # Descomprimir
  cd /tmp
  gunzip backup_local.sql.gz
  
  # Parar servicios que usen la DB
  docker-compose down
  
  # Restaurar base de datos
  docker-compose up -d postgres
  sleep 10
  docker-compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS maestro_inventario;"
  docker-compose exec postgres psql -U postgres -c "CREATE DATABASE maestro_inventario;"
  docker-compose exec postgres psql -U postgres -d maestro_inventario < backup_local.sql
  
  # Reiniciar servicios
  docker-compose up -d
  
  # Limpiar archivo temporal
  rm backup_local.sql
EOF

echo "✅ Sincronización completada!"
