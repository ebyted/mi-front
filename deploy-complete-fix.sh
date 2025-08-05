#!/bin/bash

echo "🔧 SOLUCION COMPLETA PARA CONFLICTOS DE CONTENEDORES"
echo "======================================================="

# Ir al directorio del proyecto
cd /root/mi-front

echo "🛑 Paso 1: Deteniendo TODOS los contenedores relacionados..."
docker-compose down --remove-orphans
docker-compose -f docker-compose-fixed.yml down --remove-orphans 2>/dev/null || echo "docker-compose-fixed.yml no encontrado o ya detenido"

echo "🗑️ Paso 2: Eliminando contenedores específicos problemáticos..."
# Eliminar por nombres específicos (ignorar errores si no existen)
docker rm -f maestro_traefik 2>/dev/null || echo "maestro_traefik ya eliminado"
docker rm -f maestro_frontend 2>/dev/null || echo "maestro_frontend ya eliminado"
docker rm -f maestro_backend 2>/dev/null || echo "maestro_backend ya eliminado"
docker rm -f maestro_backend_api 2>/dev/null || echo "maestro_backend_api ya eliminado"
docker rm -f maestro_db 2>/dev/null || echo "maestro_db ya eliminado"

# Eliminar cualquier contenedor que contenga "maestro" en el nombre
echo "🗑️ Paso 2b: Eliminando TODOS los contenedores que contengan 'maestro'..."
docker ps -aq --filter "name=maestro" | xargs -r docker rm -f

echo "🗑️ Paso 3: Eliminando contenedores por IDs específicos..."
# Eliminar los IDs específicos que aparecen en los errores
docker rm -f 03462a122d276d7c714bd40c31a3238b2e3306001dfc57bf2ad06b6db64a53bf 2>/dev/null || echo "Contenedor traefik específico ya eliminado"
docker rm -f f6f85e1e8b838d3327e851502b49ab3b0a3c516f0d5392b5cf1f1c112221495e 2>/dev/null || echo "Contenedor frontend específico ya eliminado"

echo "🧹 Paso 4: Limpieza general de contenedores no utilizados..."
docker container prune -f

echo "🧹 Paso 5: Limpieza de redes no utilizadas..."
docker network prune -f

echo "🔍 Paso 6: Verificando que no queden contenedores maestro..."
REMAINING=$(docker ps -a --filter "name=maestro" --format "table {{.Names}}\t{{.Status}}" | grep -v NAMES || echo "Ninguno")
echo "Contenedores maestro restantes: $REMAINING"

echo "🌐 Paso 7: Creando/verificando red externa..."
docker network create maestro_network 2>/dev/null || echo "Red maestro_network ya existe"

echo "🚀 Paso 8: Iniciando servicios con configuración limpia..."
docker-compose up -d --build

echo "⏳ Paso 9: Esperando que los servicios se inicialicen..."
sleep 15

echo "✅ Paso 10: Verificando estado final..."
docker-compose ps

echo ""
echo "🎯 DESPLIEGUE COMPLETADO"
echo "========================"
echo "Frontend: https://www.sanchodistribuidora.com"
echo "Debug Auth: https://www.sanchodistribuidora.com/debug-auth"
echo ""
echo "Si sigues viendo errores 401, ve a /debug-auth y limpia tokens expirados."

# Mostrar logs de los últimos servicios para debug
echo ""
echo "📋 Logs recientes del frontend:"
docker-compose logs --tail=5 frontend
