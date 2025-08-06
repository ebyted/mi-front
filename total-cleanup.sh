#!/bin/bash

echo "🧹 LIMPIEZA TOTAL DEL SISTEMA"
echo "============================="

# Detener TODOS los contenedores
echo "🛑 Deteniendo todos los contenedores..."
docker stop $(docker ps -q) 2>/dev/null || echo "No hay contenedores corriendo"

# Eliminar TODOS los contenedores maestro y sancho
echo "🗑️ Eliminando todos los contenedores maestro y sancho..."
docker ps -aq --filter "name=maestro" | xargs -r docker rm -f
docker ps -aq --filter "name=sancho" | xargs -r docker rm -f

# Eliminar redes personalizadas
echo "🌐 Limpiando redes..."
docker network rm maestro_network sancho_network 2>/dev/null || echo "Redes ya eliminadas"

# Crear red fresca
echo "🌐 Creando red sancho_network..."
docker network create sancho_network

# Limpiar imágenes no utilizadas
echo "🧹 Limpiando imágenes..."
docker image prune -f

# Limpiar system
echo "🧹 Limpieza general del sistema..."
docker system prune -f

echo "✅ Limpieza completada. Sistema listo para deploy fresco."
echo ""
echo "Ejecuta ahora:"
echo "docker compose up -d --build"
