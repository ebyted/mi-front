#!/usr/bin/env python
"""
Script de diagnóstico para verificar el estado del inventario
"""
import os
import sys
import django

# Configurar Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.models import (
    ProductWarehouseStock, ProductVariant, Warehouse, 
    InventoryMovement, InventoryMovementDetail
)

def main():
    print("🔍 DIAGNÓSTICO DEL INVENTARIO")
    print("=" * 50)
    
    # 1. Verificar datos básicos
    print(f"📦 ProductVariants totales: {ProductVariant.objects.count()}")
    print(f"🏭 Warehouses totales: {Warehouse.objects.count()}")
    print(f"📊 ProductWarehouseStock registros: {ProductWarehouseStock.objects.count()}")
    print(f"📋 InventoryMovements totales: {InventoryMovement.objects.count()}")
    print(f"📋 InventoryMovements autorizados: {InventoryMovement.objects.filter(authorized=True).count()}")
    print(f"📄 InventoryMovementDetails totales: {InventoryMovementDetail.objects.count()}")
    
    print("\n" + "=" * 50)
    
    # 2. Verificar ProductWarehouseStock con cantidad > 0
    stocks_with_quantity = ProductWarehouseStock.objects.filter(quantity__gt=0)
    print(f"📊 Stocks con cantidad > 0: {stocks_with_quantity.count()}")
    
    if stocks_with_quantity.exists():
        print("\n🎯 MUESTRA DE STOCKS CON INVENTARIO:")
        for stock in stocks_with_quantity[:5]:
            print(f"  - {stock.product_variant.name} | {stock.warehouse.name} | Qty: {stock.quantity}")
    
    # 3. Verificar todos los stocks (incluso con cantidad 0)
    all_stocks = ProductWarehouseStock.objects.all()
    print(f"\n📊 Todos los stocks (incluso qty=0): {all_stocks.count()}")
    
    if all_stocks.exists():
        print("\n🎯 MUESTRA DE TODOS LOS STOCKS:")
        for stock in all_stocks[:5]:
            print(f"  - {stock.product_variant.name} | {stock.warehouse.name} | Qty: {stock.quantity}")
    
    # 4. Verificar productos y variantes
    active_variants = ProductVariant.objects.filter(is_active=True)
    print(f"\n📦 ProductVariants activos: {active_variants.count()}")
    
    if active_variants.exists():
        print("\n🎯 MUESTRA DE VARIANTES ACTIVAS:")
        for variant in active_variants[:5]:
            print(f"  - {variant.name} | SKU: {variant.sku} | Precio: {variant.sale_price}")
    
    # 5. Verificar almacenes
    active_warehouses = Warehouse.objects.filter(is_active=True)
    print(f"\n🏭 Almacenes activos: {active_warehouses.count()}")
    
    if active_warehouses.exists():
        print("\n🎯 MUESTRA DE ALMACENES ACTIVOS:")
        for warehouse in active_warehouses[:5]:
            print(f"  - {warehouse.name} | Dirección: {warehouse.address[:50]}")
    
    # 6. Probar el endpoint corregido
    print("\n" + "=" * 50)
    print("🔧 PROBANDO ENDPOINT CORREGIDO")
    
    try:
        stocks = ProductWarehouseStock.objects.select_related(
            'product_variant', 
            'product_variant__product',
            'warehouse'
        ).filter(
            product_variant__is_active=True,
            warehouse__is_active=True
        )
        
        print(f"✅ Query del endpoint ejecutada correctamente")
        print(f"📊 Stocks encontrados: {stocks.count()}")
        
        if stocks.exists():
            print("\n🎯 EJEMPLO DE DATOS CORREGIDOS:")
            stock = stocks.first()
            inventory_item = {
                'id': stock.id,
                'product_variant': {
                    'id': stock.product_variant.id,
                    'name': stock.product_variant.name,
                    'sku': stock.product_variant.sku,
                    'price': float(stock.product_variant.sale_price),  # CORREGIDO
                    'min_stock': float(stock.product_variant.low_stock_threshold),  # CORREGIDO
                    'product_name': stock.product_variant.product.name,
                },
                'warehouse': {
                    'id': stock.warehouse.id,
                    'name': stock.warehouse.name,
                    'location': stock.warehouse.address,  # CORREGIDO
                },
                'quantity': float(stock.quantity),
                'min_stock': float(stock.min_stock),
                'location': stock.location,
                'last_updated': stock.updated_at,
                'created_at': stock.created_at,
            }
            
            print("📋 Estructura de ejemplo:")
            for key, value in inventory_item.items():
                print(f"    {key}: {value}")
    
    except Exception as e:
        print(f"❌ Error en endpoint: {e}")
    
    print("\n" + "=" * 50)
    print("✅ DIAGNÓSTICO COMPLETADO")

if __name__ == "__main__":
    main()
