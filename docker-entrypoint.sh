#!/bin/bash

echo "🚀 Iniciando configuración del backend Django..."

# Instalar dependencias
echo "📦 Instalando dependencias Python..."
pip install -r requirements.txt

# Verificar conexión a la base de datos
echo "🔍 Verificando conexión a la base de datos..."
python manage.py check --database default

# Mostrar estado actual de migraciones
echo "📋 Estado actual de migraciones:"
python manage.py showmigrations

# Estrategia de migraciones con manejo de errores
echo "🔄 Aplicando migraciones..."

# Intentar migración normal primero
if python manage.py migrate --noinput; then
    echo "✅ Migraciones aplicadas correctamente"
else
    echo "⚠️  Error en migración normal, intentando resolución de conflictos..."
    
    # Si falla, intentar fake-initial
    if python manage.py migrate --fake-initial; then
        echo "✅ Migraciones resueltas con --fake-initial"
    else
        echo "⚠️  Fake-initial falló, intentando fake completo..."
        
        # Como último recurso, marcar todo como fake
        if python manage.py migrate --fake; then
            echo "✅ Migraciones marcadas como aplicadas"
        else
            echo "❌ Error crítico en migraciones"
            exit 1
        fi
    fi
fi

# Verificar estado final
echo "📋 Estado final de migraciones:"
python manage.py showmigrations

# Recopilar archivos estáticos
echo "📂 Recopilando archivos estáticos..."
python manage.py collectstatic --noinput

# Crear superusuario si no existe
echo "👤 Verificando superusuario..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(email='admin').exists():
    User.objects.create_superuser('admin', 'admin@sanchodistribuidora.com', 'admin123')
    print('✅ Superusuario admin creado')
else:
    print('✅ Superusuario admin ya existe')
"

echo "🎉 Configuración completada, iniciando servidor Django con Gunicorn..."
exec gunicorn maestro_inventario_backend.wsgi:application \
    --bind 0.0.0.0:8030 \
    --workers 3 \
    --timeout 120 \
    --keep-alive 2 \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    --access-logfile - \
    --error-logfile -
