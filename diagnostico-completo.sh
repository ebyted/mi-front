#!/bin/bash

# DIAGNÓSTICO AUTOMÁTICO COMPLETO VPS
# ===================================

set -e

echo "🚀 INICIANDO DIAGNÓSTICO AUTOMÁTICO VPS"
echo "======================================="
date
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar resultados
check_result() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
    fi
}

# 1. INFORMACIÓN BÁSICA DEL SISTEMA
echo -e "${BLUE}📋 1. INFORMACIÓN DEL SISTEMA${NC}"
echo "================================"
echo "Fecha: $(date)"
echo "Usuario: $(whoami)"
echo "Directorio: $(pwd)"
echo "Sistema: $(uname -a)"
echo ""

# 2. DOCKER Y DOCKER COMPOSE
echo -e "${BLUE}🐳 2. VERIFICANDO DOCKER${NC}"
echo "==========================="
docker --version
check_result "Docker instalado"

docker-compose --version
check_result "Docker Compose instalado"

systemctl is-active docker >/dev/null 2>&1
check_result "Docker servicio activo"
echo ""

# 3. ESTADO DE CONTENEDORES
echo -e "${BLUE}📦 3. ESTADO DE CONTENEDORES${NC}"
echo "============================="
if [ -f "docker-compose.yml" ]; then
    echo "Contenedores actuales:"
    docker-compose ps
    echo ""
    
    # Verificar si todos los contenedores están corriendo
    RUNNING=$(docker-compose ps | grep "Up" | wc -l)
    TOTAL=$(docker-compose ps | grep -v "Name\|---" | grep -v "^$" | wc -l)
    echo "Contenedores ejecutándose: $RUNNING/$TOTAL"
    
    if [ "$RUNNING" -eq "$TOTAL" ] && [ "$TOTAL" -gt 0 ]; then
        echo -e "${GREEN}✅ Todos los contenedores están ejecutándose${NC}"
    else
        echo -e "${YELLOW}⚠️ No todos los contenedores están ejecutándose${NC}"
    fi
else
    echo -e "${RED}❌ No se encontró docker-compose.yml${NC}"
fi
echo ""

# 4. PUERTOS Y NETWORKING
echo -e "${BLUE}🌐 4. PUERTOS Y NETWORKING${NC}"
echo "=========================="
echo "Puertos críticos en uso:"
netstat -tlnp | grep -E ":80 |:443 |:8080 " || echo "❌ Ningún puerto crítico en uso"

echo ""
echo "Procesos escuchando en puertos críticos:"
ss -tlnp | grep -E ":80|:443|:8080" || echo "❌ No hay procesos en puertos críticos"
echo ""

# 5. CONECTIVIDAD LOCAL
echo -e "${BLUE}🔗 5. CONECTIVIDAD LOCAL${NC}"
echo "======================="
echo "Probando localhost:80..."
timeout 5 curl -I http://localhost:80 2>/dev/null && echo "✅ Puerto 80 responde" || echo "❌ Puerto 80 no responde"

echo "Probando localhost:8080 (Traefik Dashboard)..."
timeout 5 curl -I http://localhost:8080 2>/dev/null && echo "✅ Dashboard Traefik responde" || echo "❌ Dashboard Traefik no responde"
echo ""

# 6. IP DEL SERVIDOR
echo -e "${BLUE}🌍 6. IP DEL SERVIDOR${NC}"
echo "===================="
echo "IP externa del servidor:"
EXTERNAL_IP=$(timeout 10 curl -s ifconfig.me 2>/dev/null || echo "No disponible")
echo "IP: $EXTERNAL_IP"

echo ""
echo "IPs locales:"
ip addr show | grep "inet " | grep -v "127.0.0.1" | awk '{print $2}' || echo "No disponible"
echo ""

# 7. DNS RESOLUTION
echo -e "${BLUE}🔍 7. RESOLUCIÓN DNS${NC}"
echo "==================="
echo "Verificando www.sanchodistribuidora.com:"
nslookup www.sanchodistribuidora.com | grep -A2 "Name:" || echo "❌ DNS no resuelve"

echo ""
echo "Verificando api.sanchodistribuidora.com:"
nslookup api.sanchodistribuidora.com | grep -A2 "Name:" || echo "❌ DNS no resuelve"
echo ""

# 8. FIREWALL
echo -e "${BLUE}🛡️ 8. FIREWALL${NC}"
echo "=============="
if command -v ufw >/dev/null 2>&1; then
    echo "Estado UFW:"
    ufw status
elif command -v iptables >/dev/null 2>&1; then
    echo "Reglas IPTables (puertos relevantes):"
    iptables -L -n | grep -E "(80|443|8080)" || echo "Sin reglas específicas para puertos 80/443/8080"
else
    echo "❓ No se detectó UFW ni IPTables"
fi
echo ""

