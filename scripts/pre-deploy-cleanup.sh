#!/bin/bash
# Script de limpieza pre-deploy
# Limpia todos los contenedores para evitar conflictos de nombres
# Los datos persisten en volúmenes externos

echo "🧹 Iniciando limpieza pre-deploy..."

# Detener todos los contenedores de la aplicación
echo "📦 Deteniendo contenedores..."
docker stop $(docker ps -q --filter "name=sancho_traefik") 2>/dev/null || true
docker stop $(docker ps -q --filter "name=sancho_backend") 2>/dev/null || true
docker stop $(docker ps -q --filter "name=sancho_frontend") 2>/dev/null || true
docker stop $(docker ps -q --filter "name=sancho_db") 2>/dev/null || true

echo "🗑️ Eliminando contenedores..."
docker rm $(docker ps -aq --filter "name=sancho_traefik") 2>/dev/null || true
docker rm $(docker ps -aq --filter "name=sancho_backend") 2>/dev/null || true
docker rm $(docker ps -aq --filter "name=sancho_frontend") 2>/dev/null || true
docker rm $(docker ps -aq --filter "name=sancho_db") 2>/dev/null || true

# Limpiar imágenes no utilizadas
echo "🧽 Limpiando imágenes no utilizadas..."
docker image prune -f

# Verificar que los volúmenes persisten
echo "🔍 Verificando volúmenes persistentes..."
POSTGRES_VOL=$(docker volume ls -q --filter "name=sancho_postgres_data")
SSL_VOL=$(docker volume ls -q --filter "name=traefik_letsencrypt")

if [[ -n "$POSTGRES_VOL" ]]; then
    echo "✅ Volumen de BD encontrado: $POSTGRES_VOL"
else
    echo "⚠️  Volumen de BD no encontrado, será creado en el deploy"
fi

if [[ -n "$SSL_VOL" ]]; then
    echo "✅ Volumen SSL encontrado: $SSL_VOL"
else
    echo "⚠️  Volumen SSL no encontrado, será creado en el deploy"
fi

echo "✅ Limpieza completada. El deploy puede proceder."
