#!/bin/bash

# 🔍 DEPURACIÓN PASO A PASO - SANCHO DISTRIBUIDORA
# ===============================================

echo "🔍 INICIANDO DEPURACIÓN COMPLETA"
echo "================================"

# PASO 1: Estado actual
echo "1️⃣ ESTADO ACTUAL DE CONTENEDORES:"
docker ps | grep maestro

# PASO 2: Parar todo
echo -e "\n2️⃣ PARANDO CONTENEDORES EXISTENTES:"
docker stop $(docker ps | grep maestro | awk '{print $1}') 2>/dev/null || echo "No hay contenedores maestro corriendo"

# PASO 3: Verificar red
echo -e "\n3️⃣ VERIFICANDO RED MAESTRO_NETWORK:"
docker network ls | grep maestro
docker network inspect maestro_network 2>/dev/null || echo "Red maestro_network no existe"

# PASO 4: Crear red si no existe
echo -e "\n4️⃣ ASEGURANDO QUE LA RED EXISTE:"
docker network create maestro_network 2>/dev/null || echo "Red maestro_network ya existe"

# PASO 5: Estado de archivos
echo -e "\n5️⃣ VERIFICANDO ARCHIVOS:"
ls -la /root/ | grep -E "(docker-compose|\.yml|\.env)"
pwd

# PASO 6: Si hay docker-compose.yml, ejecutar
echo -e "\n6️⃣ EJECUTANDO DOCKER-COMPOSE:"
if [ -f "docker-compose.yml" ]; then
    echo "Archivo docker-compose.yml encontrado"
    cat docker-compose.yml | head -10
    echo "..."
    echo "Ejecutando docker-compose up -d..."
    docker-compose up -d
else
    echo "❌ No se encontró docker-compose.yml en $(pwd)"
    echo "Listando archivos:"
    ls -la
fi

# PASO 7: Verificar resultado
echo -e "\n7️⃣ VERIFICANDO RESULTADO:"
sleep 10
docker ps | grep maestro

# PASO 8: Test de conectividad
echo -e "\n8️⃣ TEST DE CONECTIVIDAD:"
if docker ps | grep -q maestro_traefik; then
    if docker ps | grep -q maestro_frontend; then
        echo "Probando conectividad interna..."
        docker exec $(docker ps | grep maestro_traefik | awk '{print $1}') nslookup maestro_frontend 2>/dev/null || echo "DNS falló"
        docker exec $(docker ps | grep maestro_traefik | awk '{print $1}') wget -qO- --timeout=5 http://maestro_frontend:80 2>/dev/null | head -2 || echo "HTTP falló"
    else
        echo "❌ maestro_frontend no está corriendo"
    fi
else
    echo "❌ maestro_traefik no está corriendo"
fi

# PASO 9: Test externo
echo -e "\n9️⃣ TEST EXTERNO:"
curl -I https://www.sanchodistribuidora.com 2>/dev/null || echo "HTTPS falló"
curl -I http://www.sanchodistribuidora.com 2>/dev/null || echo "HTTP falló"

echo -e "\n✅ DEPURACIÓN COMPLETADA"
echo "Si hay errores, revisa los logs:"
echo "docker-compose logs traefik"
echo "docker-compose logs frontend"
