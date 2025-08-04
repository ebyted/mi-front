#!/bin/bash

# 🚀 SCRIPT TODO-EN-UNO PARA VPS
# ==============================
# Ejecuta diagnóstico y soluciona problemas automáticamente

clear
echo "🚀 SANCHO DISTRIBUIDORA - DIAGNÓSTICO Y SOLUCIÓN AUTOMÁTICA"
echo "==========================================================="
echo "Iniciando en 3 segundos..."
sleep 3

# Función para log con colores
log() {
    echo -e "\033[0;32m[$(date '+%H:%M:%S')] $1\033[0m"
}

error() {
    echo -e "\033[0;31m[ERROR] $1\033[0m"
}

warn() {
    echo -e "\033[1;33m[WARN] $1\033[0m"
}

# 1. VERIFICAR UBICACIÓN
log "1. Verificando ubicación del proyecto..."
if [ ! -f "docker-compose.yml" ]; then
    error "No se encontró docker-compose.yml en $(pwd)"
    echo "Navegue al directorio correcto y ejecute el script nuevamente"
    exit 1
fi
log "✅ docker-compose.yml encontrado"

# 2. VERIFICAR DOCKER
log "2. Verificando Docker..."
if ! command -v docker >/dev/null 2>&1; then
    error "Docker no está instalado"
    exit 1
fi

if ! systemctl is-active --quiet docker; then
    warn "Docker no está activo, iniciando..."
    sudo systemctl start docker
    sudo systemctl enable docker
fi
log "✅ Docker está funcionando"

# 3. DETENER Y LIMPIAR CONTENEDORES EXISTENTES
log "3. Limpiando contenedores existentes..."
docker-compose down >/dev/null 2>&1
docker system prune -f >/dev/null 2>&1
log "✅ Contenedores limpiados"

# 4. CONFIGURAR FIREWALL AUTOMÁTICAMENTE
log "4. Configurando firewall..."
if command -v ufw >/dev/null 2>&1; then
    sudo ufw --force enable >/dev/null 2>&1
    sudo ufw allow ssh >/dev/null 2>&1
    sudo ufw allow 80 >/dev/null 2>&1
    sudo ufw allow 443 >/dev/null 2>&1
    sudo ufw allow 8080 >/dev/null 2>&1
    log "✅ Firewall configurado (80, 443, 8080 abiertos)"
else
    warn "UFW no disponible, verificar firewall manualmente"
fi

# 5. INICIAR SERVICIOS
log "5. Iniciando servicios..."
docker-compose up -d --build

# 6. ESPERAR ESTABILIZACIÓN
log "6. Esperando estabilización de servicios..."
sleep 15

# 7. VERIFICAR ESTADO
log "7. Verificando estado de contenedores..."
RUNNING=$(docker-compose ps | grep "Up" | wc -l)
TOTAL=$(docker-compose ps | grep -v "Name\|---" | grep -v "^$" | wc -l)

if [ "$RUNNING" -eq "$TOTAL" ] && [ "$TOTAL" -gt 0 ]; then
    log "✅ Todos los contenedores ($RUNNING/$TOTAL) están ejecutándose"
else
    error "❌ Solo $RUNNING de $TOTAL contenedores están ejecutándose"
    echo "Estado actual:"
    docker-compose ps
fi

# 8. VERIFICAR PUERTOS
log "8. Verificando puertos..."
if netstat -tlnp | grep -q ":80 "; then
    log "✅ Puerto 80 activo"
else
    error "❌ Puerto 80 no responde"
fi

if netstat -tlnp | grep -q ":443 "; then
    log "✅ Puerto 443 activo"
else
    warn "⚠️ Puerto 443 no responde (normal si SSL aún no está configurado)"
fi

# 9. OBTENER IP
log "9. Obteniendo IP del servidor..."
EXTERNAL_IP=$(timeout 10 curl -s ifconfig.me 2>/dev/null || echo "No disponible")
if [ "$EXTERNAL_IP" != "No disponible" ]; then
    log "✅ IP externa: $EXTERNAL_IP"
else
    warn "⚠️ No se pudo obtener IP externa"
fi

# 10. TEST DE CONECTIVIDAD
log "10. Probando conectividad local..."
if timeout 5 curl -I http://localhost:80 >/dev/null 2>&1; then
    log "✅ Puerto 80 responde localmente"
else
    error "❌ Puerto 80 no responde localmente"
fi

if timeout 5 curl -I http://localhost:8080 >/dev/null 2>&1; then
    log "✅ Dashboard Traefik responde"
else
    error "❌ Dashboard Traefik no responde"
fi

# 11. VERIFICAR DNS
log "11. Verificando DNS..."
if nslookup www.sanchodistribuidora.com >/dev/null 2>&1; then
    DNS_IP=$(nslookup www.sanchodistribuidora.com | grep -A1 "Name:" | tail -1 | awk '{print $2}')
    if [ "$DNS_IP" = "$EXTERNAL_IP" ]; then
        log "✅ DNS apunta correctamente a la IP del servidor"
    else
        warn "⚠️ DNS apunta a $DNS_IP pero servidor es $EXTERNAL_IP"
    fi
else
    error "❌ DNS no resuelve www.sanchodistribuidora.com"
fi

# 12. MOSTRAR LOGS DE ERRORES
log "12. Verificando logs de errores..."
TRAEFIK_ERRORS=$(docker-compose logs traefik 2>/dev/null | grep -i "error" | tail -3)
if [ ! -z "$TRAEFIK_ERRORS" ]; then
    warn "Errores en Traefik encontrados:"
    echo "$TRAEFIK_ERRORS"
fi

BACKEND_ERRORS=$(docker-compose logs backend 2>/dev/null | grep -i "error" | tail -3)
if [ ! -z "$BACKEND_ERRORS" ]; then
    warn "Errores en Backend encontrados:"
    echo "$BACKEND_ERRORS"
fi

# 13. RESUMEN FINAL
echo ""
echo "🎉 DIAGNÓSTICO COMPLETADO"
echo "========================"
echo ""
echo "📊 ESTADO ACTUAL:"
docker-compose ps
echo ""

echo "🌐 URLS PARA PROBAR:"
echo "- Frontend: https://www.sanchodistribuidora.com"
echo "- API: https://api.sanchodistribuidora.com"
if [ "$EXTERNAL_IP" != "No disponible" ]; then
    echo "- Dashboard Traefik: http://$EXTERNAL_IP:8080"
fi
echo ""

echo "📝 COMANDOS ÚTILES:"
echo "- Ver logs en tiempo real: docker-compose logs -f traefik"
echo "- Reiniciar servicios: docker-compose restart"
echo "- Ver estado: docker-compose ps"
echo ""

# 14. TEST OPCIONAL DESDE INTERNET
read -p "¿Quieres probar conectividad desde internet? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    log "Probando desde internet..."
    if timeout 15 curl -I https://www.sanchodistribuidora.com >/dev/null 2>&1; then
        log "✅ https://www.sanchodistribuidora.com funciona desde internet"
    else
        error "❌ https://www.sanchodistribuidora.com no responde desde internet"
    fi
fi

echo ""
log "🏁 SCRIPT COMPLETADO - $(date)"
echo "Si hay problemas, revisar logs con: docker-compose logs [servicio]"
