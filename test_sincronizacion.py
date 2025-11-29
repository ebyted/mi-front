#!/usr/bin/env python
"""
Script de prueba para verificar que el sistema de sincronización funciona
Ejecutar en desarrollo para verificar antes de deployar a producción
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')

import django
django.setup()

from core.models import (
    ProductWarehouseStock, 
    Warehouse, 
    ProductVariant,
    Product
)

print("=" * 80)
print("🧪 PRUEBA DEL SISTEMA DE SINCRONIZACIÓN")
print("=" * 80)

# 1. Verificar almacén de Tijuana
print("\n1️⃣ Verificando almacén de TIJUANA...")
tijuana = Warehouse.objects.filter(name__icontains='tijuana').first()

if tijuana:
    print(f"   ✅ Almacén encontrado: {tijuana.name} (ID: {tijuana.id})")
else:
    print("   ❌ Almacén de TIJUANA no encontrado")
    print("   Almacenes disponibles:")
    for w in Warehouse.objects.all():
        print(f"      - {w.name}")
    sys.exit(1)

# 2. Contar productos totales
print("\n2️⃣ Contando productos...")
total_products = Product.objects.filter(is_active=True).count()
total_variants = ProductVariant.objects.filter(product__is_active=True).count()
print(f"   📦 Productos activos: {total_products}")
print(f"   📦 Variantes activas: {total_variants}")

# 3. Verificar ProductWarehouseStock
print("\n3️⃣ Verificando ProductWarehouseStock...")
stocks_tijuana = ProductWarehouseStock.objects.filter(warehouse=tijuana).count()
print(f"   📊 Registros actuales en Tijuana: {stocks_tijuana}")

if stocks_tijuana == 0:
    print("   ⚠️  NO HAY REGISTROS - Necesitas ejecutar sincronización")
    print("   Ejecuta: python inicializar_stock.py")
elif stocks_tijuana < total_variants:
    print(f"   ⚠️  FALTAN REGISTROS: {total_variants - stocks_tijuana}")
    print("   Ejecuta: python manage.py sync_warehouse_stock --warehouse TIJUANA --force")
else:
    print(f"   ✅ Todos los productos tienen registro de stock")

# 4. Verificar señales
print("\n4️⃣ Verificando señales...")
try:
    from core import signals
    print("   ✅ Módulo de señales importado correctamente")
    
    # Verificar que las funciones existan
    if hasattr(signals, 'calculate_variant_stock'):
        print("   ✅ Función calculate_variant_stock disponible")
    if hasattr(signals, 'update_warehouse_stock_on_movement'):
        print("   ✅ Señal update_warehouse_stock_on_movement registrada")
    if hasattr(signals, 'create_warehouse_stock_for_new_variant_sync'):
        print("   ✅ Señal create_warehouse_stock_for_new_variant_sync registrada")
        
except Exception as e:
    print(f"   ❌ Error importando señales: {str(e)}")

# 5. Verificar comando
print("\n5️⃣ Verificando comando de sincronización...")
try:
    from django.core.management import get_commands
    commands = get_commands()
    if 'sync_warehouse_stock' in commands:
        print("   ✅ Comando sync_warehouse_stock disponible")
    else:
        print("   ❌ Comando sync_warehouse_stock NO encontrado")
except Exception as e:
    print(f"   ❌ Error: {str(e)}")

# 6. Muestra de productos
print("\n6️⃣ Muestra de productos en stock de Tijuana:")
sample_stocks = ProductWarehouseStock.objects.filter(
    warehouse=tijuana
).select_related('product_variant__product')[:5]

if sample_stocks.exists():
    for stock in sample_stocks:
        print(f"   - {stock.product_variant.product.name[:50]}: Stock {stock.quantity}")
else:
    print("   ⚠️  No hay productos en stock para mostrar")

# Resumen final
print("\n" + "=" * 80)
print("📋 RESUMEN")
print("=" * 80)

if stocks_tijuana == total_variants and stocks_tijuana > 0:
    print("✅ TODO ESTÁ LISTO")
    print("   El sistema está sincronizado y funcionando correctamente")
    print("\n🚀 Siguiente paso:")
    print("   1. Hacer merge a main: git checkout main && git merge tienda-alberto")
    print("   2. Push a producción: git push origin main")
    print("   3. Esperar deploy automático en Dokploy")
    print("   4. Ejecutar en producción: docker exec -it <container> python inicializar_stock.py")
elif stocks_tijuana == 0:
    print("⚠️  SINCRONIZACIÓN PENDIENTE")
    print("   Ejecuta: python inicializar_stock.py")
else:
    print("⚠️  SINCRONIZACIÓN PARCIAL")
    print("   Ejecuta: python manage.py sync_warehouse_stock --warehouse TIJUANA --force")

print("=" * 80)
