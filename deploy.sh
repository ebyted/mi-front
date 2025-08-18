#!/bin/bash
# Script de despliegue automatizado para Maestro Inventario

set -e

echo "Construyendo y levantando servicios con Docker Compose..."
docker compose down -v

docker compose pull

docker compose up -d --build

echo "Despliegue completado."
echo "Backend:     http://localhost:8030"
echo "Frontend:    http://localhost"
echo "Postgres:    localhost:5434"
#!/bin/bash

# Script de despliegue para VPS
echo "🚀 Iniciando despliegue de Maestro Inventario..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que Docker está instalado
if ! command -v docker &> /dev/null; then
    print_error "Docker no está instalado. Por favor instálalo primero."
    exit 1
fi

# Verificar que Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose no está instalado. Por favor instálalo primero."
    exit 1
fi

# Crear archivo .env si no existe
if [ ! -f .env ]; then
    print_warning "Archivo .env no encontrado. Copiando desde .env.example..."
    cp .env.example .env
    print_warning "⚠️  IMPORTANTE: Edita el archivo .env con tus valores de producción antes de continuar."
    print_warning "Presiona Enter cuando hayas editado el archivo .env..."
    read
fi

# Detener contenedores existentes
print_message "Deteniendo contenedores existentes..."
docker-compose down --remove-orphans

# Eliminar contenedores con nombres conflictivos si existen (excepto DB)
print_message "Limpiando contenedores con nombres conflictivos..."
docker rm -f sancho_backend_v2 sancho_frontend_v2 2>/dev/null || true

# Asegurar que la base de datos existente esté en la red correcta
print_message "Verificando conexión de base de datos a la red..."
docker network connect dokploy-network sanchobd-2y0ssb.1.xjngxaq8kjrzwsnuq6i97cwep 2>/dev/null || true

# Limpiar imágenes antiguas (opcional)
read -p "¿Deseas limpiar imágenes Docker antiguas? (y/N): " clean_images
if [[ $clean_images == "y" || $clean_images == "Y" ]]; then
    print_message "Limpiando imágenes antiguas..."
    docker system prune -a -f
fi

# Construir y levantar servicios
print_message "Construyendo y levantando servicios..."
docker-compose up --build -d --force-recreate --remove-orphans

# Esperar a que los servicios estén listos
print_message "Esperando a que los servicios estén listos..."
sleep 30

# Ejecutar migraciones
print_message "Ejecutando migraciones de base de datos..."
docker-compose exec backend python manage.py migrate

# Crear superusuario (opcional)
read -p "¿Deseas crear un superusuario? (y/N): " create_superuser
if [[ $create_superuser == "y" || $create_superuser == "Y" ]]; then
    docker-compose exec backend python manage.py createsuperuser
fi

# Recopilar archivos estáticos
print_message "Recopilando archivos estáticos..."
docker-compose exec backend python manage.py collectstatic --noinput

# Verificar estado de los servicios
print_message "Verificando estado de los servicios..."
docker-compose ps

# Mostrar logs recientes
print_message "Logs recientes:"
docker-compose logs --tail=50

print_message "✅ Despliegue completado!"
print_message "🌐 Frontend disponible en: http://localhost"
print_message "🔧 Backend API disponible en: http://localhost/api"
print_message "📊 Para ver logs: docker-compose logs -f"
print_message "🛑 Para detener: docker-compose down"

# Información adicional
echo
print_warning "📝 Notas importantes:"
echo "  • Asegúrate de que los puertos 80, 443, 5432 y 6379 estén disponibles"
echo "  • Los datos se persisten en volúmenes Docker"
echo "  • Para backups: docker-compose exec db pg_dump -U postgres maestro_inventario > backup.sql"
echo "  • Para restaurar: docker-compose exec -T db psql -U postgres maestro_inventario < backup.sql"
