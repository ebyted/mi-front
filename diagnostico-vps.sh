#!/bin/bash

# Script de diagnóstico para VPS - Sancho Distribuidora
# Ejecutar en el servidor VPS para verificar el estado del deployment

echo "🔍 DIAGNÓSTICO VPS - SANCHO DISTRIBUIDORA"
echo "========================================"
echo ""

# 1. Verificar Docker y Docker Compose
echo "📋 1. VERIFICANDO DOCKER"
echo "------------------------"
docker --version
docker-compose --version
echo ""

# 2. Estado de contenedores
echo "🐳 2. ESTADO DE CONTENEDORES"
echo "-----------------------------"
docker-compose ps
echo ""

# 3. Verificar puertos abiertos
echo "🌐 3. PUERTOS ABIERTOS"
echo "----------------------"
echo "Puerto 80:"
netstat -tlnp | grep :80 || echo "❌ Puerto 80 no está en uso"
echo "Puerto 443:"
netstat -tlnp | grep :443 || echo "❌ Puerto 443 no está en uso"
echo "Puerto 8080:"
netstat -tlnp | grep :8080 || echo "❌ Puerto 8080 no está en uso"
echo ""

# 4. DNS Resolution
echo "🌍 4. RESOLUCIÓN DNS"
echo "--------------------"
echo "Verificando www.sanchodistribuidora.com:"
nslookup www.sanchodistribuidora.com || echo "❌ DNS no resuelve"
echo ""
echo "Verificando api.sanchodistribuidora.com:"
nslookup api.sanchodistribuidora.com || echo "❌ DNS no resuelve"
echo ""

# 5. Conectividad local
echo "🔗 5. CONECTIVIDAD LOCAL"
echo "------------------------"
echo "Probando localhost:80:"
curl -I http://localhost:80 -m 5 2>/dev/null || echo "❌ No responde en puerto 80"
echo ""
echo "Probando localhost:8080 (Dashboard Traefik):"
curl -I http://localhost:8080 -m 5 2>/dev/null || echo "❌ Dashboard no responde"
echo ""

# 6. Logs de Traefik (últimas 20 líneas)
echo "📝 6. LOGS DE TRAEFIK (últimas 20 líneas)"
echo "-----------------------------------------"
docker-compose logs traefik --tail=20
echo ""

# 7. Logs del Backend (últimas 10 líneas)
echo "🔧 7. LOGS DEL BACKEND (últimas 10 líneas)"
echo "------------------------------------------"
docker-compose logs backend --tail=10
echo ""

# 8. Verificar archivos SSL
echo "🔐 8. CERTIFICADOS SSL"
echo "----------------------"
if [ -d "$(docker volume inspect mi-front_traefik_letsencrypt --format '{{ .Mountpoint }}' 2>/dev/null)" ]; then
    echo "✅ Volumen de certificados existe"
    sudo ls -la "$(docker volume inspect mi-front_traefik_letsencrypt --format '{{ .Mountpoint }}' 2>/dev/null)" 2>/dev/null || echo "❌ No se puede acceder al contenido del volumen"
else
    echo "❌ Volumen de certificados no encontrado"
fi
echo ""

# 9. Configuración del firewall
echo "🛡️ 9. FIREWALL"
echo "--------------"
if command -v ufw &> /dev/null; then
    echo "UFW Status:"
    ufw status
elif command -v iptables &> /dev/null; then
    echo "IPTables rules (puertos 80, 443, 8080):"
    iptables -L -n | grep -E "(80|443|8080)"
else
    echo "❓ No se detectó firewall UFW o IPTables"
fi
echo ""

# 10. IP del servidor
echo "🌐 10. IP DEL SERVIDOR"
echo "---------------------"
echo "IP externa:"
curl -s ifconfig.me || echo "❌ No se pudo obtener IP externa"
echo ""
echo "IPs locales:"
ip addr show | grep "inet " | grep -v 127.0.0.1
echo ""

# 11. Test específico de dominios
echo "🎯 11. TEST DE DOMINIOS"
echo "-----------------------"
echo "Probando www.sanchodistribuidora.com desde el servidor:"
curl -I https://www.sanchodistribuidora.com -m 10 2>/dev/null || echo "❌ No responde HTTPS"
curl -I http://www.sanchodistribuidora.com -m 10 2>/dev/null || echo "❌ No responde HTTP"
echo ""

echo "✅ DIAGNÓSTICO COMPLETADO"
echo "========================="
echo ""
echo "💡 PRÓXIMOS PASOS:"
echo "1. Verificar que los dominios apunten a la IP del servidor"
echo "2. Asegurar que los puertos 80 y 443 estén abiertos en el firewall"
echo "3. Revisar los logs de Traefik para errores específicos"
echo "4. Verificar que Docker Compose esté ejecutándose correctamente"
