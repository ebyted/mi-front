#!/usr/bin/env python
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.models import Business, User

# Crear Business si no existe
if not Business.objects.exists():
    business = Business.objects.create(
        name='Sancho Distribuidora',
        description='Empresa principal',
        is_active=True
    )
    print(f"Business creado: {business.name}")
else:
    business = Business.objects.first()
    print(f"Business ya existe: {business.name}")

# Verificar usuarios
print(f"Total usuarios: {User.objects.count()}")
print(f"Total business: {Business.objects.count()}")
