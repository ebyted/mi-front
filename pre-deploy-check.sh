#!/bin/bash

# Pre-Deploy Check Script para Sancho Distribuidora
# Verifica que todo esté listo antes del deploy

echo "🔍 VERIFICACIONES PRE-DEPLOY"
echo "============================"

ERRORS=0

# Función para reportar errores
error() {
    echo "❌ ERROR: $1"
    ERRORS=$((ERRORS + 1))
}

# Función para reportar éxito
success() {
    echo "✅ $1"
}

# Verificar Docker
if command -v docker >/dev/null 2>&1; then
    success "Docker está instalado"
    DOCKER_VERSION=$(docker --version)
    echo "   $DOCKER_VERSION"
else
    error "Docker no está instalado"
fi

# Verificar Docker Compose
if command -v docker compose >/dev/null 2>&1; then
    success "Docker Compose está disponible"
else
    error "Docker Compose no está disponible"
fi

# Verificar archivos necesarios
FILES=(
    "docker-compose.yml"
    "Dockerfile"
    "dbackf/Dockerfile"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        success "Archivo $file existe"
    else
        error "Archivo $file no encontrado"
    fi
done

# Verificar sintaxis de docker-compose.yml
if docker compose config >/dev/null 2>&1; then
    success "Sintaxis de docker-compose.yml es válida"
else
    error "Sintaxis de docker-compose.yml tiene errores"
    docker compose config
fi

# Verificar conectividad a registros
if docker pull hello-world >/dev/null 2>&1; then
    success "Conectividad a Docker Hub OK"
    docker rmi hello-world >/dev/null 2>&1
else
    error "No se puede conectar a Docker Hub"
fi

# Verificar puertos
PORTS=(80 443 8080)
for port in "${PORTS[@]}"; do
    if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
        echo "⚠️  Puerto $port está ocupado (se liberará durante deploy)"
    else
        success "Puerto $port está libre"
    fi
done

# Verificar espacio en disco
AVAILABLE=$(df . | tail -1 | awk '{print $4}')
if [ "$AVAILABLE" -gt 1000000 ]; then  # 1GB en KB
    success "Espacio en disco suficiente ($(($AVAILABLE / 1024)) MB disponibles)"
else
    error "Espacio en disco insuficiente ($(($AVAILABLE / 1024)) MB disponibles, se necesitan al menos 1GB)"
fi

# Verificar memoria
AVAILABLE_MEM=$(free -m | awk 'NR==2{print $7}')
if [ "$AVAILABLE_MEM" -gt 512 ]; then
    success "Memoria disponible suficiente (${AVAILABLE_MEM}MB)"
else
    error "Memoria insuficiente (${AVAILABLE_MEM}MB disponibles, se recomiendan al menos 512MB)"
fi

# Verificar red Docker
if docker network ls | grep -q bridge; then
    success "Red Docker bridge disponible"
else
    error "Red Docker bridge no disponible"
fi

# Verificar servicios en conflicto
CONFLICTING_SERVICES=$(docker ps --filter "name=maestro" --format "{{.Names}}")
if [ ! -z "$CONFLICTING_SERVICES" ]; then
    echo "⚠️  Servicios maestro en ejecución que se detendrán:"
    echo "$CONFLICTING_SERVICES"
else
    success "No hay servicios maestro en conflicto"
fi

# Resumen
echo ""
echo "📊 RESUMEN DE VERIFICACIONES"
echo "============================"

if [ $ERRORS -eq 0 ]; then
    echo "✅ Todas las verificaciones pasaron exitosamente"
    echo "🚀 Sistema listo para deploy"
    exit 0
else
    echo "❌ Se encontraron $ERRORS errores"
    echo "🛠️  Por favor, corrige los errores antes del deploy"
    exit 1
fi
