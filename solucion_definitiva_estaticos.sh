#!/bin/bash
echo "======================================================================"
echo "               SOLUCIÓN DEFINITIVA ARCHIVOS ESTÁTICOS"
echo "======================================================================"
echo ""

echo "1. VERIFICAR ESTADO ACTUAL:"
echo "---------------------------"
echo "Archivos estáticos recolectados:"
docker exec maestro_backend ls -la /app/staticfiles/admin/css/ | head -3

echo ""
echo "2. CONFIGURAR DEBUG=True TEMPORALMENTE:"
echo "--------------------------------------"
# Cambiar DEBUG a True para que Django sirva archivos estáticos
docker exec maestro_backend sed -i 's/DEBUG = False/DEBUG = True/' /app/maestro_inventario_backend/settings.py

echo "DEBUG cambiado a True"

echo ""
echo "3. AGREGAR CONFIGURACIÓN MEJORADA DE ESTÁTICOS:"
echo "-----------------------------------------------"
# Agregar configuración adicional al final del settings.py
docker exec maestro_backend cat >> /app/maestro_inventario_backend/settings.py << 'EOF'

# Configuración adicional para archivos estáticos
import os
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]

STATICFILES_FINDERS = [
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
]
EOF

echo "Configuración adicional agregada"

echo ""
echo "4. VERIFICAR CONFIGURACIÓN FINAL:"
echo "-------------------------------"
docker exec maestro_backend tail -10 /app/maestro_inventario_backend/settings.py

echo ""
echo "5. REINICIAR BACKEND:"
echo "-------------------"
docker restart maestro_backend
echo "Esperando 15 segundos para reinicio completo..."
sleep 15

echo ""
echo "6. VERIFICAR FUNCIONAMIENTO:"
echo "---------------------------"
docker ps | grep maestro_backend

echo ""
echo "7. PROBAR ARCHIVOS ESTÁTICOS:"
echo "-----------------------------"
echo "Probando CSS base:"
curl -s -I http://168.231.67.221:8030/static/admin/css/base.css | head -2

echo ""
echo "Probando acceso al admin:"
curl -s -I http://168.231.67.221:8030/admin/ | head -2

echo ""
echo "======================================================================"
echo "✅ SOLUCIÓN APLICADA"
echo ""
echo "🎯 PRUEBA AHORA:"
echo "1. Ve a: http://168.231.67.221:8030/admin/"
echo "2. Los archivos CSS/JS deberían cargar correctamente"
echo "3. La interfaz admin debería verse bien"
echo ""
echo "Si persisten problemas, será necesario revisar la configuración"
echo "del proxy/nginx o usar un servidor web adicional para estáticos"
echo "======================================================================"
