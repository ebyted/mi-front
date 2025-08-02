#!/bin/bash
echo "======================================================================"
echo "           CORRECCIÓN DE CONFIGURACIÓN DJANGO ESTÁTICOS"
echo "======================================================================"
echo ""

echo "1. CREAR DIRECTORIO STATIC:"
echo "---------------------------"
docker exec maestro_backend mkdir -p /app/static
docker exec maestro_backend mkdir -p /app/staticfiles

echo "2. CONFIGURAR VARIABLES DE ENTORNO FALTANTES:"
echo "---------------------------------------------"
# Agregar STATIC_ROOT a las variables de entorno
echo "Configurando STATIC_ROOT..."

echo "3. RECOLECTAR ARCHIVOS ESTÁTICOS:"
echo "--------------------------------"
docker exec maestro_backend python manage.py collectstatic --noinput --clear || echo "Error en collectstatic, intentando con configuración manual..."

echo "4. VERIFICAR ARCHIVOS CREADOS:"
echo "-----------------------------"
docker exec maestro_backend ls -la /app/static/ | head -10
docker exec maestro_backend ls -la /app/staticfiles/ | head -10

echo "5. REINICIAR BACKEND PARA APLICAR CAMBIOS:"
echo "-----------------------------------------"
docker restart maestro_backend
echo "Esperando 10 segundos para que se reinicie..."
sleep 10

echo "6. VERIFICAR QUE EL BACKEND ESTÉ FUNCIONANDO:"
echo "--------------------------------------------"
docker ps | grep maestro_backend

echo ""
echo "7. PROBAR ACCESO A ARCHIVOS ESTÁTICOS:"
echo "-------------------------------------"
curl -I http://168.231.67.221:8030/static/admin/css/base.css || echo "Aún hay problemas con archivos estáticos"

echo ""
echo "======================================================================"
echo "Para solucionar completamente, necesitamos:"
echo "1. Configurar STATIC_ROOT en settings.py"
echo "2. Asegurar que DEBUG=True para desarrollo"  
echo "3. Ejecutar collectstatic correctamente"
echo "4. Verificar configuración de servidor de archivos estáticos"
echo "======================================================================"
