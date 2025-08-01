#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para verificar autenticación en VPS
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.models import User

def verificar_usuario():
    """Verificar usuario ebyted@hotmail.com"""
    email = 'ebyted@hotmail.com'
    password = 'Arkano-IA2025+'
    
    print("=" * 50)
    print("VERIFICACION DE USUARIO EN VPS")
    print("=" * 50)
    
    try:
        # Verificar que el usuario existe
        user = User.objects.get(email=email)
        print(f"✅ Usuario encontrado: {user.email}")
        print(f"👤 Nombre: {user.first_name} {user.last_name}")
        print(f"🔓 Activo: {user.is_active}")
        print(f"👑 Superuser: {user.is_superuser}")
        print(f"📅 Creado: {user.created_at}")
        
        # Probar autenticación
        print(f"\n🔍 Probando autenticación con contraseña: {password}")
        if user.check_password(password):
            print("✅ ¡AUTENTICACIÓN EXITOSA!")
            return True
        else:
            print("❌ CONTRASEÑA INCORRECTA")
            
            # Probar otras contraseñas comunes
            passwords_to_try = ['admin123', 'Admin123', 'admin', 'password', '123456']
            print("\n🔍 Probando otras contraseñas...")
            for pwd in passwords_to_try:
                if user.check_password(pwd):
                    print(f"✅ Contraseña correcta encontrada: {pwd}")
                    return pwd
            print("❌ Ninguna contraseña común funcionó")
            return False
            
    except User.DoesNotExist:
        print(f"❌ Usuario {email} NO ENCONTRADO")
        print("\n📋 Usuarios disponibles:")
        for u in User.objects.all():
            print(f"   - {u.email} ({u.first_name} {u.last_name})")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == '__main__':
    verificar_usuario()
