#!/bin/bash

echo "🔧 Actualizando frontend con correcciones de autenticación..."

# Construir la nueva imagen del frontend con las correcciones
echo "📦 Construyendo nueva imagen del frontend..."
docker build -t sancho-distribuidora-mi-front-npxvvf-frontend dbackf/

echo "✅ Nueva imagen construida"
echo ""
echo "🔄 Actualizando containers..."

# Detener solo el frontend para actualizarlo
docker stop maestro_frontend

# Iniciar con la nueva imagen
docker-compose -f docker-compose-fixed.yml up -d maestro_frontend

echo "✅ Frontend actualizado con correcciones de autenticación"
echo ""
echo "🔍 Verificando estado:"
docker ps | grep maestro_frontend

echo ""
echo "🌐 URLs para probar:"
echo "Frontend: https://www.sanchodistribuidora.com"
echo "Login: https://www.sanchodistribuidora.com/login"
