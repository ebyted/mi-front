#!/bin/bash

# Script de respaldo oficial para la base de datos PostgreSQL
# Maestro Inventario - bdlocal_v3.5+

set -e

echo "🗄️ Iniciando respaldo de base de datos - Maestro Inventario"
echo "============================================================"

# Variables de configuración
DB_CONTAINER="sanchobd-2y0ssb.1.xjngxaq8kjrzwsnuq6i97cwep"
DB_NAME="maestro_inventario"
DB_USER="maestro"
BACKUP_DIR="/tmp"
TIMESTAMP=$(date +%Y%m%d_%H%M)
VERSION="v3.5"

# Función para log con timestamp
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Verificar que el contenedor esté corriendo
if ! docker ps | grep -q $DB_CONTAINER; then
    log "❌ ERROR: El contenedor de base de datos no está corriendo"
    exit 1
fi

log "📦 Contenedor de BD encontrado: $DB_CONTAINER"

# 1. Backup en formato custom (recomendado para restore)
log "💾 Creando backup en formato custom..."
docker exec $DB_CONTAINER pg_dump \
    -U $DB_USER \
    -d $DB_NAME \
    --encoding=UTF8 \
    --no-owner \
    --no-privileges \
    --verbose \
    --format=custom > $BACKUP_DIR/bdlocal_${VERSION}_custom_${TIMESTAMP}.backup

# 2. Backup en formato SQL (para compatibilidad)
log "📄 Creando backup en formato SQL..."
docker exec $DB_CONTAINER sh -c "PGCLIENTENCODING=UTF8 pg_dump \
    -U $DB_USER \
    -d $DB_NAME \
    --encoding=UTF8 \
    --no-owner \
    --no-privileges \
    --format=plain \
    --inserts \
    --column-inserts" > $BACKUP_DIR/bdlocal_${VERSION}_sql_${TIMESTAMP}.sql

# 3. Backup comprimido (para almacenamiento eficiente)
log "🗜️ Creando backup comprimido..."
docker exec $DB_CONTAINER pg_dump \
    -U $DB_USER \
    -d $DB_NAME \
    --encoding=UTF8 \
    --no-owner \
    --no-privileges \
    --format=custom | gzip > $BACKUP_DIR/bdlocal_${VERSION}_compressed_${TIMESTAMP}.backup.gz

# 4. Verificar los backups creados
log "✅ Verificando backups creados..."
ls -lh $BACKUP_DIR/bdlocal_${VERSION}_*${TIMESTAMP}*

# 5. Información de restore
log "📝 Información para restore:"
echo ""
echo "Para restaurar el backup custom:"
echo "pg_restore -U usuario -d nombre_bd --clean --if-exists $BACKUP_DIR/bdlocal_${VERSION}_custom_${TIMESTAMP}.backup"
echo ""
echo "Para restaurar el backup SQL:"
echo "psql -U usuario -d nombre_bd < $BACKUP_DIR/bdlocal_${VERSION}_sql_${TIMESTAMP}.sql"
echo ""
echo "Para restaurar el backup comprimido:"
echo "gunzip -c $BACKUP_DIR/bdlocal_${VERSION}_compressed_${TIMESTAMP}.backup.gz | pg_restore -U usuario -d nombre_bd --clean --if-exists"

log "🎉 Respaldo completado exitosamente!"
log "📁 Archivos creados en: $BACKUP_DIR/"
