#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para crear un usuario de prueba con contraseña conocida
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.models import User
from django.contrib.auth.hashers import make_password

def crear_usuario_test():
    """Crear usuario de prueba con contraseña conocida"""
    email = 'test@arkano.com'
    password = 'Arkano-IA2025+'
    
    try:
        # Eliminar usuario si existe
        User.objects.filter(email=email).delete()
        
        # Crear nuevo usuario
        user = User.objects.create(
            email=email,
            first_name='Test',
            last_name='Arkano',
            is_active=True,
            is_superuser=True,
            is_staff=True
        )
        user.password = make_password(password)
        user.save()
        
        print(f"✅ Usuario creado: {email}")
        print(f"🔒 Contraseña: {password}")
        
        # Verificar autenticación
        if user.check_password(password):
            print("✅ Autenticación verificada")
        else:
            print("❌ Error en autenticación")
            
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def actualizar_ebyted():
    """Actualizar contraseña de ebyted@hotmail.com"""
    email = 'ebyted@hotmail.com'
    password = 'Arkano-IA2025+'
    
    try:
        user = User.objects.get(email=email)
        user.password = make_password(password)
        user.is_active = True
        user.save()
        
        print(f"✅ Usuario actualizado: {email}")
        print(f"🔒 Nueva contraseña: {password}")
        
        # Verificar autenticación
        if user.check_password(password):
            print("✅ Autenticación verificada")
        else:
            print("❌ Error en autenticación")
            
        return True
    except User.DoesNotExist:
        print(f"❌ Usuario {email} no encontrado")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == '__main__':
    print("=" * 50)
    print("CREAR USUARIO DE PRUEBA Y ACTUALIZAR EBYTED")
    print("=" * 50)
    
    print("1. Creando usuario de prueba...")
    crear_usuario_test()
    
    print("\n2. Actualizando ebyted@hotmail.com...")
    actualizar_ebyted()
    
    print("\n✅ Proceso completado")
