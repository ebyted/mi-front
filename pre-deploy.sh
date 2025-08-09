#!/bin/bash

# Script pre-deploy que se ejecuta automáticamente antes de cada deployment
# Este script garantiza que no haya conflictos de nombres de contenedores

echo "🔧 Ejecutando pre-deploy cleanup..."

# Detener y remover cualquier contenedor frontend existente
echo "🧹 Limpiando contenedores frontend existentes..."

# Buscar y detener todos los contenedores que contengan "frontend" en el nombre del proyecto
docker ps -q --filter name=sancho_frontend_v2 | xargs -r docker stop

# Remover todos los contenedores frontend (incluso los detenidos)
docker ps -aq --filter name=sancho_frontend_v2 | xargs -r docker rm -f

# Verificar que la limpieza fue exitosa
if docker ps -aq --filter name=sancho_frontend_v2 | grep -q .; then
    echo "⚠️  Advertencia: Algunos contenedores frontend aún existen"
    docker ps -a --filter name=sancho_frontend_v2
else
    echo "✅ Limpieza de contenedores completada"
fi

# Limpiar imágenes sin usar para liberar espacio
echo "🗑️  Limpiando imágenes sin usar..."
docker image prune -f

echo "✅ Pre-deploy cleanup completado"
