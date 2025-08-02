#!/bin/bash

# =============================================================================
# SCRIPT DE RESTAURACIÓN DE BASE DE DATOS
# Sistema: Maestro Inventario - VPS Restore Script
# Versión: 1.0
# Autor: Sistema Automatizado
# =============================================================================

# Configuración
PROJECT_DIR="/opt/maestro_inventario"  # Ajustar según tu instalación
BACKUP_DIR="/opt/backups/maestro_inventario"

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

# Mostrar ayuda
show_help() {
    echo "USO: $0 [OPCIONES] ARCHIVO_RESPALDO"
    echo ""
    echo "OPCIONES:"
    echo "  -h, --help          Mostrar esta ayuda"
    echo "  -f, --force         Forzar restauración sin confirmación"
    echo "  -t, --type TYPE     Tipo de respaldo (auto|sqlite|postgresql|mysql)"
    echo ""
    echo "EJEMPLOS:"
    echo "  $0 sqlite_backup_20240801_143022.db.gz"
    echo "  $0 -t postgresql postgresql_backup_20240801_143022.sql.gz"
    echo "  $0 --force mysql_backup_20240801_143022.sql.gz"
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

# Detectar tipo de respaldo
detect_backup_type() {
    local file="$1"
    local basename=$(basename "$file")
    
    case "$basename" in
        sqlite_*)
            echo "sqlite"
            ;;
        postgresql_*)
            echo "postgresql"
            ;;
        mysql_*)
            echo "mysql"
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

# Confirmar restauración
confirm_restore() {
    if [ "$FORCE" = "true" ]; then
        return 0
    fi
    
    warning "¡ADVERTENCIA! Esta operación sobrescribirá la base de datos actual."
    warning "Base de datos: $DATABASE_NAME"
    warning "Archivo de respaldo: $1"
    echo ""
    read -p "¿Estás seguro de que quieres continuar? (sí/no): " -r
    
    if [[ $REPLY =~ ^[Ss][Íí]?$ ]]; then
        return 0
    else
        log "Operación cancelada por el usuario"
        return 1
    fi
}

# Restaurar SQLite
restore_sqlite() {
    local backup_file="$1"
    local temp_file="/tmp/$(basename "$backup_file" .gz)"
    
    log "Iniciando restauración SQLite desde: $backup_file"
    
    # Descomprimir si es necesario
    if [[ "$backup_file" == *.gz ]]; then
        log "Descomprimiendo archivo..."
        gunzip -c "$backup_file" > "$temp_file"
        backup_file="$temp_file"
    fi
    
    # Crear respaldo de la BD actual
    if [ -f "$DATABASE_NAME" ]; then
        local current_backup="$DATABASE_NAME.pre-restore.$(date +%Y%m%d_%H%M%S)"
        log "Creando respaldo de la BD actual: $current_backup"
        cp "$DATABASE_NAME" "$current_backup"
    fi
    
    # Restaurar base de datos
    if [[ "$backup_file" == *.sql ]]; then
        # Restaurar desde dump SQL
        log "Restaurando desde dump SQL..."
        sqlite3 "$DATABASE_NAME" < "$backup_file"
    else
        # Restaurar desde archivo .db
        log "Restaurando desde archivo de base de datos..."
        cp "$backup_file" "$DATABASE_NAME"
    fi
    
    if [ $? -eq 0 ]; then
        log "Restauración SQLite completada exitosamente"
        # Limpiar archivo temporal
        [ -f "$temp_file" ] && rm -f "$temp_file"
        return 0
    else
        error "Error durante la restauración SQLite"
        return 1
    fi
}

