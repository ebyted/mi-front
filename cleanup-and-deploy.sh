#!/bin/bash

echo "🧹 LIMPIANDO CONTENEDORES CONFLICTIVOS"
echo "====================================="

echo "📋 Paso 1: Listando contenedores maestro existentes..."
docker ps -a --filter "name=maestro" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🛑 Paso 2: Deteniendo contenedores maestro..."
docker stop $(docker ps -q --filter "name=maestro") 2>/dev/null || echo "No hay contenedores maestro corriendo"

echo ""
echo "🗑️ Paso 3: Eliminando contenedores maestro..."
docker rm $(docker ps -aq --filter "name=maestro") 2>/dev/null || echo "No hay contenedores maestro para eliminar"

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
echo "🚀 Paso 6: Desplegando servicios limpios..."
docker compose down --remove-orphans 2>/dev/null || echo "No hay servicios previos"
docker compose up -d --build

echo ""
echo "⏳ Paso 7: Esperando inicialización..."
sleep 20

echo ""
echo "✅ Paso 8: Verificando estado final..."
docker compose ps

echo ""
echo "🌍 Paso 9: Verificando puertos ocupados..."
echo "Puerto 80:"
netstat -tlnp | grep :80 2>/dev/null || echo "Puerto 80 libre"
echo "Puerto 443:"
netstat -tlnp | grep :443 2>/dev/null || echo "Puerto 443 libre"

echo ""
echo "📋 Paso 10: Logs de servicios..."
echo "=== Traefik ==="
docker compose logs --tail=5 traefik
echo ""
echo "=== Backend ==="
docker compose logs --tail=5 backend

echo ""
echo "🎯 DESPLIEGUE COMPLETADO"
echo "========================"
echo "Frontend: https://www.sanchodistribuidora.com"
echo "Backend API: https://www.sanchodistribuidora.com/api/"
echo "Traefik Dashboard: http://localhost:8080/dashboard/"
echo ""
echo "Para debug de autenticación: https://www.sanchodistribuidora.com/debug-auth"
