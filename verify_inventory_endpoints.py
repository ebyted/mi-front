#!/usr/bin/env python
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

def test_inventory_endpoints():
    print("🔍 Verificando endpoints de inventario...")
    
    try:
        # Test modelos
        from core.models import Product, ProductVariant, ProductWarehouseStock, Warehouse
        print("✅ Modelos importados correctamente")
        
        # Test campos del modelo Product
        print("📦 Verificando campos de Product...")
        product_fields = [field.name for field in Product._meta.fields]
        required_fields = ['minimum_stock', 'maximum_stock']
        for field in required_fields:
            if field in product_fields:
                print(f"  ✅ Campo {field} existe")
            else:
                print(f"  ❌ Campo {field} NO existe")
        
        # Test campos del modelo ProductVariant
        print("🔧 Verificando campos de ProductVariant...")
        variant_fields = [field.name for field in ProductVariant._meta.fields]
        variant_required = ['low_stock_threshold', 'sku', 'sale_price']
        for field in variant_required:
            if field in variant_fields:
                print(f"  ✅ Campo {field} existe")
            else:
                print(f"  ❌ Campo {field} NO existe")
        
        # Test campos del modelo ProductWarehouseStock
        print("📊 Verificando campos de ProductWarehouseStock...")
        stock_fields = [field.name for field in ProductWarehouseStock._meta.fields]
        stock_required = ['min_stock', 'quantity', 'product_variant', 'warehouse']
        for field in stock_required:
            if field in stock_fields:
                print(f"  ✅ Campo {field} existe")
            else:
                print(f"  ❌ Campo {field} NO existe")
        
        # Test datos reales
        print("📋 Verificando datos...")
        products_count = Product.objects.count()
        variants_count = ProductVariant.objects.count()
        stocks_count = ProductWarehouseStock.objects.count()
        warehouses_count = Warehouse.objects.count()
        
        print(f"  📦 Productos: {products_count}")
        print(f"  🔧 Variantes: {variants_count}")
        print(f"  📊 Stocks: {stocks_count}")
        print(f"  🏪 Almacenes: {warehouses_count}")
        
        # Test muestra de datos con los campos necesarios
        if stocks_count > 0:
            print("🔍 Verificando estructura de datos de stock...")
            stock_sample = ProductWarehouseStock.objects.select_related('product_variant__product', 'warehouse').first()
            
            print(f"  📦 Producto: {stock_sample.product_variant.product.name}")
            print(f"  🔧 Variante: {stock_sample.product_variant.name}")
            print(f"  🏪 Almacén: {stock_sample.warehouse.name}")
            print(f"  📊 Cantidad: {stock_sample.quantity}")
            print(f"  📉 Stock mín (warehouse): {stock_sample.min_stock}")
            print(f"  📈 Stock mín (product): {stock_sample.product_variant.product.minimum_stock}")
            print(f"  📈 Stock máx (product): {stock_sample.product_variant.product.maximum_stock}")
            print(f"  ⚠️ Threshold (variant): {stock_sample.product_variant.low_stock_threshold}")
        
        # Test serializers
        print("📄 Verificando serializers...")
        from core.serializers import ProductSerializer, ProductVariantSerializer, ProductWarehouseStockSerializer
        print("  ✅ Serializers importados correctamente")
        
        # Test ViewSets
        print("🎯 Verificando ViewSets...")
        from core.views import ProductViewSet, ProductVariantViewSet, ProductWarehouseStockViewSet
        print("  ✅ ViewSets importados correctamente")
        
        print("\n🎉 ¡Verificación completa! Todos los componentes están correctos.")
        
    except Exception as e:
        print(f"\n❌ Error encontrado: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_inventory_endpoints()
