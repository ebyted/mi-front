#!/bin/bash
# Script de limpieza pre-deploy
# Solo limpia contenedores de aplicación (backend/frontend)
# Preserva BD y Traefik (infraestructura)

echo "🧹 Iniciando limpieza pre-deploy..."

# Detener y eliminar solo contenedores de aplicación
echo "📦 Deteniendo contenedores de aplicación..."
docker stop $(docker ps -q --filter "name=sancho_backend") 2>/dev/null || true
docker stop $(docker ps -q --filter "name=sancho_frontend") 2>/dev/null || true

echo "🗑️ Eliminando contenedores de aplicación..."
docker rm $(docker ps -aq --filter "name=sancho_backend") 2>/dev/null || true
docker rm $(docker ps -aq --filter "name=sancho_frontend") 2>/dev/null || true

# Limpiar imágenes no utilizadas
echo "🧽 Limpiando imágenes no utilizadas..."
docker image prune -f

# Verificar que la infraestructura sigue corriendo
echo "🔍 Verificando estado de la infraestructura..."
DB_STATUS=$(docker ps --filter "name=sancho_db_persistent" --format "{{.Status}}" 2>/dev/null)
TRAEFIK_STATUS=$(docker ps --filter "name=sancho_traefik_persistent" --format "{{.Status}}" 2>/dev/null)

if [[ -n "$DB_STATUS" ]]; then
    echo "✅ Base de datos OK: $DB_STATUS"
else
    echo "⚠️  Base de datos no encontrada, será creada en el deploy"
fi

if [[ -n "$TRAEFIK_STATUS" ]]; then
    echo "✅ Traefik OK: $TRAEFIK_STATUS"
else
    echo "⚠️  Traefik no encontrado, será creado en el deploy"
fi

echo "✅ Limpieza completada. El deploy puede proceder."
