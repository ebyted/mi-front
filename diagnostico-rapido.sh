#!/bin/bash

# 🚀 DIAGNÓSTICO RÁPIDO - EJECUTAR LÍNEA POR LÍNEA
# ================================================

echo "🔍 DIAGNÓSTICO RÁPIDO DEL SERVIDOR"
echo "=================================="

# Verificar ubicación
echo "📍 Ubicación actual:"
pwd
echo ""

# Verificar archivos del proyecto
echo "📁 Archivos del proyecto:"
ls -la | grep -E "(docker-compose|setup-|\.sh)"
echo ""

# Estado de Docker
echo "🐳 Estado de Docker:"
systemctl is-active docker
docker --version
echo ""

# Estado de contenedores
echo "📦 Contenedores en ejecución:"
docker-compose ps
echo ""

# Puertos abiertos
echo "🌐 Puertos abiertos:"
netstat -tlnp | grep -E ':80|:443|:8080'
echo ""

# IP externa
echo "🌍 IP externa del servidor:"
curl -s ifconfig.me
echo ""
echo ""

# Test de conectividad local
echo "🔗 Test de conectividad local:"
echo "Puerto 80:"
timeout 5 curl -I http://localhost:80 2>/dev/null && echo "✅ OK" || echo "❌ ERROR"

echo "Puerto 8080 (Traefik):"
timeout 5 curl -I http://localhost:8080 2>/dev/null && echo "✅ OK" || echo "❌ ERROR"
echo ""

# Verificar DNS
echo "🌐 Verificación DNS:"
nslookup www.sanchodistribuidora.com
echo ""

# Logs recientes de errores
echo "🚨 Logs recientes de errores:"
echo "--- Traefik ---"
docker-compose logs traefik 2>/dev/null | grep -i error | tail -3
echo "--- Backend ---"
docker-compose logs backend 2>/dev/null | grep -i error | tail -3
echo ""

echo "✅ DIAGNÓSTICO COMPLETADO"
echo ""
echo "💡 Si hay problemas, ejecuta:"
echo "   docker-compose logs [servicio] --tail=50"
echo "   donde [servicio] puede ser: traefik, backend, frontend"
