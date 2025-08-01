#!/bin/bash
# Script para explorar la configuración Docker en el VPS

VPS_HOST="168.231.67.221"
VPS_USER="root"

echo "🔍 Explorando configuración Docker en VPS..."
echo "Conectando a: $VPS_USER@$VPS_HOST"
echo

# Conectar al VPS y ejecutar comandos de exploración
ssh $VPS_USER@$VPS_HOST << 'EOF'
echo "=" * 60
echo "🐳 EXPLORANDO DOCKER EN VPS"
echo "=" * 60

echo "📍 Directorio actual:"
pwd

echo "📂 Contenido del directorio:"
ls -la

echo "🐳 Contenedores Docker en ejecución:"
docker ps

echo "🐳 Todos los contenedores Docker:"
docker ps -a

echo "📋 Imágenes Docker disponibles:"
docker images

echo "🔧 Servicios Docker Compose (si existe):"
if [ -f "docker-compose.yml" ]; then
    echo "✅ Encontrado docker-compose.yml"
    echo "Servicios configurados:"
    docker-compose config --services 2>/dev/null || echo "Error al leer servicios"
    echo
    echo "Contenido de docker-compose.yml:"
    head -30 docker-compose.yml
else
    echo "❌ No se encontró docker-compose.yml en este directorio"
fi

echo "🔍 Buscando archivos docker-compose.yml en el sistema:"
find / -name "docker-compose.yml" -type f 2>/dev/null | head -10

echo "🔍 Buscando directorios de proyectos comunes:"
find /home -name "*maestro*" -type d 2>/dev/null
find /opt -name "*maestro*" -type d 2>/dev/null
find /var/www -name "*maestro*" -type d 2>/dev/null
find /root -name "*maestro*" -type d 2>/dev/null

echo "🌐 Puertos en uso:"
netstat -tlnp | grep :80
netstat -tlnp | grep :3000
netstat -tlnp | grep :8000
netstat -tlnp | grep :5432

echo "🔧 Volúmenes Docker:"
docker volume ls

echo "🌐 Redes Docker:"
docker network ls

EOF

echo "✅ Exploración completada"
