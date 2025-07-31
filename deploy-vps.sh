#!/bin/bash

# Script de Deploy para VPS - Maestro Inventario
# Ejecutar en el VPS

echo "============================================="
echo "    DEPLOY MAESTRO INVENTARIO - VPS"
echo "============================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. Verificar que estamos en el directorio correcto
print_status "Verificando directorio del proyecto..."
if [ ! -f "docker-compose.yml" ]; then
    print_error "No se encontró docker-compose.yml. ¿Estás en el directorio correcto?"
    exit 1
fi
print_success "Directorio del proyecto verificado"

# 2. Verificar Docker
print_status "Verificando Docker..."
if ! command -v docker &> /dev/null; then
    print_error "Docker no está instalado"
    print_warning "Instala Docker con: sudo apt install docker.io docker-compose -y"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose no está instalado"
    print_warning "Instala Docker Compose con: sudo apt install docker-compose -y"
    exit 1
fi

# Verificar que Docker está corriendo
if ! docker info &> /dev/null; then
    print_error "Docker no está corriendo"
    print_warning "Inicia Docker con: sudo systemctl start docker"
    exit 1
fi

print_success "Docker verificado y funcionando"

# 3. Verificar archivo .env
print_status "Verificando archivo .env..."
if [ ! -f ".env" ]; then
    print_warning "Archivo .env no encontrado, creando desde template..."
    cp .env.example .env
    print_warning "¡IMPORTANTE! Edita el archivo .env con los datos de tu VPS:"
    echo "  - DB_PASSWORD=tu_password_seguro"
    echo "  - SECRET_KEY=tu_secret_key_muy_largo"
    echo "  - DOMAIN=tu-ip-o-dominio"
    read -p "Presiona Enter cuando hayas editado .env..."
fi
print_success "Archivo .env verificado"

# 4. Verificar puertos disponibles
print_status "Verificando puertos disponibles..."
check_port() {
    local port=$1
    if ss -tuln | grep ":$port " > /dev/null; then
        print_warning "Puerto $port ya está en uso"
        return 1
    else
        print_success "Puerto $port disponible"
        return 0
    fi
}

check_port 5173
check_port 8030
check_port 5433

# 5. Detener servicios existentes
print_status "Deteniendo servicios existentes..."
docker-compose down -v 2>/dev/null || true
print_success "Servicios detenidos"

# 6. Limpiar recursos Docker
print_status "Limpiando recursos Docker..."
docker system prune -f
print_success "Recursos limpiados"

# 7. Construir imágenes
print_status "Construyendo imágenes (esto puede tomar varios minutos)..."
if docker-compose build --no-cache; then
    print_success "Imágenes construidas exitosamente"
else
    print_error "Error al construir las imágenes"
    docker-compose logs
    exit 1
fi

# 8. Iniciar servicios
print_status "Iniciando servicios..."
if docker-compose up -d; then
    print_success "Servicios iniciados"
else
    print_error "Error al iniciar servicios"
    docker-compose logs
    exit 1
fi

# 9. Esperar a que los servicios estén listos
print_status "Esperando a que los servicios estén listos..."
sleep 15

# 10. Verificar estado de los servicios
print_status "Verificando estado de los servicios..."
docker-compose ps

# 11. Verificar logs del backend
print_status "Verificando logs del backend..."
echo "Últimas 10 líneas de logs del backend:"
docker-compose logs --tail=10 backend

# 12. Verificar conectividad
print_status "Verificando conectividad..."
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

echo ""
echo "============================================="
echo "        DEPLOY COMPLETADO EXITOSAMENTE"
echo "============================================="
echo ""
echo "🌐 URLs de acceso:"
echo "  - Frontend: http://$SERVER_IP:5173"
echo "  - Backend:  http://$SERVER_IP:8030"
echo "  - Admin:    http://$SERVER_IP:8030/admin"
echo ""
echo "📋 Comandos útiles:"
echo "  - Ver logs: docker-compose logs -f"
echo "  - Reiniciar: docker-compose restart"
echo "  - Detener: docker-compose down"
echo "  - Estado: docker-compose ps"
echo ""
echo "🔧 Primera vez? Ejecuta las migraciones:"
echo "  docker-compose exec backend python manage.py migrate"
echo "  docker-compose exec backend python manage.py createsuperuser"
echo ""

# Preguntar si ejecutar migraciones
read -p "¿Es la primera vez que despliegas? ¿Ejecutar migraciones? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Ejecutando migraciones..."
    docker-compose exec backend python manage.py migrate
    print_success "Migraciones ejecutadas"
    
    read -p "¿Crear superusuario? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose exec backend python manage.py createsuperuser
    fi
fi

print_success "¡Deploy completado! La aplicación está corriendo en tu VPS."
