#!/bin/bash

# Script para recrear el frontend sin conflictos
# Este script asegura que el contenedor se recree completamente en cada deploy

echo "🚀 Iniciando deployment del frontend..."

# Navegar al directorio del proyecto
cd /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code/

# Paso 1: Detener y remover el contenedor frontend existente (si existe)
echo "📦 Deteniendo y removiendo contenedor frontend existente..."
docker stop sancho_frontend_v2 2>/dev/null || echo "⚠️  Contenedor no estaba corriendo"
docker rm sancho_frontend_v2 2>/dev/null || echo "⚠️  Contenedor no existía"

# Paso 2: Construir la nueva imagen (forzando rebuild)
echo "🔨 Construyendo nueva imagen del frontend..."
docker-compose -f docker-compose.dokploy.yml build --no-cache frontend

# Paso 3: Crear y arrancar el nuevo contenedor
echo "🆕 Creando nuevo contenedor frontend..."
docker-compose -f docker-compose.dokploy.yml up -d frontend

# Paso 4: Verificar que el contenedor está corriendo
echo "✅ Verificando estado del frontend..."
docker ps --filter name=sancho_frontend_v2 --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Paso 5: Limpiar imágenes sin usar para liberar espacio
echo "🧹 Limpiando imágenes obsoletas..."
docker image prune -f

echo "🎉 Deployment del frontend completado!"
echo "🌐 Frontend disponible en: https://www.sanchodistribuidora.com"
