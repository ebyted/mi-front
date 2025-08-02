#!/bin/bash

# =============================================================================
# SCRIPT DE RESPALDO AUTOMÁTICO DE BASE DE DATOS
# Sistema: Maestro Inventario - VPS Backup Script
# Versión: 1.0
# Autor: Sistema Automatizado
# =============================================================================

# Configuración
PROJECT_DIR="/opt/maestro_inventario"  # Ajustar según tu instalación
BACKUP_DIR="/opt/backups/maestro_inventario"
DATE=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=30  # Mantener respaldos por 30 días

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funciones de utilidad
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR $(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING $(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Crear directorio de respaldos si no existe
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log "Creando directorio de respaldos: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
        chmod 755 "$BACKUP_DIR"
    fi
}

# Cargar variables de entorno
load_env_vars() {
    if [ -f "$PROJECT_DIR/.env" ]; then
        log "Cargando variables de entorno desde $PROJECT_DIR/.env"
        export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
    else
        warning "No se encontró archivo .env, usando valores por defecto"
    fi
    
    # Variables por defecto
    DATABASE_ENGINE=${DATABASE_ENGINE:-"django.db.backends.sqlite3"}
    DATABASE_NAME=${DATABASE_NAME:-"$PROJECT_DIR/db.sqlite3"}
    DATABASE_USER=${DATABASE_USER:-""}
    DATABASE_PASSWORD=${DATABASE_PASSWORD:-""}
    DATABASE_HOST=${DATABASE_HOST:-"localhost"}
    DATABASE_PORT=${DATABASE_PORT:-""}
}

# Respaldo para SQLite
backup_sqlite() {
    local db_file="$DATABASE_NAME"
    local backup_file="$BACKUP_DIR/sqlite_backup_$DATE.db"
    
    log "Iniciando respaldo SQLite: $db_file"
    
    if [ -f "$db_file" ]; then
        # Crear respaldo usando sqlite3
        sqlite3 "$db_file" ".backup '$backup_file'"
        
        if [ $? -eq 0 ]; then
            # Comprimir el respaldo
            gzip "$backup_file"
            log "Respaldo SQLite completado: $backup_file.gz"
            
            # Crear también un dump SQL
            local sql_backup="$BACKUP_DIR/sqlite_dump_$DATE.sql"
            sqlite3 "$db_file" ".dump" > "$sql_backup"
            gzip "$sql_backup"
            log "Dump SQL creado: $sql_backup.gz"
            
            return 0
        else
            error "Error al crear respaldo SQLite"
            return 1
        fi
    else
        error "Archivo de base de datos SQLite no encontrado: $db_file"
        return 1
    fi
}

# Respaldo para PostgreSQL
backup_postgresql() {
    local backup_file="$BACKUP_DIR/postgresql_backup_$DATE.sql"
    
    log "Iniciando respaldo PostgreSQL"
    
    # Configurar PGPASSWORD para evitar prompt
    export PGPASSWORD="$DATABASE_PASSWORD"
    
    # Crear respaldo usando pg_dump
    pg_dump -h "$DATABASE_HOST" \
            -p "${DATABASE_PORT:-5432}" \
            -U "$DATABASE_USER" \
            -d "$DATABASE_NAME" \
            --verbose \
            --clean \
            --no-owner \
            --no-privileges \
            > "$backup_file"
    
    if [ $? -eq 0 ]; then
        # Comprimir el respaldo
        gzip "$backup_file"
        log "Respaldo PostgreSQL completado: $backup_file.gz"
        
        # Crear también un respaldo personalizado (más eficiente)
        local custom_backup="$BACKUP_DIR/postgresql_custom_$DATE.dump"
        pg_dump -h "$DATABASE_HOST" \
                -p "${DATABASE_PORT:-5432}" \
                -U "$DATABASE_USER" \
                -d "$DATABASE_NAME" \
                --format=custom \
                --verbose \
                --clean \
                --no-owner \
                --no-privileges \
                > "$custom_backup"
        
        gzip "$custom_backup"
        log "Respaldo personalizado PostgreSQL creado: $custom_backup.gz"
        
        unset PGPASSWORD
        return 0
    else
        error "Error al crear respaldo PostgreSQL"
        unset PGPASSWORD
        return 1
    fi
}

# Respaldo para MySQL
backup_mysql() {
    local backup_file="$BACKUP_DIR/mysql_backup_$DATE.sql"
    
    log "Iniciando respaldo MySQL"
    
    # Crear respaldo usando mysqldump
    mysqldump -h "$DATABASE_HOST" \
              -P "${DATABASE_PORT:-3306}" \
              -u "$DATABASE_USER" \
              -p"$DATABASE_PASSWORD" \
              --single-transaction \
              --routines \
              --triggers \
              --events \
              --add-drop-database \
              --databases "$DATABASE_NAME" \
              > "$backup_file"
    
    if [ $? -eq 0 ]; then
        # Comprimir el respaldo
        gzip "$backup_file"
        log "Respaldo MySQL completado: $backup_file.gz"
        return 0
    else
        error "Error al crear respaldo MySQL"
        return 1
    fi
}

# Respaldo de archivos media/static
backup_media_files() {
    local media_backup="$BACKUP_DIR/media_files_$DATE.tar.gz"
    
    log "Iniciando respaldo de archivos media"
    
    if [ -d "$PROJECT_DIR/media" ]; then
        tar -czf "$media_backup" -C "$PROJECT_DIR" media/
        log "Respaldo de archivos media completado: $media_backup"
    else
        warning "Directorio media no encontrado"
    fi
    
    # Respaldar archivos static si existen
    if [ -d "$PROJECT_DIR/static" ]; then
        local static_backup="$BACKUP_DIR/static_files_$DATE.tar.gz"
        tar -czf "$static_backup" -C "$PROJECT_DIR" static/
        log "Respaldo de archivos static completado: $static_backup"
    fi
}

# Limpiar respaldos antiguos
cleanup_old_backups() {
    log "Limpiando respaldos antiguos (más de $RETENTION_DAYS días)"
    
    find "$BACKUP_DIR" -name "*.gz" -type f -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*.sql" -type f -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*.db" -type f -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*.dump" -type f -mtime +$RETENTION_DAYS -delete
    
    log "Limpieza completada"
}

# Función principal
main() {
    log "=== INICIANDO RESPALDO AUTOMÁTICO ==="
    log "Fecha: $(date)"
    log "Directorio del proyecto: $PROJECT_DIR"
    log "Directorio de respaldos: $BACKUP_DIR"
    
    # Crear directorio de respaldos
    create_backup_dir
    
    # Cargar configuración
    load_env_vars
    
    log "Motor de base de datos: $DATABASE_ENGINE"
    
    # Determinar tipo de base de datos y ejecutar respaldo
    case "$DATABASE_ENGINE" in

            backup_postgresql
            ;;
        *)
            error "Motor de base de datos no soportado: $DATABASE_ENGINE"
            exit 1
            ;;
    esac
    
    # Respaldar archivos
    backup_media_files
    
    # Limpiar respaldos antiguos
    cleanup_old_backups
    
    log "=== RESPALDO COMPLETADO ==="
    
    # Mostrar estadísticas
    log "Archivos en directorio de respaldos:"
    ls -la "$BACKUP_DIR" | grep "$DATE" || warning "No se encontraron archivos del respaldo actual"
}

# Verificaciones previas
if [ ! -d "$PROJECT_DIR" ]; then
    error "Directorio del proyecto no encontrado: $PROJECT_DIR"
    error "Por favor, ajusta la variable PROJECT_DIR en el script"
    exit 1
fi

# Ejecutar función principal
main "$@"
