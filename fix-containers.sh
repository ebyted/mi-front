#!/bin/bash

echo "🚨 SOLUCIONANDO CONFLICTO DE CONTENEDORES TRAEFIK"
echo "=================================================="

# Ir al directorio del proyecto
cd /root/mi-front

echo "📋 Listando contenedores actuales..."
docker ps -a | grep maestro

echo ""
echo "🛑 Deteniendo servicios de docker-compose..."
docker-compose -f docker-compose-fixed.yml down

echo ""
echo "🗑️ Eliminando contenedor traefik problemático específico..."
docker rm -f 03462a122d276d7c714bd40c31a3238b2e3306001dfc57bf

echo ""
echo "🧹 Limpiando todos los contenedores no utilizados..."
docker container prune -f

echo ""
echo "🔍 Verificando que no queden contenedores maestro..."
docker ps -a | grep maestro

echo ""
echo "🚀 Iniciando servicios nuevamente..."
docker-compose -f docker-compose-fixed.yml up -d

echo ""
echo "✅ Verificando estado final..."
docker-compose -f docker-compose-fixed.yml ps

echo ""
echo "🎯 Proceso completado. Verifica https://www.sanchodistribuidora.com"
