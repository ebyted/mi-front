#!/bin/bash

# Diagnóstico rápido VPS
echo "🚀 DIAGNÓSTICO RÁPIDO"
echo "===================="

# Estado básico
echo "1. Contenedores:"
docker-compose ps | grep -E "(maestro_|Up|Exited)"

echo ""
echo "2. Puertos críticos:"
netstat -tlnp | grep -E ":80 |:443 " | head -2

echo ""
echo "3. DNS básico:"
nslookup www.sanchodistribuidora.com | grep -A1 "Name:" || echo "❌ DNS falla"

echo ""
echo "4. Test de conectividad:"
curl -I http://localhost:80 -m 3 2>/dev/null | head -1 || echo "❌ Puerto 80 no responde"

echo ""
echo "5. Logs críticos de Traefik:"
docker-compose logs traefik --tail=5 | grep -E "(error|Error|ERROR)" || echo "✅ Sin errores evidentes"

echo ""
echo "6. IP del servidor:"
curl -s ifconfig.me || echo "❌ No se pudo obtener IP"
