#!/bin/bash

# Script de Deploy Robusto para Sancho Distribuidora
# Fecha: $(date)

set -e  # Salir si cualquier comando falla

echo "🚀 INICIANDO DEPLOY ROBUSTO"
echo "==========================="

# Función para log con timestamp
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Función para verificar si un puerto está ocupado
check_port() {
    local port=$1
    if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
        return 0  # Puerto ocupado
    else
        return 1  # Puerto libre
    fi
}

# Función para esperar a que un servicio esté listo
wait_for_service() {
    local service=$1
    local timeout=${2:-60}
    local count=0
    
    log "Esperando que $service esté listo..."
    
    while [ $count -lt $timeout ]; do
        if docker compose ps $service | grep -q "healthy\|running"; then
            log "$service está listo ✅"
            return 0
        fi
        sleep 2
        count=$((count + 2))
    done
    
    log "⚠️ Timeout esperando $service"
    return 1
}

# Paso 1: Pre-validaciones
log "📋 Verificando prerequisitos..."

if ! command -v docker &> /dev/null; then
    log "❌ Docker no está instalado"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    log "❌ Docker Compose no está disponible"
    exit 1
fi

# Paso 2: Backup de configuración actual (si existe)
log "💾 Haciendo backup de contenedores existentes..."
if docker ps -a --filter "name=sancho" --format "{{.Names}}" | grep -q sancho; then
    log "Encontrados contenedores sancho existentes, haciendo backup..."
    docker ps -a --filter "name=sancho" --format "{{.Names}}" > sancho_containers_backup.txt
fi

# Paso 3: Detener servicios conflictivos
log "🛑 Deteniendo servicios conflictivos..."

# Verificar puertos y detener servicios que los usen
for port in 80 443 8080; do
    if check_port $port; then
        log "Puerto $port ocupado, identificando servicio..."
        PID=$(netstat -tlnp 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'/' -f1 | head -1)
        if [ ! -z "$PID" ] && [ "$PID" != "-" ]; then
            CONTAINER=$(docker ps --filter "pid=$PID" --format "{{.Names}}" | head -1)
            if [ ! -z "$CONTAINER" ]; then
                log "Deteniendo contenedor $CONTAINER que usa puerto $port"
                docker stop $CONTAINER || true
            fi
        fi
    fi
done

# Detener contenedores sancho antiguos
log "Deteniendo contenedores sancho existentes..."
docker ps -q --filter "name=sancho" | xargs -r docker stop || true

# Paso 4: Limpiar contenedores antiguos
log "🧹 Limpiando contenedores antiguos..."
docker ps -aq --filter "name=sancho_traefik" --filter "name=sancho_backend" --filter "name=sancho_frontend" --filter "name=sancho_db" | xargs -r docker rm || true

# Paso 5: Limpiar imágenes huérfanas
log "🗑️ Limpiando imágenes no utilizadas..."
docker image prune -f

# Paso 6: Verificar/crear recursos necesarios
log "🌐 Preparando recursos..."

# Crear red si no existe
if ! docker network ls | grep -q sancho_network; then
    log "Creando red sancho_network..."
    docker network create sancho_network
else
    log "Red sancho_network ya existe ✅"
fi

# Crear volúmenes si no existen
for volume in sancho_postgres_data sancho_letsencrypt; do
    if ! docker volume ls | grep -q $volume; then
        log "Creando volumen $volume..."
        docker volume create $volume
    else
        log "Volumen $volume ya existe ✅"
    fi
done

# Paso 7: Construir e iniciar servicios
log "🏗️ Construyendo e iniciando servicios..."

# Down con limpieza completa
docker compose down --remove-orphans --volumes 2>/dev/null || true

# Build con cache limpio para asegurar código actualizado
log "Construyendo imágenes frescas..."
docker compose build --no-cache

# Up en orden secuencial
log "Iniciando servicios en orden..."
docker compose up -d db

# Esperar base de datos
wait_for_service db 60

# Iniciar backend
log "Iniciando backend..."
docker compose up -d backend

# Esperar backend
wait_for_service backend 90

# Iniciar frontend
log "Iniciando frontend..."
docker compose up -d frontend

# Iniciar traefik
log "Iniciando traefik..."
docker compose up -d traefik

# Paso 8: Verificaciones post-deploy
log "✅ Verificando deploy..."

sleep 10

# Verificar que todos los servicios estén corriendo
SERVICES="traefik backend frontend db"
for service in $SERVICES; do
    if docker compose ps $service | grep -q "Up\|running"; then
        log "$service: ✅ Corriendo"
    else
        log "$service: ❌ Problema detectado"
        docker compose logs --tail=10 $service
    fi
done

# Verificar conectividad
log "🌍 Verificando conectividad..."
for port in 80 443; do
    if check_port $port; then
        log "Puerto $port: ✅ Activo"
    else
        log "Puerto $port: ⚠️ No activo"
    fi
done

# Paso 9: Información de acceso
log "🎯 DEPLOY COMPLETADO"
log "==================="
log "📱 Frontend: https://www.sanchodistribuidora.com"
log "🔌 API: https://www.sanchodistribuidora.com/api/"
log "📊 Dashboard: https://www.sanchodistribuidora.com/dashboard/"
log "🔍 Debug Auth: https://www.sanchodistribuidora.com/debug-auth"

# Mostrar estado final
echo ""
log "📋 Estado final de servicios:"
docker compose ps

echo ""
log "🔧 Comandos útiles:"
log "Ver logs: docker compose logs [servicio]"
log "Reiniciar: docker compose restart [servicio]"
log "Estado: docker compose ps"
log "Logs en tiempo real: docker compose logs -f"

echo ""
log "📁 Archivos de backup creados:"
ls -la *backup* 2>/dev/null || log "No hay archivos de backup"

log "✨ Deploy completado exitosamente!"
