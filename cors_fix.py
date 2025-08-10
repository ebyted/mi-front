#!/usr/bin/env python3

cors_config = '''
# CORS configurations adicionales para resolver problemas de conexión
CORS_ALLOW_ALL_ORIGINS = True  # Temporal para debug
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

# Leer el archivo settings.py
with open('maestro_inventario_backend/settings.py', 'r') as f:
    content = f.read()

# Verificar si ya tiene la configuración
if 'CORS_ALLOW_ALL_ORIGINS' not in content:
    # Agregar la configuración al final
    with open('maestro_inventario_backend/settings.py', 'a') as f:
        f.write(cors_config)
    print("Configuración CORS agregada exitosamente")
else:
    print("La configuración CORS ya existe")
