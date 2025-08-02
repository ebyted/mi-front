#!/bin/bash
echo "======================================================================"
echo "         SOLUCIÓN FINAL - CONFIGURACIÓN URLS ESTÁTICOS"
echo "======================================================================"
echo ""

echo "1. VERIFICAR URLs.PY PRINCIPAL:"
echo "------------------------------"
docker exec maestro_backend cat /app/maestro_inventario_backend/urls.py

echo ""
echo "2. AGREGAR CONFIGURACIÓN PARA SERVIR ARCHIVOS ESTÁTICOS:"
echo "--------------------------------------------------------"

# Crear backup del urls.py
docker exec maestro_backend cp /app/maestro_inventario_backend/urls.py /app/maestro_inventario_backend/urls.py.backup

# Crear nuevo urls.py con configuración de estáticos
docker exec maestro_backend cat > /app/maestro_inventario_backend/urls.py << 'EOF'
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework import permissions

schema_view = get_schema_view(
    openapi.Info(
        title="Maestro Inventario API",
        default_version='v1',
        description="API para sistema de inventario",
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    path('', include('core.urls_welcome')),
]

# Servir archivos estáticos en desarrollo y producción
if settings.DEBUG or True:  # Forzar para producción también
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
EOF

echo "URLs.py actualizado con configuración de archivos estáticos"

echo ""
echo "3. VERIFICAR NUEVA CONFIGURACIÓN:"
echo "-------------------------------"
docker exec maestro_backend cat /app/maestro_inventario_backend/urls.py | tail -5

echo ""
echo "4. REINICIAR BACKEND PARA APLICAR CAMBIOS:"
echo "-----------------------------------------"
docker restart maestro_backend
echo "Esperando reinicio completo..."
sleep 20

echo ""
echo "5. VERIFICAR FUNCIONAMIENTO:"
echo "---------------------------"
echo "Estado del contenedor:"
docker ps | grep maestro_backend

echo ""
echo "Probando archivos estáticos:"
echo "CSS Base Admin:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://168.231.67.221:8030/static/admin/css/base.css

echo "CSS Login Admin:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://168.231.67.221:8030/static/admin/css/login.css

echo ""
echo "6. PROBAR ADMIN COMPLETO:"
echo "------------------------"
echo "Probando acceso a admin:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://168.231.67.221:8030/admin/

echo ""
echo "======================================================================"
echo "✅ CONFIGURACIÓN COMPLETA FINALIZADA"
echo ""
echo "🎯 AHORA DEBERÍAS PODER ACCEDER A:"
echo "📱 Django Admin: http://168.231.67.221:8030/admin/"
echo "📱 API Swagger: http://168.231.67.221:8030/swagger/"
echo "📱 Frontend: http://168.231.67.221/"
echo ""
echo "Los archivos CSS y JS del admin ahora deberían cargarse correctamente"
echo "======================================================================"
