#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para establecer contraseña específica
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.models import User
from django.contrib.auth.hashers import make_password

def set_password():
    """Establecer contraseña Arkano-IA2025+ para ebyted@hotmail.com"""
    email = 'ebyted@hotmail.com'
    nueva_password = 'Arkano-IA2025+'
    
    try:
        user = User.objects.get(email=email)
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
    print("ESTABLECER CONTRASEÑA ARKANO-IA2025+")
    print("=" * 50)
    set_password()
