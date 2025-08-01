#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para cambiar la contraseña de un usuario
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.models import User

def change_user_password():
    """Cambiar contraseña del usuario ebyted@hotmail.com"""
    email = 'ebyted@hotmail.com'
    nueva_password = input(f"Ingresa la nueva contraseña para {email}: ")
    confirmar_password = input("Confirma la nueva contraseña: ")
    
    if nueva_password != confirmar_password:
        print("❌ Las contraseñas no coinciden")
        return False
    
    if len(nueva_password) < 8:
        print("❌ La contraseña debe tener al menos 8 caracteres")
        return False
    
    try:
        user = User.objects.get(email=email)
        user.set_password(nueva_password)
        user.save()
        print(f"✅ Contraseña cambiada exitosamente para {email}")
        return True
    except User.DoesNotExist:
        print(f"❌ No se encontró el usuario {email}")
        return False
    except Exception as e:
        print(f"❌ Error al cambiar contraseña: {e}")
        return False

def set_simple_password():
    """Establecer una contraseña simple sin validaciones estrictas"""
    email = 'ebyted@hotmail.com'
    nueva_password = input(f"Ingresa la nueva contraseña para {email} (mínimo 4 caracteres): ")
    
    if len(nueva_password) < 4:
        print("❌ La contraseña debe tener al menos 4 caracteres")
        return False
    
    try:
        user = User.objects.get(email=email)
        # Usar make_password para evitar validaciones estrictas
        from django.contrib.auth.hashers import make_password
        user.password = make_password(nueva_password)
        user.save()
        print(f"✅ Contraseña establecida exitosamente para {email}")
        print(f"📧 Email: {email}")
        print(f"🔒 Nueva contraseña: {nueva_password}")
        return True
    except User.DoesNotExist:
        print(f"❌ No se encontró el usuario {email}")
        return False
    except Exception as e:
        print(f"❌ Error al establecer contraseña: {e}")
        return False

if __name__ == '__main__':
    print("=" * 50)
    print("CAMBIAR CONTRASEÑA DE USUARIO")
    print("=" * 50)
    print("Opciones:")
    print("1. Cambiar contraseña (con validaciones)")
    print("2. Establecer contraseña simple (sin validaciones estrictas)")
    print()
    
    opcion = input("Selecciona una opción (1 o 2): ").strip()
    
    if opcion == "1":
        change_user_password()
    elif opcion == "2":
        set_simple_password()
    else:
        print("❌ Opción inválida")
