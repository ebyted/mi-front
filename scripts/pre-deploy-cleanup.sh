#!/bin/bash
# Script de limpieza pre-deploy
# Usa docker-compose down para limpiar todo el proyecto
# Los datos persisten en volúmenes externos

echo "🧹 Iniciando limpieza pre-deploy..."

# Buscar directorio del proyecto Dokploy
PROJECT_DIR="/etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code"

if [[ -d "$PROJECT_DIR" ]]; then
    echo "📦 Deteniendo y eliminando contenedores del proyecto..."
    cd "$PROJECT_DIR"
    docker-compose down --remove-orphans --volumes 2>/dev/null || true
else
    echo "📦 Directorio del proyecto no encontrado, limpiando contenedores individuales..."
    # Fallback: limpiar contenedores que puedan existir
    docker stop $(docker ps -q --filter "name=sancho") 2>/dev/null || true
    docker rm $(docker ps -aq --filter "name=sancho") 2>/dev/null || true
fi

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
