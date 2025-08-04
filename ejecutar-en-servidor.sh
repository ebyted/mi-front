#!/bin/bash

# 🚀 SCRIPT DE TRANSFERENCIA Y EJECUCIÓN AUTOMÁTICA
# =================================================

echo "🚀 TRANSFIRIENDO ARCHIVOS AL SERVIDOR..."

# Transferir archivos necesarios al servidor
scp setup-completo.sh root@168.231.67.221:/root/
scp docker-compose.yml root@168.231.67.221:/root/
scp -r src/ root@168.231.67.221:/root/ 2>/dev/null || echo "src/ no encontrado localmente"

echo "📡 CONECTANDO Y EJECUTANDO EN EL SERVIDOR..."

# Conectar al servidor y ejecutar comandos
ssh root@168.231.67.221 << 'ENDSSH'

echo "🔍 DIAGNÓSTICO INICIAL EN EL SERVIDOR"
echo "===================================="

# Verificar ubicación
echo "📍 Ubicación actual:"
pwd
ls -la | grep -E "(docker|\.yml|\.sh)"

# Verificar Docker
echo "🐳 Estado de Docker:"
systemctl is-active docker
docker --version

# Estado actual de contenedores
echo "📦 Contenedores actuales:"
docker ps
docker-compose ps 2>/dev/null || echo "No se encontró docker-compose.yml en el directorio actual"

# Cambiar al directorio correcto si existe
if [ -f "/root/docker-compose.yml" ]; then
    cd /root
    echo "📁 Cambiando a /root donde está docker-compose.yml"
elif [ -f "/root/mi-front/docker-compose.yml" ]; then
    cd /root/mi-front
    echo "📁 Cambiando a /root/mi-front donde está docker-compose.yml"
fi

# Verificar puertos
echo "🌐 Puertos abiertos:"
netstat -tlnp | grep -E ':80|:443|:8080'

# IP externa
echo "🌍 IP externa:"
curl -s ifconfig.me

# Test de conectividad
echo "🔗 Test de conectividad:"
timeout 5 curl -I http://localhost:80 2>/dev/null && echo "✅ Puerto 80 OK" || echo "❌ Puerto 80 ERROR"
timeout 5 curl -I http://localhost:8080 2>/dev/null && echo "✅ Puerto 8080 OK" || echo "❌ Puerto 8080 ERROR"

# Logs recientes
echo "📋 Logs recientes de Traefik:"
docker-compose logs traefik --tail=5 2>/dev/null || docker logs $(docker ps | grep traefik | awk '{print $1}') --tail=5

echo "✅ DIAGNÓSTICO INICIAL COMPLETADO"
echo ""
echo "🚀 EJECUTANDO SETUP COMPLETO..."

# Hacer ejecutable y ejecutar el script de setup
chmod +x setup-completo.sh 2>/dev/null || echo "setup-completo.sh no encontrado"
./setup-completo.sh 2>/dev/null || echo "Error ejecutando setup-completo.sh"

ENDSSH

echo "🏁 PROCESO COMPLETADO"