# 9. LOGS DE SERVICIOS
echo -e "${BLUE}📝 9. LOGS DE SERVICIOS (últimas líneas)${NC}"
echo "========================================"
if [ -f "docker-compose.yml" ]; then
    echo "--- Logs de Traefik ---"
    docker-compose logs traefik --tail=10 2>/dev/null || echo "❌ No se pudieron obtener logs de Traefik"
    
    echo ""
    echo "--- Logs de Backend ---"
    docker-compose logs backend --tail=5 2>/dev/null || echo "❌ No se pudieron obtener logs de Backend"
    
    echo ""
    echo "--- Logs de Frontend ---"
    docker-compose logs frontend --tail=5 2>/dev/null || echo "❌ No se pudieron obtener logs de Frontend"
fi
echo ""

# 10. CERTIFICADOS SSL
echo -e "${BLUE}🔐 10. CERTIFICADOS SSL${NC}"
echo "======================"
SSL_VOLUME=$(docker volume ls | grep letsencrypt | awk '{print $2}' | head -1)
if [ ! -z "$SSL_VOLUME" ]; then
    echo "✅ Volumen SSL encontrado: $SSL_VOLUME"
    # Intentar ver el contenido (requiere permisos sudo)
    VOLUME_PATH=$(docker volume inspect $SSL_VOLUME --format '{{ .Mountpoint }}' 2>/dev/null)
    if [ ! -z "$VOLUME_PATH" ]; then
        echo "Ruta: $VOLUME_PATH"
        sudo ls -la "$VOLUME_PATH" 2>/dev/null | head -5 || echo "❌ Sin permisos para ver contenido"
    fi
else
    echo "❌ No se encontró volumen de certificados SSL"
fi
echo ""

# 11. TEST DESDE INTERNET
echo -e "${BLUE}🌐 11. TEST DE CONECTIVIDAD EXTERNA${NC}"
echo "=================================="
if [ "$EXTERNAL_IP" != "No disponible" ]; then
    echo "Probando conectividad a www.sanchodistribuidora.com desde el servidor:"
    timeout 10 curl -I https://www.sanchodistribuidora.com 2>/dev/null && echo "✅ HTTPS funciona" || echo "❌ HTTPS no responde"
    timeout 10 curl -I http://www.sanchodistribuidora.com 2>/dev/null && echo "✅ HTTP funciona" || echo "❌ HTTP no responde"
else
    echo "❌ No se pudo obtener IP externa, saltando test"
fi
echo ""

# 12. RESUMEN Y RECOMENDACIONES
echo -e "${BLUE}📊 12. RESUMEN Y DIAGNÓSTICO${NC}"
echo "============================"

# Verificar problemas comunes
PROBLEMS=()
SOLUTIONS=()

# Check 1: Contenedores
if [ "$RUNNING" -ne "$TOTAL" ] || [ "$TOTAL" -eq 0 ]; then
    PROBLEMS+=("Contenedores no están ejecutándose correctamente")
    SOLUTIONS+=("Ejecutar: docker-compose up -d")
fi

# Check 2: Puertos
if ! netstat -tlnp | grep -q ":80 "; then
    PROBLEMS+=("Puerto 80 no está en uso")
    SOLUTIONS+=("Verificar que Traefik esté ejecutándose")
fi

# Check 3: DNS desde servidor
if ! nslookup www.sanchodistribuidora.com | grep -q "Name:"; then
    PROBLEMS+=("DNS no resuelve desde el servidor")
    SOLUTIONS+=("Verificar configuración DNS del proveedor")
fi

# Check 4: IP externa
if [ "$EXTERNAL_IP" = "No disponible" ]; then
    PROBLEMS+=("No se pudo obtener IP externa")
    SOLUTIONS+=("Verificar conectividad a internet del servidor")
fi

# Mostrar problemas encontrados
if [ ${#PROBLEMS[@]} -eq 0 ]; then
    echo -e "${GREEN}🎉 ¡Todo parece estar funcionando correctamente!${NC}"
    echo ""
    echo "URLs que deberían funcionar:"
    echo "- https://www.sanchodistribuidora.com"
    echo "- https://api.sanchodistribuidora.com"
    echo "- http://$EXTERNAL_IP:8080 (Dashboard Traefik)"
else
    echo -e "${YELLOW}⚠️ Se encontraron ${#PROBLEMS[@]} problema(s):${NC}"
    for i in "${!PROBLEMS[@]}"; do
        echo "$((i+1)). ${PROBLEMS[$i]}"
        echo "   Solución: ${SOLUTIONS[$i]}"
    done
fi

echo ""
echo -e "${BLUE}📞 PRÓXIMOS PASOS RECOMENDADOS:${NC}"
echo "1. Si hay problemas con contenedores: docker-compose logs [servicio]"
echo "2. Si hay problemas de DNS: verificar configuración en tu proveedor de dominio"
echo "3. Si hay problemas de firewall: ufw allow 80 && ufw allow 443"
echo "4. Para ver dashboard Traefik: http://$EXTERNAL_IP:8080"
echo ""

echo "🏁 DIAGNÓSTICO COMPLETADO - $(date)"
echo "=================================================="
