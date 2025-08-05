#!/bin/bash

echo "🧹 LIMPIANDO CONTENEDORES MAESTRO EN VPS"
echo "========================================"

echo "📋 Paso 1: Identificando contenedores maestro existentes..."
docker ps -a --filter "name=maestro" --format "table {{.ID}}\t{{.Names}}\t{{.Status}}"

echo ""
echo "🛑 Paso 2: Deteniendo TODOS los contenedores maestro..."
MAESTRO_CONTAINERS=$(docker ps -q --filter "name=maestro")
if [ ! -z "$MAESTRO_CONTAINERS" ]; then
    echo "Deteniendo contenedores: $MAESTRO_CONTAINERS"
    docker stop $MAESTRO_CONTAINERS
else
    echo "No hay contenedores maestro corriendo"
fi

echo ""
echo "🗑️ Paso 3: Eliminando TODOS los contenedores maestro..."
MAESTRO_ALL=$(docker ps -aq --filter "name=maestro")
if [ ! -z "$MAESTRO_ALL" ]; then
    echo "Eliminando contenedores: $MAESTRO_ALL"
    docker rm $MAESTRO_ALL
else
    echo "No hay contenedores maestro para eliminar"
fi

echo ""
echo "🧹 Paso 4: Forzando eliminación de contenedores por ID específico..."
# Eliminar el contenedor específico mencionado en el error
docker rm -f 60b67024cef87daecb12594ed86bf9640f70730298c530d03da646f09b8fbbbb 2>/dev/null || echo "Contenedor específico ya eliminado"

echo ""
echo "🔍 Paso 5: Verificando que no queden contenedores maestro..."
REMAINING=$(docker ps -aq --filter "name=maestro")
if [ -z "$REMAINING" ]; then
    echo "✅ Todos los contenedores maestro han sido eliminados"
else
    echo "⚠️ Aún quedan contenedores: $REMAINING"
    echo "Forzando eliminación..."
    docker rm -f $REMAINING
fi

echo ""
echo "🌐 Paso 6: Verificando/creando red externa..."
if ! docker network ls | grep -q maestro_network; then
    echo "Creando red maestro_network..."
    docker network create maestro_network
else
    echo "Red maestro_network ya existe ✅"
fi

echo ""
echo "📦 Paso 7: Verificando volúmenes..."
if ! docker volume ls | grep -q postgres_data; then
    echo "Creando volumen postgres_data..."
    docker volume create postgres_data
else
    echo "Volumen postgres_data ya existe ✅"
fi

if ! docker volume ls | grep -q traefik_letsencrypt; then
    echo "Creando volumen traefik_letsencrypt..."
    docker volume create traefik_letsencrypt
else
    echo "Volumen traefik_letsencrypt ya existe ✅"
fi

echo ""
echo "🚀 Paso 8: Iniciando despliegue limpio..."
docker compose down --remove-orphans 2>/dev/null || echo "No hay servicios compose previos"

echo ""
echo "🏗️ Paso 9: Construyendo e iniciando servicios..."
docker compose up -d --build

echo ""
echo "⏳ Paso 10: Esperando inicialización de servicios..."
sleep 25

echo ""
echo "✅ Paso 11: Verificando estado de servicios..."
docker compose ps

echo ""
echo "🔍 Paso 12: Verificando contenedores maestro activos..."
docker ps --filter "name=maestro" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "📋 Paso 13: Logs de verificación..."
echo "=== Traefik ==="
docker compose logs --tail=5 traefik 2>/dev/null || echo "Traefik no disponible"
echo ""
echo "=== Backend ==="
docker compose logs --tail=5 backend 2>/dev/null || echo "Backend no disponible"
echo ""
echo "=== Database ==="
docker compose logs --tail=5 db 2>/dev/null || echo "Database no disponible"

echo ""
echo "🎯 DESPLIEGUE COMPLETADO"
echo "========================"
echo "Frontend: https://www.sanchodistribuidora.com"
echo "Backend API: https://www.sanchodistribuidora.com/api/"
echo "Traefik Dashboard: http://localhost:8080/dashboard/"
echo ""
echo "🔗 Enlaces de debug:"
echo "Auth Debug: https://www.sanchodistribuidora.com/debug-auth"
echo ""
echo "Para verificar logs individuales:"
echo "docker compose logs traefik"
echo "docker compose logs backend"
echo "docker compose logs frontend"
echo "docker compose logs db"
