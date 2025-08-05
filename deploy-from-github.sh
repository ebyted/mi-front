#!/bin/bash

echo "🚀 Desplegando desde GitHub..."
echo "Fecha: $(date)"
echo ""

# Crear directorio temporal si no existe
mkdir -p /tmp/deploy

# Ir al directorio temporal
cd /tmp/deploy

# Clonar o actualizar el repositorio
if [ -d "mi-front" ]; then
    echo "📂 Actualizando repositorio existente..."
    cd mi-front
    git pull origin main
else
    echo "📂 Clonando repositorio..."
    git clone https://github.com/ebyted/mi-front.git
    cd mi-front
fi

echo ""
echo "✅ Código actualizado desde GitHub"
echo ""

# Verificar que tenemos los archivos necesarios
if [ ! -f "docker-compose-fixed.yml" ]; then
    echo "❌ Error: No se encuentra docker-compose-fixed.yml"
    exit 1
fi

if [ ! -d "dbackf" ]; then
    echo "❌ Error: No se encuentra el directorio dbackf"
    exit 1
fi

echo "🔧 Construyendo nueva imagen del frontend..."

# Construir la nueva imagen
docker build -t sancho-distribuidora-mi-front-npxvvf-frontend dbackf/

if [ $? -eq 0 ]; then
    echo "✅ Imagen construida exitosamente"
else
    echo "❌ Error construyendo la imagen"
    exit 1
fi

echo ""
echo "🔄 Desplegando containers..."

# Detener containers actuales
docker-compose -f docker-compose-fixed.yml down

# Iniciar con las nuevas imágenes
docker-compose -f docker-compose-fixed.yml up -d

echo ""
echo "✅ Despliegue completado"
echo ""
echo "🔍 Estado de containers:"
docker ps | grep maestro

echo ""
echo "🌐 URLs disponibles:"
echo "Frontend: https://www.sanchodistribuidora.com"
echo "Login: https://www.sanchodistribuidora.com/login"
echo "Debug Auth: https://www.sanchodistribuidora.com/debug-auth"
echo ""
echo "📋 Credenciales para probar:"
echo "- demo@demo.com / demo123"
echo "- admin@admin.com / admin123" 
echo "- test@test.com / test123"
echo "- ebyted@gmail.com / (pregunta al admin)"
echo ""
echo "🎯 El problema de 401 Unauthorized debería estar resuelto"
