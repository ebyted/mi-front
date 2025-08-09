#!/bin/bash
# Script de limpieza pre-deploy
# Solo limpia contenedores recreables, preserva la BD

echo "🧹 Iniciando limpieza pre-deploy..."

# Detener y eliminar contenedores recreables (NO la BD)
echo "📦 Deteniendo contenedores recreables..."
docker stop $(docker ps -q --filter "name=sancho_traefik") 2>/dev/null || true
docker stop $(docker ps -q --filter "name=sancho_backend") 2>/dev/null || true  
docker stop $(docker ps -q --filter "name=sancho_frontend") 2>/dev/null || true

echo "🗑️ Eliminando contenedores recreables..."
docker rm $(docker ps -aq --filter "name=sancho_traefik") 2>/dev/null || true
docker rm $(docker ps -aq --filter "name=sancho_backend") 2>/dev/null || true
docker rm $(docker ps -aq --filter "name=sancho_frontend") 2>/dev/null || true

# Limpiar imágenes no utilizadas
echo "🧽 Limpiando imágenes no utilizadas..."
docker image prune -f

# Verificar que la BD sigue corriendo
echo "🔍 Verificando estado de la base de datos..."
DB_STATUS=$(docker ps --filter "name=sancho_db_persistent" --format "{{.Status}}" 2>/dev/null)
if [[ -n "$DB_STATUS" ]]; then
    echo "✅ Base de datos OK: $DB_STATUS"
else
    echo "⚠️  Base de datos no encontrada, será creada en el deploy"
fi

echo "✅ Limpieza completada. El deploy puede proceder."
