#!/bin/bash

# Script para crear usuario ebyted@hotmail.com
echo "=== Creando usuario ebyted@hotmail.com ==="

# Ejecutar comando Python en Django shell
docker exec sancho_backend_v2 python manage.py shell -c "
from core.models import User
from django.contrib.auth.hashers import make_password

# Crear o actualizar usuario
email = 'ebyted@hotmail.com'
password = '123456'

try:
    user = User.objects.get(email=email)
    print(f'Usuario {email} ya existe, actualizando password...')
    created = False
except User.DoesNotExist:
    user = User(email=email)
    print(f'Creando usuario {email}...')
    created = True

# Configurar usuario
user.first_name = 'Eduardo'
user.last_name = 'Byted'
user.is_staff = True
user.is_superuser = True
user.is_active = True
user.password = make_password(password)
user.save()

print(f'Usuario: {user.email}')
print(f'Activo: {user.is_active}')
print(f'Staff: {user.is_staff}') 
print(f'Superuser: {user.is_superuser}')
print(f'Password configurado: {password}')
print('=== LISTO ===')
"

echo "=== Script completado ==="
