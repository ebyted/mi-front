#!/bin/bash

# =============================================================================
# CONFIGURADOR DE CRON PARA RESPALDOS AUTOMÁTICOS
# Sistema: Maestro Inventario - Cron Setup Script
# Versión: 1.0
# Autor: Sistema Automatizado
# =============================================================================

# Configuración
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup_database.sh"
LOG_FILE="/var/log/maestro_inventario_backup.log"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR $(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING $(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

show_help() {
    echo "USO: $0 [OPCIONES]"
    echo ""
    echo "OPCIONES:"
    echo "  -h, --help          Mostrar esta ayuda"
    echo "  -i, --install       Instalar tarea cron para respaldos automáticos"
    echo "  -r, --remove        Remover tarea cron de respaldos"
    echo "  -s, --status        Mostrar estado actual del cron"
    echo "  -l, --list          Listar respaldos existentes"
    echo "  -f, --frequency F   Frecuencia del respaldo (daily|weekly|hourly)"
    echo ""
    echo "EJEMPLOS:"
    echo "  $0 --install --frequency daily"
    echo "  $0 --status"
    echo "  $0 --remove"
}

install_cron() {
    local frequency="$1"
    local cron_schedule=""
    
    case "$frequency" in
        hourly)
            cron_schedule="0 * * * *"
            ;;
        daily)
            cron_schedule="0 2 * * *"  # 2:00 AM diario
            ;;
        weekly)
            cron_schedule="0 2 * * 0"  # 2:00 AM domingos
            ;;
        *)
            error "Frecuencia no válida: $frequency"
            error "Opciones válidas: hourly, daily, weekly"
            return 1
            ;;
    esac
    
    log "Instalando tarea cron para respaldos $frequency"
    log "Horario: $cron_schedule"
    
    # Verificar que el script de respaldo existe
    if [ ! -f "$BACKUP_SCRIPT" ]; then
        error "Script de respaldo no encontrado: $BACKUP_SCRIPT"
        return 1
    fi
    
    # Hacer el script ejecutable
    chmod +x "$BACKUP_SCRIPT"
    
    # Crear entrada cron
    local cron_entry="$cron_schedule $BACKUP_SCRIPT >> $LOG_FILE 2>&1"
    
    # Verificar si ya existe la entrada
    if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
        warning "Ya existe una tarea cron para este script"
        read -p "¿Quieres reemplazarla? (s/n): " -r
        if [[ ! $REPLY =~ ^[Ss]$ ]]; then
            log "Operación cancelada"
            return 0
        fi
        remove_cron
    fi
    
    # Agregar nueva entrada cron
    (crontab -l 2>/dev/null; echo "$cron_entry") | crontab -
    
    if [ $? -eq 0 ]; then
        log "Tarea cron instalada exitosamente"
        log "Los respaldos se ejecutarán $frequency a las $(echo $cron_schedule | cut -d' ' -f2):00"
        log "Logs en: $LOG_FILE"
        
        # Crear directorio de logs si no existe
        mkdir -p "$(dirname "$LOG_FILE")"
        touch "$LOG_FILE"
        
        return 0
    else
        error "Error al instalar tarea cron"
        return 1
    fi
}

remove_cron() {
    log "Removiendo tarea cron de respaldos"
    
    # Remover entrada que contenga el script de respaldo
    crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT" | crontab -
    
    if [ $? -eq 0 ]; then
        log "Tarea cron removida exitosamente"
        return 0
    else
        error "Error al remover tarea cron"
        return 1
    fi
}

show_status() {
    log "Estado actual del cron para respaldos:"
    echo ""
    
    # Verificar si cron está ejecutándose
    if systemctl is-active --quiet cron || systemctl is-active --quiet crond; then
        log "✓ Servicio cron está ejecutándose"
    else
        error "✗ Servicio cron NO está ejecutándose"
    fi
    
    # Mostrar entradas cron relacionadas
    local cron_entries=$(crontab -l 2>/dev/null | grep "$BACKUP_SCRIPT")
    
    if [ -n "$cron_entries" ]; then
        log "✓ Tarea cron configurada:"
        echo "$cron_entries"
    else
        warning "✗ No hay tareas cron configuradas para respaldos"
    fi
    
    echo ""
    
    # Mostrar estado del log
    if [ -f "$LOG_FILE" ]; then
        log "Archivo de log: $LOG_FILE"
        log "Tamaño: $(du -h "$LOG_FILE" | cut -f1)"
        log "Últimas 5 líneas del log:"
        tail -5 "$LOG_FILE" 2>/dev/null || echo "Log vacío"
    else
        warning "Archivo de log no existe: $LOG_FILE"
    fi
}

list_backups() {
    local backup_dir="/opt/backups/maestro_inventario"
    
    log "Listando respaldos existentes:"
    echo ""
    
    if [ -d "$backup_dir" ]; then
        local backups=$(find "$backup_dir" -name "*.gz" -type f | sort -r)
        
        if [ -n "$backups" ]; then
            echo "ARCHIVO                           TAMAÑO    FECHA"
            echo "=================================================="
            
            for backup in $backups; do
                local filename=$(basename "$backup")
                local size=$(du -h "$backup" | cut -f1)
                local date=$(stat -c %y "$backup" | cut -d' ' -f1,2 | cut -d':' -f1,2)
                printf "%-35s %-8s %s\n" "$filename" "$size" "$date"
            done
        else
            warning "No se encontraron respaldos en $backup_dir"
        fi
    else
        error "Directorio de respaldos no existe: $backup_dir"
    fi
}

test_backup() {
    log "Ejecutando respaldo de prueba..."
    
    if [ -x "$BACKUP_SCRIPT" ]; then
        "$BACKUP_SCRIPT"
        
        if [ $? -eq 0 ]; then
            log "✓ Respaldo de prueba ejecutado exitosamente"
        else
            error "✗ Error en respaldo de prueba"
        fi
    else
        error "Script de respaldo no ejecutable: $BACKUP_SCRIPT"
    fi
}

# Función principal
main() {
    case "$ACTION" in
        install)
            install_cron "$FREQUENCY"
            ;;
        remove)
            remove_cron
            ;;
        status)
            show_status
            ;;
        list)
            list_backups
            ;;
        test)
            test_backup
            ;;
        *)
            error "Acción no válida: $ACTION"
            show_help
            exit 1
            ;;
    esac
}

# Parsear argumentos
ACTION=""
FREQUENCY="daily"

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -i|--install)
            ACTION="install"
            shift
            ;;
        -r|--remove)
            ACTION="remove"
            shift
            ;;
        -s|--status)
            ACTION="status"
            shift
            ;;
        -l|--list)
            ACTION="list"
            shift
            ;;
        -t|--test)
            ACTION="test"
            shift
            ;;
        -f|--frequency)
            FREQUENCY="$2"
            shift 2
            ;;
        *)
            error "Opción desconocida: $1"
            show_help
            exit 1
            ;;
    esac
done

# Verificar que se especificó una acción
if [ -z "$ACTION" ]; then
    error "Debe especificar una acción"
    show_help
    exit 1
fi

# Ejecutar función principal
main
