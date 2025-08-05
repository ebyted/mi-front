#!/bin/bash

echo "🔍 SOLUCIONANDO CONFLICTOS DE PUERTOS"
echo "====================================="

echo "📋 Paso 1: Identificando contenedores que usan puerto 80..."
docker ps --filter "publish=80" --format "table {{.ID}}\t{{.Names}}\t{{.Ports}}"

echo ""
echo "🛑 Paso 2: Deteniendo contenedores conflictivos..."
# Detener todos los contenedores Traefik existentes
docker ps -q --filter "ancestor=traefik:v3.0" | xargs -r docker stop
docker ps -q --filter "name=traefik" | xargs -r docker stop

# Detener contenedores del proyecto anterior si existen
docker ps -q --filter "name=maestro" | xargs -r docker stop
docker ps -q --filter "name=sancho-distribuidora" | xargs -r docker stop

echo ""
echo "🗑️ Paso 3: Eliminando contenedores detenidos..."
docker container prune -f

echo ""
echo "🌐 Paso 4: Verificando/creando red externa..."
if ! docker network ls | grep -q maestro_network; then
    echo "Creando red maestro_network..."
    docker network create maestro_network
else
    echo "Red maestro_network ya existe ✅"
fi

echo ""
echo "📦 Paso 5: Verificando volúmenes..."
if ! docker volume ls | grep -q traefik_letsencrypt; then
    echo "Creando volumen traefik_letsencrypt..."
    docker volume create traefik_letsencrypt
else
    echo "Volumen traefik_letsencrypt ya existe ✅"
fi

echo ""
echo "🚀 Paso 6: Desplegando servicios..."
docker compose down --remove-orphans
docker compose up -d --build

echo ""
echo "⏳ Paso 7: Esperando inicialización..."
sleep 15

echo ""
echo "✅ Paso 8: Verificando estado final..."
docker compose ps

echo ""
echo "🌍 Paso 9: Verificando puertos..."
echo "Puerto 80 ocupado por:"
docker ps --filter "publish=80" --format "table {{.Names}}\t{{.Status}}"
echo ""
echo "Puerto 443 ocupado por:"
docker ps --filter "publish=443" --format "table {{.Names}}\t{{.Status}}"

echo ""
echo "🎯 DESPLIEGUE COMPLETADO"
echo "========================"
echo "Frontend: https://www.sanchodistribuidora.com"
echo "Debug Auth: https://www.sanchodistribuidora.com/debug-auth"
echo "Traefik Dashboard: https://www.sanchodistribuidora.com:8080"
echo ""
echo "📋 Logs del Traefik:"
docker compose logs --tail=10 traefik