# Restaurar PostgreSQL
restore_postgresql() {
    local backup_file="$1"
    local temp_file="/tmp/$(basename "$backup_file" .gz)"
    
    log "Iniciando restauración PostgreSQL desde: $backup_file"
    
    # Configurar PGPASSWORD
    export PGPASSWORD="$DATABASE_PASSWORD"
    
    # Descomprimir si es necesario
    if [[ "$backup_file" == *.gz ]]; then
        log "Descomprimiendo archivo..."
        gunzip -c "$backup_file" > "$temp_file"
        backup_file="$temp_file"
    fi
    
    # Restaurar base de datos
    if [[ "$backup_file" == *.dump ]]; then
        # Restaurar desde formato personalizado
        log "Restaurando desde formato personalizado..."
        pg_restore -h "$DATABASE_HOST" \
                   -p "${DATABASE_PORT:-5432}" \
                   -U "$DATABASE_USER" \
                   -d "$DATABASE_NAME" \
                   --verbose \
                   --clean \
                   --if-exists \
                   "$backup_file"
    else
        # Restaurar desde SQL
        log "Restaurando desde SQL..."
        psql -h "$DATABASE_HOST" \
             -p "${DATABASE_PORT:-5432}" \
             -U "$DATABASE_USER" \
             -d "$DATABASE_NAME" \
             -f "$backup_file"
    fi
    
    if [ $? -eq 0 ]; then
        log "Restauración PostgreSQL completada exitosamente"
        # Limpiar archivo temporal
        [ -f "$temp_file" ] && rm -f "$temp_file"
        unset PGPASSWORD
        return 0
    else
        error "Error durante la restauración PostgreSQL"
        unset PGPASSWORD
        return 1
    fi
}

# Restaurar MySQL
restore_mysql() {
    local backup_file="$1"
    local temp_file="/tmp/$(basename "$backup_file" .gz)"
    
    log "Iniciando restauración MySQL desde: $backup_file"
    
    # Descomprimir si es necesario
    if [[ "$backup_file" == *.gz ]]; then
        log "Descomprimiendo archivo..."
        gunzip -c "$backup_file" > "$temp_file"
        backup_file="$temp_file"
    fi
    
    # Restaurar base de datos
    mysql -h "$DATABASE_HOST" \
          -P "${DATABASE_PORT:-3306}" \
          -u "$DATABASE_USER" \
          -p"$DATABASE_PASSWORD" \
          "$DATABASE_NAME" \
          < "$backup_file"
    
    if [ $? -eq 0 ]; then
        log "Restauración MySQL completada exitosamente"
        # Limpiar archivo temporal
        [ -f "$temp_file" ] && rm -f "$temp_file"
        return 0
    else
        error "Error durante la restauración MySQL"
        return 1
    fi
}

# Función principal
main() {
    local backup_file="$BACKUP_FILE"
    local backup_type="$BACKUP_TYPE"
    
    log "=== INICIANDO RESTAURACIÓN ==="
    log "Archivo de respaldo: $backup_file"
    
    # Verificar que el archivo existe
    if [ ! -f "$backup_file" ]; then
        # Buscar en directorio de respaldos
        if [ -f "$BACKUP_DIR/$backup_file" ]; then
            backup_file="$BACKUP_DIR/$backup_file"
        else
            error "Archivo de respaldo no encontrado: $backup_file"
            exit 1
        fi
    fi
    
    # Cargar configuración
    load_env_vars
    
    # Detectar tipo de respaldo si no se especificó
    if [ "$backup_type" = "auto" ]; then
        backup_type=$(detect_backup_type "$backup_file")
        log "Tipo de respaldo detectado: $backup_type"
    fi
    
    # Confirmar restauración
    if ! confirm_restore "$backup_file"; then
        exit 1
    fi
    
    # Ejecutar restauración según el tipo
    case "$backup_type" in
        sqlite)
            restore_sqlite "$backup_file"
            ;;
        postgresql)
            restore_postgresql "$backup_file"
            ;;
        mysql)
            restore_mysql "$backup_file"
            ;;
        *)
            error "Tipo de respaldo no soportado o no detectado: $backup_type"
            exit 1
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        log "=== RESTAURACIÓN COMPLETADA EXITOSAMENTE ==="
        warning "Recuerda ejecutar las migraciones de Django si es necesario:"
        warning "cd $PROJECT_DIR && python manage.py migrate"
    else
        error "=== RESTAURACIÓN FALLÓ ==="
        exit 1
    fi
}

# Parsear argumentos
FORCE=false
BACKUP_TYPE="auto"
BACKUP_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -t|--type)
            BACKUP_TYPE="$2"
            shift 2
            ;;
        *)
            BACKUP_FILE="$1"
            shift
            ;;
    esac
done

# Verificar argumentos
if [ -z "$BACKUP_FILE" ]; then
    error "Debe especificar un archivo de respaldo"
    show_help
    exit 1
fi

# Verificaciones previas
if [ ! -d "$PROJECT_DIR" ]; then
    error "Directorio del proyecto no encontrado: $PROJECT_DIR"
    exit 1
fi

# Ejecutar función principal
main
