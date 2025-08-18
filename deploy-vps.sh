#!/bin/bash

# Script de deploy para VPS - Evita conflictos de contenedores

set -e

echo "🚀 Deploy en VPS - Maestro Inventario"
echo "======================================"

# Función para log con timestamp
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# 1. Detener todos los contenedores relacionados
log "📦 Deteniendo contenedores existentes..."
docker stop sancho_backend_v2 sancho_frontend_v2 2>/dev/null || true
docker rm sancho_backend_v2 sancho_frontend_v2 2>/dev/null || true

# 2. Limpiar contenedores huérfanos
log "🧹 Limpiando contenedores huérfanos..."
docker container prune -f

# 3. Usar docker-compose para deploy limpio
log "🔨 Ejecutando docker-compose..."
docker-compose down --remove-orphans 2>/dev/null || true
docker-compose up -d --build --force-recreate

# 4. Verificar estado
log "✅ Verificando estado de contenedores..."
docker-compose ps

# 5. Esperar a que los servicios estén listos
log "⏳ Esperando a que los servicios estén listos..."
sleep 15

# 6. Verificar conectividad
log "🌐 Verificando conectividad..."
curl -s https://www.sanchodistribuidora.com/api/ >/dev/null && log "✅ Backend OK" || log "❌ Backend Error"
curl -s https://www.sanchodistribuidora.com/ >/dev/null && log "✅ Frontend OK" || log "❌ Frontend Error"

log "🎉 Deploy completado!"
log "🌐 Aplicación disponible en: https://www.sanchodistribuidora.com"
