#!/bin/bash

# Script para recrear el frontend sin conflictos
# Este script asegura que el contenedor se recree completamente en cada deploy

echo "🚀 Iniciando deployment del frontend..."

# Navegar al directorio del proyecto
cd /etc/dokploy/compose/sancho-distribuidora-mi-front-npxvvf/code/

# Verificar que el archivo docker-compose existe
if [ ! -f "docker-compose.dokploy.yml" ]; then
    echo "❌ Error: docker-compose.dokploy.yml no encontrado"
    exit 1
fi

# Paso 1: Forzar limpieza completa del contenedor frontend
echo "📦 Limpieza completa del contenedor frontend..."

# Detener todos los contenedores con el nombre sancho_frontend_v2 (incluso si hay duplicados)
echo "⏹️  Deteniendo contenedores frontend..."
docker ps -q --filter name=sancho_frontend_v2 | xargs -r docker stop

# Remover todos los contenedores con el nombre sancho_frontend_v2 (incluso si hay duplicados)
echo "🗑️  Removiendo contenedores frontend..."
docker ps -aq --filter name=sancho_frontend_v2 | xargs -r docker rm -f

# Verificar que no quede ningún contenedor con ese nombre
if docker ps -aq --filter name=sancho_frontend_v2 | grep -q .; then
    echo "❌ Error: Aún existen contenedores con el nombre sancho_frontend_v2"
    docker ps -a --filter name=sancho_frontend_v2
    exit 1
else
    echo "✅ Limpieza de contenedores completada"
fi

# Remover imágenes huérfanas del frontend para forzar rebuild
echo "🧹 Removiendo imágenes antiguas del frontend..."
docker images --filter "reference=*sancho-distribuidora-mi-front-npxvvf*" -q | xargs -r docker rmi -f

# Paso 2: Construir la nueva imagen (forzando rebuild completo)
echo "🔨 Construyendo nueva imagen del frontend desde cero..."
if ! docker-compose -f docker-compose.dokploy.yml build --no-cache --pull frontend; then
    echo "❌ Error construyendo imagen"
    exit 1
fi

# Paso 3: Crear y arrancar el nuevo contenedor
echo "🆕 Creando nuevo contenedor frontend..."
if ! docker-compose -f docker-compose.dokploy.yml up -d --force-recreate frontend; then
    echo "❌ Error creando contenedor"
    
    # Si falla, mostrar logs para debugging
    echo "📋 Logs de debugging:"
    docker-compose -f docker-compose.dokploy.yml logs frontend || true
    
    # Intentar limpieza y retry una vez más
    echo "🔄 Intentando limpieza y retry..."
    docker ps -aq --filter name=sancho_frontend_v2 | xargs -r docker rm -f
    docker-compose -f docker-compose.dokploy.yml up -d --force-recreate frontend || exit 1
fi

# Paso 4: Verificar que el contenedor está corriendo
echo "✅ Verificando estado del frontend..."
sleep 3
docker ps --filter name=sancho_frontend_v2 --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Verificar que el contenedor esté realmente corriendo
if docker ps --filter name=sancho_frontend_v2 --filter status=running | grep -q sancho_frontend_v2; then
    echo "✅ Frontend corriendo correctamente"
else
    echo "❌ Error: Frontend no está corriendo"
    docker logs sancho_frontend_v2 --tail 10
    exit 1
fi

# Paso 5: Limpiar imágenes sin usar para liberar espacio
echo "🧹 Limpiando imágenes obsoletas..."
docker image prune -f

# Paso 6: Verificar conectividad
echo "🌐 Verificando conectividad..."
sleep 5
if curl -s -f -I https://www.sanchodistribuidora.com >/dev/null; then
    echo "✅ Sitio web respondiendo correctamente"
else
    echo "⚠️  Sitio web puede tardar unos momentos en responder"
fi

echo "🎉 Deployment del frontend completado!"
echo "🌐 Frontend disponible en: https://www.sanchodistribuidora.com"
echo "📊 Para verificar logs: docker logs sancho_frontend_v2"
