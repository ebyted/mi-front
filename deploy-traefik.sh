#!/bin/bash

# Script de deployment con Traefik para Maestro Inventario
# Uso: ./deploy-traefik.sh

set -e

echo "🚀 Iniciando deployment con Traefik..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Error: docker-compose.yml no encontrado${NC}"
    echo "Ejecuta este script desde la raíz del proyecto"
    exit 1
fi

# Crear red de Traefik si no existe
echo -e "${BLUE}🔗 Creando red de Docker...${NC}"
docker network create maestro_network 2>/dev/null || echo "Red ya existe"

# Parar servicios existentes
echo -e "${YELLOW}⏹️ Parando servicios existentes...${NC}"
docker-compose down --remove-orphans

# Crear directorio para certificados SSL
echo -e "${BLUE}📁 Preparando directorios...${NC}"
sudo mkdir -p /opt/maestro/letsencrypt
sudo chown $USER:$USER /opt/maestro/letsencrypt

# Construir y iniciar servicios
echo -e "${BLUE}🏗️ Construyendo servicios...${NC}"
docker-compose build --no-cache

echo -e "${BLUE}🚀 Iniciando servicios con Traefik...${NC}"
docker-compose up -d

# Esperar a que los servicios estén listos
echo -e "${YELLOW}⏳ Esperando que los servicios estén listos...${NC}"
sleep 30

# Verificar estado de los servicios
echo -e "${BLUE}📊 Estado de los servicios:${NC}"
docker-compose ps

# Verificar conectividad
echo -e "${BLUE}🔍 Verificando conectividad...${NC}"

# Test del backend
echo -n "Backend API: "
if curl -s -f http://localhost:8030/api/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ Error${NC}"
fi

# Test del frontend a través de Traefik
echo -n "Frontend (Traefik): "
if curl -s -f -H "Host: www.sanchodistribuidora.com" http://localhost/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ Error${NC}"
fi

# Mostrar información útil
echo -e "${GREEN}✅ Deployment completado!${NC}"
echo ""
echo -e "${BLUE}📋 Información del deployment:${NC}"
echo "• Frontend: https://www.sanchodistribuidora.com"
echo "• API: https://api.sanchodistribuidora.com"
echo "• Traefik Dashboard: https://traefik.sanchodistribuidora.com"
echo "• Dashboard User: admin"
echo "• Dashboard Pass: admin123"
echo ""
echo -e "${YELLOW}📝 Configuración DNS necesaria:${NC}"
echo "• A Record: www.sanchodistribuidora.com -> 168.231.67.221"
echo "• A Record: api.sanchodistribuidora.com -> 168.231.67.221"
echo "• A Record: traefik.sanchodistribuidora.com -> 168.231.67.221"
echo "• A Record: sanchodistribuidora.com -> 168.231.67.221"
echo ""
echo -e "${BLUE}🔧 Comandos útiles:${NC}"
echo "• Ver logs: docker-compose logs -f [servicio]"
echo "• Reiniciar: docker-compose restart [servicio]"
echo "• Parar todo: docker-compose down"
echo "• Estado: docker-compose ps"

# Mostrar logs en tiempo real
echo -e "${BLUE}📄 Mostrando logs (Ctrl+C para salir):${NC}"
docker-compose logs -f --tail=50
