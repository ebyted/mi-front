#!/bin/bash

echo "Aplicando configuración CORS al servidor VPS..."

# Crear script Python para actualizar settings.py
docker exec sancho_backend_v2 python3 -c "
import os

settings_file = '/app/maestro_inventario_backend/settings.py'

# Leer el archivo actual
try:
    with open(settings_file, 'r') as f:
        content = f.read()
    
    # Si no tiene CORS_ALLOW_ALL_ORIGINS, agregarlo
    if 'CORS_ALLOW_ALL_ORIGINS' not in content:
        cors_config = '''

# CORS configuration for API access
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]
'''
        
        # Escribir el archivo actualizado
        with open(settings_file, 'a') as f:
            f.write(cors_config)
        print('✅ Configuración CORS agregada exitosamente')
    else:
        print('ℹ️  La configuración CORS ya existe')
        
except Exception as e:
    print(f'❌ Error: {e}')
"

# Reiniciar el contenedor para aplicar cambios
echo "Reiniciando contenedor..."
docker restart sancho_backend_v2

echo "Verificando que el contenedor esté corriendo..."
sleep 5
docker ps | grep sancho_backend

echo "✅ Configuración CORS aplicada al VPS"
