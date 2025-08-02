#!/usr/bin/env python
"""
Script de diagnóstico para verificar el estado del inventario usando SQLite
"""
import os
import sys
import django

# Configurar Django para usar SQLite directamente
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Override de configuración de base de datos para desarrollo local
os.environ['DATABASE_ENGINE'] = 'django.db.backends.sqlite3'
os.environ['DATABASE_NAME'] = 'db.sqlite3'
os.environ['DATABASE_USER'] = ''
os.environ['DATABASE_PASSWORD'] = ''
os.environ['DATABASE_HOST'] = ''
os.environ['DATABASE_PORT'] = ''

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.models import (
    ProductWarehouseStock, ProductVariant, Warehouse, 
    InventoryMovement, InventoryMovementDetail
)

def main():
    print("🔍 DIAGNÓSTICO DEL INVENTARIO (SQLite)")
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
        for stock in all_stocks[:10]:  # Mostrar más para entender mejor
            print(f"  - {stock.product_variant.name} | {stock.warehouse.name} | Qty: {stock.quantity}")
    
    # 4. Verificar productos y variantes
    active_variants = ProductVariant.objects.filter(is_active=True)
    print(f"\n📦 ProductVariants activos: {active_variants.count()}")
    
    if active_variants.exists():
        print("\n🎯 MUESTRA DE VARIANTES ACTIVAS:")
        for variant in active_variants[:5]:
            print(f"  - {variant.name} | SKU: {variant.sku} | Precio venta: ${variant.sale_price}")
    
    # 5. Verificar almacenes
    active_warehouses = Warehouse.objects.filter(is_active=True)
    print(f"\n🏭 Almacenes activos: {active_warehouses.count()}")
    
    if active_warehouses.exists():
        print("\n🎯 MUESTRA DE ALMACENES ACTIVOS:")
        for warehouse in active_warehouses[:5]:
            print(f"  - {warehouse.name} | Dirección: {warehouse.address[:50] if warehouse.address else 'Sin dirección'}")
    
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
            try:
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
                    'last_updated': str(stock.updated_at),
                    'created_at': str(stock.created_at),
                }
                
                print("📋 Estructura de ejemplo:")
                for key, value in inventory_item.items():
                    if isinstance(value, dict):
                        print(f"    {key}:")
                        for subkey, subvalue in value.items():
                            print(f"      {subkey}: {subvalue}")
                    else:
                        print(f"    {key}: {value}")
                        
                print(f"\n✅ Estructura procesada correctamente para el inventario")
                
            except Exception as inner_e:
                print(f"❌ Error procesando estructura: {inner_e}")
                print(f"Debug info:")
                print(f"  - ProductVariant: {stock.product_variant.name}")
                print(f"  - Sale price: {stock.product_variant.sale_price}")
                print(f"  - Low stock threshold: {stock.product_variant.low_stock_threshold}")
                print(f"  - Warehouse: {stock.warehouse.name}")
                print(f"  - Address: {stock.warehouse.address}")
        
        else:
            print("⚠️ No hay stocks disponibles para mostrar")
            
            # Verificar si hay movimientos autorizados
            authorized_movements = InventoryMovement.objects.filter(authorized=True)
            print(f"\n🔍 Movimientos autorizados: {authorized_movements.count()}")
            
            if authorized_movements.exists():
                print("❓ HAY MOVIMIENTOS AUTORIZADOS PERO NO SE REFLEJA EN ProductWarehouseStock")
                print("   Esto indica un problema en el proceso de autorización o sincronización")
                
                print("\n🎯 MOVIMIENTOS AUTORIZADOS DE EJEMPLO:")
                for movement in authorized_movements[:3]:
                    details = InventoryMovementDetail.objects.filter(movement=movement)
                    print(f"  Movimiento {movement.id}: {movement.movement_type} en {movement.warehouse.name}")
                    for detail in details[:2]:
                        print(f"    - {detail.product_variant.name}: {detail.quantity}")
    
    except Exception as e:
        print(f"❌ Error en endpoint: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 50)
    print("✅ DIAGNÓSTICO COMPLETADO")

if __name__ == "__main__":
    main()
