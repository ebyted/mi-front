#!/usr/bin/env python
"""
Script para crear un superusuario de forma programática
"""
import os
import sys
import django
from django.conf import settings
from django.contrib.auth import get_user_model

def create_superuser():
    """Crear superusuario admin@admin.com con password 123456"""
    
    # Configurar Django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
    django.setup()
    
    User = get_user_model()
    
    # Datos del superusuario
    email = 'admin@admin.com'
    password = '123456'
    
    # Verificar si el usuario ya existe
    if User.objects.filter(email=email).exists():
        print(f"✅ El usuario {email} ya existe.")
        user = User.objects.get(email=email)
        # Actualizar la contraseña por si cambió
        user.set_password(password)
        user.is_superuser = True
        user.is_staff = True
        user.save()
        print(f"🔑 Contraseña actualizada para {email}")
    else:
        # Crear el superusuario
        user = User.objects.create_superuser(
            email=email,
            password=password,
            first_name='Admin',
            last_name='Maestro'
        )
        print(f"🎉 Superusuario creado exitosamente!")
        print(f"📧 Email: {email}")
        print(f"🔑 Password: {password}")
    
    print(f"\n🌐 Puedes acceder al admin en: http://127.0.0.1:8030/admin/")
    print(f"📱 También puedes usar estas credenciales en la aplicación React")

if __name__ == '__main__':
    try:
        create_superuser()
    except Exception as e:
        print(f"❌ Error al crear superusuario: {e}")
        sys.exit(1)
