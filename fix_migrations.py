#!/usr/bin/env python
"""
Script para resolver conflictos de migraciones de Django
Específicamente para el problema de cancellation_reason
"""
import os
import sys
import django
from django.conf import settings
from django.core.management import execute_from_command_line

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from django.db import connection
from django.core.management.commands.migrate import Command as MigrateCommand

def check_column_exists(table_name, column_name):
    """Verificar si una columna existe en la tabla"""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name=%s AND column_name=%s
        """, [table_name, column_name])
        return cursor.fetchone() is not None

def fix_migrations():
    """Resolver conflictos de migraciones"""
    print("🔧 Iniciando corrección de migraciones...")
    
    # Verificar si la columna cancellation_reason existe
    if check_column_exists('core_inventorymovement', 'cancellation_reason'):
        print("✅ La columna 'cancellation_reason' ya existe")
        print("🔄 Marcando migración como aplicada...")
        
        # Marcar todas las migraciones como aplicadas
        try:
            execute_from_command_line(['manage.py', 'migrate', '--fake'])
            print("✅ Migraciones marcadas como aplicadas")
        except Exception as e:
            print(f"❌ Error al marcar migraciones: {e}")
            return False
    else:
        print("❌ La columna 'cancellation_reason' no existe")
        print("🔄 Aplicando migraciones normalmente...")
        
        try:
            execute_from_command_line(['manage.py', 'migrate'])
            print("✅ Migraciones aplicadas correctamente")
        except Exception as e:
            print(f"❌ Error al aplicar migraciones: {e}")
            return False
    
    return True

if __name__ == "__main__":
    success = fix_migrations()
    if success:
        print("🎉 Corrección de migraciones completada!")
        sys.exit(0)
    else:
        print("💥 Error en la corrección de migraciones")
        sys.exit(1)
