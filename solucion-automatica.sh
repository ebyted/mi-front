#!/bin/bash

# SCRIPT DE SOLUCIÓN AUTOMÁTICA
# =============================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛠️ SCRIPT DE SOLUCIÓN AUTOMÁTICA${NC}"
echo "================================="
echo ""

# Función para confirmar acciones
confirm() {
    read -p "$1 (s/N): " response
    case "$response" in
        [sS][iI]|[sS]) 
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# 1. VERIFICAR Y REPARAR CONTENEDORES
echo -e "${YELLOW}🔧 1. VERIFICANDO CONTENEDORES${NC}"
if [ -f "docker-compose.yml" ]; then
    RUNNING=$(docker-compose ps | grep "Up" | wc -l)
    TOTAL=$(docker-compose ps | grep -v "Name\|---" | grep -v "^$" | wc -l)
    
    if [ "$RUNNING" -ne "$TOTAL" ] || [ "$TOTAL" -eq 0 ]; then
        echo "⚠️ Contenedores no están ejecutándose correctamente"
        if confirm "¿Quieres reiniciar los contenedores?"; then
            echo "Deteniendo contenedores..."
            docker-compose down
            echo "Iniciando contenedores..."
            docker-compose up -d
            echo -e "${GREEN}✅ Contenedores reiniciados${NC}"
        fi
    else
        echo -e "${GREEN}✅ Todos los contenedores están ejecutándose${NC}"
    fi
else
    echo -e "${RED}❌ No se encontró docker-compose.yml${NC}"
    exit 1
fi
echo ""

# 2. VERIFICAR Y CONFIGURAR FIREWALL
echo -e "${YELLOW}🛡️ 2. VERIFICANDO FIREWALL${NC}"
if command -v ufw >/dev/null 2>&1; then
    UFW_STATUS=$(ufw status | grep "Status:" | awk '{print $2}')
    if [ "$UFW_STATUS" = "active" ]; then
        echo "UFW está activo, verificando reglas..."
        
        # Verificar puertos necesarios
        if ! ufw status | grep -q "80.*ALLOW"; then
            if confirm "¿Permitir puerto 80 (HTTP)?"; then
                sudo ufw allow 80
                echo -e "${GREEN}✅ Puerto 80 permitido${NC}"
            fi
        fi
        
        if ! ufw status | grep -q "443.*ALLOW"; then
            if confirm "¿Permitir puerto 443 (HTTPS)?"; then
                sudo ufw allow 443
                echo -e "${GREEN}✅ Puerto 443 permitido${NC}"
            fi
        fi
        
        if ! ufw status | grep -q "8080.*ALLOW"; then
            if confirm "¿Permitir puerto 8080 (Dashboard Traefik)?"; then
                sudo ufw allow 8080
                echo -e "${GREEN}✅ Puerto 8080 permitido${NC}"
            fi
        fi
    else
        echo "UFW no está activo"
        if confirm "¿Activar UFW con reglas básicas?"; then
            sudo ufw --force enable
            sudo ufw allow ssh
            sudo ufw allow 80
            sudo ufw allow 443
            sudo ufw allow 8080
            echo -e "${GREEN}✅ Firewall configurado${NC}"
        fi
    fi
else
    echo "UFW no está instalado"
    if confirm "¿Instalar y configurar UFW?"; then
        sudo apt update
        sudo apt install -y ufw
        sudo ufw --force enable
        sudo ufw allow ssh
        sudo ufw allow 80
        sudo ufw allow 443
        sudo ufw allow 8080
        echo -e "${GREEN}✅ UFW instalado y configurado${NC}"
    fi
fi
echo ""

# 3. VERIFICAR DOCKER DAEMON
echo -e "${YELLOW}🐳 3. VERIFICANDO DOCKER DAEMON${NC}"
if ! systemctl is-active --quiet docker; then
    echo "Docker no está activo"
    if confirm "¿Iniciar Docker?"; then
        sudo systemctl start docker
        sudo systemctl enable docker
        echo -e "${GREEN}✅ Docker iniciado${NC}"
    fi
else
    echo -e "${GREEN}✅ Docker está activo${NC}"
fi
echo ""

# 4. LIMPIAR Y OPTIMIZAR DOCKER
echo -e "${YELLOW}🧹 4. LIMPIEZA DE DOCKER${NC}"
if confirm "¿Limpiar imágenes y contenedores no utilizados?"; then
    docker system prune -f
    echo -e "${GREEN}✅ Sistema Docker limpiado${NC}"
fi
echo ""

# 5. VERIFICAR LOGS PARA ERRORES CRÍTICOS
echo -e "${YELLOW}📝 5. VERIFICANDO LOGS${NC}"
echo "Buscando errores críticos en logs..."

# Buscar errores en Traefik
TRAEFIK_ERRORS=$(docker-compose logs traefik 2>/dev/null | grep -i "error\|failed\|cannot" | tail -3)
if [ ! -z "$TRAEFIK_ERRORS" ]; then
    echo -e "${RED}❌ Errores encontrados en Traefik:${NC}"
    echo "$TRAEFIK_ERRORS"
    echo ""
fi

# Buscar errores en Backend
BACKEND_ERRORS=$(docker-compose logs backend 2>/dev/null | grep -i "error\|failed\|cannot" | tail -3)
if [ ! -z "$BACKEND_ERRORS" ]; then
    echo -e "${RED}❌ Errores encontrados en Backend:${NC}"
    echo "$BACKEND_ERRORS"
    echo ""
fi

if [ -z "$TRAEFIK_ERRORS" ] && [ -z "$BACKEND_ERRORS" ]; then
    echo -e "${GREEN}✅ No se encontraron errores críticos${NC}"
fi
echo ""

# 6. TEST FINAL
echo -e "${YELLOW}🧪 6. TEST FINAL${NC}"
echo "Esperando 10 segundos para que los servicios se estabilicen..."
sleep 10

echo "Probando conectividad local..."
if timeout 5 curl -I http://localhost:80 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Puerto 80 responde${NC}"
else
    echo -e "${RED}❌ Puerto 80 no responde${NC}"
fi

if timeout 5 curl -I http://localhost:8080 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Dashboard Traefik responde${NC}"
else
    echo -e "${RED}❌ Dashboard Traefik no responde${NC}"
fi

# Obtener IP externa
EXTERNAL_IP=$(timeout 10 curl -s ifconfig.me 2>/dev/null || echo "No disponible")
echo ""

# 7. RESUMEN FINAL
echo -e "${BLUE}📊 RESUMEN FINAL${NC}"
echo "================"
echo "Estado de contenedores:"
docker-compose ps

echo ""
echo "URLs para probar:"
echo "- Frontend: https://www.sanchodistribuidora.com"
echo "- API: https://api.sanchodistribuidora.com"
echo "- Dashboard Traefik: http://$EXTERNAL_IP:8080"

echo ""
echo "Para monitorear en tiempo real:"
echo "- Logs de Traefik: docker-compose logs -f traefik"
echo "- Logs de Backend: docker-compose logs -f backend"
echo "- Estado general: watch 'docker-compose ps'"

echo ""
echo -e "${GREEN}🎉 SCRIPT DE SOLUCIÓN COMPLETADO${NC}"
echo "Si aún hay problemas, ejecuta: ./diagnostico-completo.sh"
