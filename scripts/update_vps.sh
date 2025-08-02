#!/bin/bash

# =============================================================================
# SCRIPT DE ACTUALIZACIÓN PARA VPS
# Sistema: Maestro Inventario - VPS Update Script
# Versión: 1.0
# Uso: ./update_vps.sh
# =============================================================================

# Configuración
PROJECT_DIR="/opt/maestro_inventario"  # Ajustar según tu instalación
BACKUP_DIR="/opt/backups/maestro_inventario"
SERVICE_NAME="maestro_inventario"  # Nombre del servicio systemd (si aplica)

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

info() {
    echo -e "${BLUE}[INFO $(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Verificar prerrequisitos
check_prerequisites() {
    log "Verificando prerrequisitos..."
    
    if [ ! -d "$PROJECT_DIR" ]; then
        error "Directorio del proyecto no encontrado: $PROJECT_DIR"
        error "Por favor, ajusta la variable PROJECT_DIR en el script"
        exit 1
    fi
    
    if [ ! -d "$PROJECT_DIR/.git" ]; then
        error "No es un repositorio Git: $PROJECT_DIR"
        exit 1
    fi
    
    log "✓ Prerrequisitos verificados"
}

# Crear respaldo antes de actualizar
create_backup() {
    log "Creando respaldo antes de la actualización..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Respaldar base de datos
    if [ -f "$PROJECT_DIR/db.sqlite3" ]; then
        local backup_file="$BACKUP_DIR/pre_update_$(date +%Y%m%d_%H%M%S).db"
        cp "$PROJECT_DIR/db.sqlite3" "$backup_file"
        log "✓ Respaldo de BD creado: $backup_file"
    fi
    
    # Respaldar archivos de configuración
    if [ -f "$PROJECT_DIR/.env" ]; then
        local env_backup="$BACKUP_DIR/env_backup_$(date +%Y%m%d_%H%M%S)"
        cp "$PROJECT_DIR/.env" "$env_backup"
        log "✓ Respaldo de .env creado: $env_backup"
    fi
}

# Detener servicios
stop_services() {
    log "Deteniendo servicios..."
    
    # Detener servicio systemd si existe
    if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
        info "Deteniendo servicio $SERVICE_NAME"
        sudo systemctl stop "$SERVICE_NAME"
    fi
    
    # Detener procesos Django que puedan estar ejecutándose
    local django_pids=$(pgrep -f "manage.py runserver")
    if [ -n "$django_pids" ]; then
        info "Deteniendo procesos Django..."
        echo "$django_pids" | xargs kill -TERM 2>/dev/null || true
        sleep 2
        echo "$django_pids" | xargs kill -KILL 2>/dev/null || true
    fi
    
    # Detener Gunicorn si está ejecutándose
    local gunicorn_pids=$(pgrep -f "gunicorn")
    if [ -n "$gunicorn_pids" ]; then
        info "Deteniendo procesos Gunicorn..."
        echo "$gunicorn_pids" | xargs kill -TERM 2>/dev/null || true
        sleep 2
        echo "$gunicorn_pids" | xargs kill -KILL 2>/dev/null || true
    fi
    
    log "✓ Servicios detenidos"
}

# Actualizar código
update_code() {
    log "Actualizando código desde repositorio..."
    
    cd "$PROJECT_DIR" || exit 1
    
    # Guardar cambios locales temporalmente
    git stash push -m "Auto-stash before update $(date)"
    
    # Obtener últimos cambios
    git fetch origin
    git pull origin main
    
    if [ $? -eq 0 ]; then
        log "✓ Código actualizado exitosamente"
    else
        error "Error al actualizar código"
        exit 1
    fi
}

# Actualizar dependencias
update_dependencies() {
    log "Actualizando dependencias..."
    
    cd "$PROJECT_DIR" || exit 1
    
    # Activar entorno virtual si existe
    if [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
        log "✓ Entorno virtual activado"
    elif [ -f ".venv/bin/activate" ]; then
        source .venv/bin/activate
        log "✓ Entorno virtual activado"
    else
        warning "No se encontró entorno virtual"
    fi
    
    # Instalar/actualizar dependencias
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt
        log "✓ Dependencias actualizadas"
    else
        warning "No se encontró requirements.txt"
    fi
}

# Ejecutar migraciones
run_migrations() {
    log "Ejecutando migraciones de base de datos..."
    
    cd "$PROJECT_DIR" || exit 1
    
    # Activar entorno virtual
    if [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
    elif [ -f ".venv/bin/activate" ]; then
        source .venv/bin/activate
    fi
    
    # Hacer migraciones si hay cambios
    info "Generando nuevas migraciones..."
    python manage.py makemigrations
    
    # Aplicar migraciones
    info "Aplicando migraciones..."
    python manage.py migrate
    
    if [ $? -eq 0 ]; then
        log "✓ Migraciones aplicadas exitosamente"
    else
        error "Error al aplicar migraciones"
        exit 1
    fi
}

# Recolectar archivos estáticos
collect_static() {
    log "Recolectando archivos estáticos..."
    
    cd "$PROJECT_DIR" || exit 1
    
    # Activar entorno virtual
    if [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
    elif [ -f ".venv/bin/activate" ]; then
        source .venv/bin/activate
    fi
    
    # Recolectar archivos estáticos
    python manage.py collectstatic --noinput
    
    if [ $? -eq 0 ]; then
        log "✓ Archivos estáticos recolectados"
    else
        warning "Error al recolectar archivos estáticos"
    fi
}

# Iniciar servicios
start_services() {
    log "Iniciando servicios..."
    
    # Iniciar servicio systemd si existe
    if systemctl list-unit-files | grep -q "$SERVICE_NAME"; then
        info "Iniciando servicio $SERVICE_NAME"
        sudo systemctl start "$SERVICE_NAME"
        sudo systemctl enable "$SERVICE_NAME"
        
        # Verificar que se inició correctamente
        sleep 3
        if systemctl is-active --quiet "$SERVICE_NAME"; then
            log "✓ Servicio $SERVICE_NAME iniciado exitosamente"
        else
            error "Error al iniciar servicio $SERVICE_NAME"
            systemctl status "$SERVICE_NAME"
        fi
    else
        warning "Servicio $SERVICE_NAME no encontrado"
        info "Para iniciar manualmente:"
        info "cd $PROJECT_DIR && source venv/bin/activate && python manage.py runserver 0.0.0.0:8030"
    fi
}

# Verificar estado
check_status() {
    log "Verificando estado del sistema..."
    
    # Verificar servicio
    if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
        log "✓ Servicio $SERVICE_NAME está ejecutándose"
    else
        warning "Servicio $SERVICE_NAME no está ejecutándose"
    fi
    
    # Verificar procesos
    if pgrep -f "manage.py runserver" > /dev/null; then
        log "✓ Proceso Django detectado"
    elif pgrep -f "gunicorn" > /dev/null; then
        log "✓ Proceso Gunicorn detectado"
    else
        warning "No se detectaron procesos de Django/Gunicorn"
    fi
    
    # Verificar conectividad
    local port=$(netstat -tulpn 2>/dev/null | grep ":8030" | head -n1)
    if [ -n "$port" ]; then
        log "✓ Puerto 8030 está en uso"
    else
        warning "Puerto 8030 no está en uso"
    fi
}

# Mostrar logs recientes
show_logs() {
    log "Mostrando logs recientes..."
    
    # Logs del servicio systemd
    if systemctl list-unit-files | grep -q "$SERVICE_NAME"; then
        info "Logs del servicio $SERVICE_NAME:"
        journalctl -u "$SERVICE_NAME" --no-pager -n 10
    fi
    
    # Logs de Django si existen
    if [ -f "$PROJECT_DIR/django.log" ]; then
        info "Logs de Django:"
        tail -n 10 "$PROJECT_DIR/django.log"
    fi
}

# Función principal
main() {
    log "=== INICIANDO ACTUALIZACIÓN DEL VPS ==="
    log "Directorio del proyecto: $PROJECT_DIR"
    log "Hora: $(date)"
    
    # Ejecutar pasos de actualización
    check_prerequisites
    create_backup
    stop_services
    update_code
    update_dependencies
    run_migrations
    collect_static
    start_services
    
    log "=== ACTUALIZACIÓN COMPLETADA ==="
    
    # Verificar estado
    check_status
    
    # Mostrar logs
    show_logs
    
    log "Para verificar que todo funciona:"
    log "curl http://localhost:8030/api/"
    log "o visita: http://tu-ip:8030"
}

# Verificar si se ejecuta como script principal
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
