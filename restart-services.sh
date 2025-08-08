#!/bin/bash

echo "🚀 Reiniciando servicios en el VPS..."

# Navegar al directorio del proyecto
cd /root/sancho-app

# Detener contenedores
echo "⏹️ Deteniendo contenedores..."
docker-compose down

# Rebuild los contenedores con cambios
echo "🔨 Reconstruyendo contenedores..."
docker-compose build --no-cache backend frontend

# Iniciar los servicios
echo "▶️ Iniciando servicios..."
docker-compose up -d

# Verificar estado
echo "✅ Verificando estado..."
docker-compose ps

echo "🎉 ¡Despliegue completado!"
echo "🌐 Aplicación disponible en: https://www.sanchodistribuidora.com"
