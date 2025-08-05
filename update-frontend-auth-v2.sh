#!/bin/bash

echo "🔧 Actualizando frontend con correcciones de autenticación mejoradas..."

# Construir la nueva imagen del frontend
echo "📦 Construyendo nueva imagen del frontend..."
docker build -t sancho-distribuidora-mi-front-npxvvf-frontend dbackf/

echo "✅ Nueva imagen construida"
echo ""
echo "🔄 Reiniciando containers..."

# Reiniciar el stack completo
docker-compose -f docker-compose-fixed.yml down
docker-compose -f docker-compose-fixed.yml up -d

echo "✅ Frontend actualizado con correcciones de autenticación"
echo ""
echo "🔍 Verificando estado:"
docker ps | grep maestro

echo ""
echo "🌐 URLs para probar:"
echo "Frontend: https://www.sanchodistribuidora.com"
echo "Login: https://www.sanchodistribuidora.com/login"
echo "Debug Auth: https://www.sanchodistribuidora.com/debug-auth"
echo ""
echo "📋 Credenciales para probar:"
echo "- demo@demo.com / demo123"
echo "- admin@admin.com / admin123" 
echo "- test@test.com / test123"
echo "- ebyted@gmail.com / (pregunta al admin)"
