#!/bin/bash
echo "======================================================================"
echo "        CORRECCIÓN COMPLETA DE ARCHIVOS ESTÁTICOS DJANGO"
echo "======================================================================"
echo ""

echo "1. VERIFICAR CONFIGURACIÓN ACTUAL:"
echo "---------------------------------"
docker exec maestro_backend cat /app/maestro_inventario_backend/settings.py | grep -A 5 -B 5 "STATIC_URL"

echo ""
echo "2. AGREGAR STATIC_ROOT AL SETTINGS.PY:"
echo "-------------------------------------"
# Crear backup del settings.py original
docker exec maestro_backend cp /app/maestro_inventario_backend/settings.py /app/maestro_inventario_backend/settings.py.backup

# Agregar STATIC_ROOT después de STATIC_URL
docker exec maestro_backend sed -i "/STATIC_URL = 'static\/'/a\\
STATIC_ROOT = '/app/staticfiles/'" /app/maestro_inventario_backend/settings.py

echo "STATIC_ROOT agregado exitosamente"

echo ""
echo "3. CREAR DIRECTORIOS NECESARIOS:"
echo "-------------------------------"
docker exec maestro_backend mkdir -p /app/staticfiles
docker exec maestro_backend mkdir -p /app/static

echo ""
echo "4. VERIFICAR NUEVA CONFIGURACIÓN:"
echo "-------------------------------"
docker exec maestro_backend cat /app/maestro_inventario_backend/settings.py | grep -A 5 -B 5 "STATIC"

echo ""
echo "5. RECOLECTAR ARCHIVOS ESTÁTICOS:"
echo "--------------------------------"
docker exec maestro_backend python manage.py collectstatic --noinput

echo ""
echo "6. VERIFICAR ARCHIVOS RECOLECTADOS:"
echo "---------------------------------"
docker exec maestro_backend ls -la /app/staticfiles/admin/css/ | head -5

echo ""
echo "7. REINICIAR BACKEND:"
echo "-------------------"
docker restart maestro_backend
echo "Esperando reinicio..."
sleep 15

echo ""
echo "8. VERIFICAR FUNCIONAMIENTO:"
echo "---------------------------"
echo "Estado del contenedor:"
docker ps | grep maestro_backend

echo ""
echo "Probando archivos estáticos:"
curl -s -o /dev/null -w "%{http_code}" http://168.231.67.221:8030/static/admin/css/base.css

echo ""
echo "======================================================================"
echo "✅ CORRECCIÓN COMPLETADA"
echo "Ahora deberías poder acceder al Django Admin sin errores de CSS/JS"
echo "Accede a: http://168.231.67.221:8030/admin/"
echo "======================================================================"
