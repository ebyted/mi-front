#!/bin/bash

# 🚀 COMANDOS DIRECTOS PARA EJECUTAR EN EL SERVIDOR
# =================================================
# Copia y pega estos comandos uno por uno en tu terminal bash conectada al servidor

echo "=== COMANDOS PARA EJECUTAR EN EL SERVIDOR ==="
echo ""

echo "1️⃣ VERIFICAR UBICACIÓN ACTUAL:"
echo "pwd"
echo "ls -la"
echo ""

echo "2️⃣ IR AL DIRECTORIO DEL PROYECTO (si no estás ahí):"
echo "cd /root/mi-front"
echo "ls -la docker-compose.yml"
echo ""

echo "3️⃣ VERIFICAR ESTADO ACTUAL DE CONTENEDORES:"
echo "docker-compose ps"
echo "docker ps"
echo ""

echo "4️⃣ VER LOGS DE TRAEFIK:"
echo "docker-compose logs traefik --tail=20"
echo ""

echo "5️⃣ VER LOGS DEL BACKEND:"
echo "docker-compose logs backend --tail=20"
echo ""

echo "6️⃣ VER LOGS DEL FRONTEND:"
echo "docker-compose logs frontend --tail=20"
echo ""

echo "7️⃣ REINICIAR TODOS LOS SERVICIOS:"
echo "docker-compose down"
echo "docker-compose up -d --build"
echo ""

echo "8️⃣ VERIFICAR PUERTOS ABIERTOS:"
echo "netstat -tlnp | grep -E ':80|:443|:8080'"
echo ""

echo "9️⃣ VERIFICAR IP EXTERNA:"
echo "curl -s ifconfig.me"
echo ""

echo "🔟 PROBAR CONECTIVIDAD LOCAL:"
echo "curl -I http://localhost:80"
echo "curl -I http://localhost:8080"
echo ""

echo "1️⃣1️⃣ VERIFICAR DNS:"
echo "nslookup www.sanchodistribuidora.com"
echo ""

echo "1️⃣2️⃣ EJECUTAR DIAGNÓSTICO COMPLETO:"
echo "chmod +x setup-completo.sh"
echo "./setup-completo.sh"
echo ""

echo "1️⃣3️⃣ COMANDOS DE EMERGENCIA SI HAY PROBLEMAS:"
echo "docker-compose down"
echo "docker system prune -f"
echo "docker-compose up -d --build"
echo ""

echo "1️⃣4️⃣ VER CERTIFICADOS SSL:"
echo "docker-compose exec traefik ls -la /letsencrypt/acme.json"
echo ""

echo "1️⃣5️⃣ PROBAR DESDE INTERNET (ejecutar desde otra máquina):"
echo "curl -I https://www.sanchodistribuidora.com"
echo "curl -I https://api.sanchodistribuidora.com"
