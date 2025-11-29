#!/usr/bin/env python
"""
Script de inicialización para sincronizar todos los productos con Tijuana
Ejecutar UNA VEZ después de desplegar el código nuevo
"""
import os
import sys

# Agregar el directorio del proyecto al path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')

import django
django.setup()

from django.core.management import call_command

print("=" * 80)
print("🚀 INICIALIZACIÓN DEL SISTEMA DE SINCRONIZACIÓN DE STOCK")
print("=" * 80)
print()
print("Este script va a:")
print("1. Sincronizar TODOS los productos con el almacén de TIJUANA")
print("2. Crear registros faltantes en ProductWarehouseStock")
print("3. Calcular el stock real basado en movimientos de inventario")
print()

respuesta = input("¿Continuar? (s/n): ")

if respuesta.lower() != 's':
    print("❌ Operación cancelada")
    sys.exit(0)

print("\n" + "=" * 80)
print("🔄 Ejecutando sincronización...")
print("=" * 80 + "\n")

try:
    # Ejecutar comando de sincronización
    call_command('sync_warehouse_stock', '--warehouse', 'TIJUANA', '--force')
    
    print("\n" + "=" * 80)
    print("✅ INICIALIZACIÓN COMPLETADA CON ÉXITO")
    print("=" * 80)
    print()
    print("A partir de ahora:")
    print("✅ El stock se actualizará automáticamente con cada venta/compra")
    print("✅ Nuevos productos se agregarán automáticamente a todos los almacenes")
    print("✅ Puedes verificar la salud del inventario en: /api/check-stock-health/")
    print()
    
except Exception as e:
    print("\n" + "=" * 80)
    print(f"❌ ERROR: {str(e)}")
    print("=" * 80)
    sys.exit(1)
