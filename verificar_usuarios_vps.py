#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para verificar usuarios en VPS
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.models import User

def verificar_usuarios():
    """Verificar usuarios en el sistema"""
    print("=" * 50)
    print("USUARIOS EN VPS")
    print("=" * 50)
    
    usuarios = User.objects.all()
    print(f"Total de usuarios: {usuarios.count()}")
    print()
    
    for user in usuarios:
        print(f"📧 Email: {user.email}")
        print(f"👤 Nombre: {user.first_name} {user.last_name}")
        print(f"✅ Activo: {user.is_active}")
        print(f"🔑 Superuser: {user.is_superuser}")
        print(f"🗓️ Creado: {user.created_at}")
        print("-" * 30)

def probar_autenticacion():
    """Probar autenticación de ebyted@hotmail.com"""
    email = 'ebyted@hotmail.com'
    password = 'admin123'
    
    try:
        user = User.objects.get(email=email)
        if user.check_password(password):
            print(f"✅ Autenticación exitosa para {email}")
            return True
        else:
            print(f"❌ Contraseña incorrecta para {email}")
            return False
    except User.DoesNotExist:
        print(f"❌ Usuario {email} no encontrado")
        return False

if __name__ == '__main__':
    verificar_usuarios()
    print("\n🔍 Probando autenticación...")
    probar_autenticacion()
