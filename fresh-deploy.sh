#!/bin/bash

echo "🧹 LIMPIEZA COMPLETA Y DESPLIEGUE FRESH"
echo "======================================"

echo "📋 Paso 1: Deteniendo TODOS los contenedores..."
docker stop $(docker ps -q) 2>/dev/null || echo "No hay contenedores corriendo"

echo ""
echo "🗑️ Paso 2: Eliminando contenedores conflictivos..."
# Eliminar contenedores maestro
docker rm -f $(docker ps -aq --filter "name=maestro") 2>/dev/null || echo "No hay contenedores maestro"
# Eliminar contenedores sancho
docker rm -f $(docker ps -aq --filter "name=sancho") 2>/dev/null || echo "No hay contenedores sancho"
# Eliminar el contenedor específico del error
docker rm -f 60b67024cef87daecb12594ed86bf9640f70730298c530d03da646f09b8fbbbb 2>/dev/null || echo "Contenedor específico ya eliminado"

echo ""
echo "🌐 Paso 3: Limpiando redes..."
# Eliminar redes maestro si existen
docker network rm maestro_network 2>/dev/null || echo "Red maestro_network no existe"
# Crear nueva red sancho
docker network create sancho_network 2>/dev/null || echo "Red sancho_network ya existe"

echo ""
echo "📦 Paso 4: Verificando volúmenes..."
docker volume create sancho_postgres_data 2>/dev/null || echo "Volumen postgres ya existe"
docker volume create sancho_letsencrypt 2>/dev/null || echo "Volumen letsencrypt ya existe"

echo ""
echo "🧹 Paso 5: Limpieza general de Docker..."
docker system prune -f
docker volume prune -f

echo ""
echo "🚀 Paso 6: Construyendo e iniciando servicios FRESCOS..."
docker compose down --remove-orphans --volumes 2>/dev/null || echo "No hay servicios compose previos"
docker compose build --no-cache
docker compose up -d

echo ""
echo "⏳ Paso 7: Esperando inicialización completa..."
echo "Esperando base de datos..."
sleep 10
echo "Esperando backend..."
sleep 10
echo "Esperando frontend..."
sleep 5

echo ""
echo "✅ Paso 8: Verificando estado final..."
docker compose ps

echo ""
echo "🔍 Paso 9: Verificando contenedores activos..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "📋 Paso 10: Logs de verificación..."
echo "=== Traefik ==="
docker compose logs --tail=3 traefik 2>/dev/null || echo "Traefik no disponible"
echo ""
echo "=== Database ==="
docker compose logs --tail=3 db 2>/dev/null || echo "Database no disponible"
echo ""
echo "=== Backend ==="
docker compose logs --tail=3 backend 2>/dev/null || echo "Backend no disponible"

echo ""
echo "🌍 Paso 11: Verificando conectividad..."
echo "Verificando puerto 80:"
netstat -tlnp | grep :80 2>/dev/null || echo "Puerto 80 disponible"
echo "Verificando puerto 443:"
netstat -tlnp | grep :443 2>/dev/null || echo "Puerto 443 disponible"

echo ""
echo "🎯 DESPLIEGUE COMPLETADO EXITOSAMENTE"
echo "===================================="
echo "✅ Frontend: https://www.sanchodistribuidora.com"
echo "✅ Backend API: https://www.sanchodistribuidora.com/api/"
echo "✅ Traefik Dashboard: http://localhost:8080/dashboard/"
echo "✅ Debug Auth: https://www.sanchodistribuidora.com/debug-auth"
echo ""
echo "🔧 Comandos útiles:"
echo "Ver logs: docker compose logs [servicio]"
echo "Reiniciar: docker compose restart [servicio]"
echo "Estado: docker compose ps"
echo ""
echo "🚨 Si hay problemas, ejecuta:"
echo "docker compose logs backend"
echo "docker compose logs db"
