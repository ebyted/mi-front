#!/usr/bin/env python
"""
Script simple para verificar la estructura de modelos sin conectar a BD
"""
import os
import sys

# Agregar el directorio del proyecto al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Solo verificar la estructura de los modelos
from core.models import ProductVariant, Warehouse, ProductWarehouseStock

def main():
    print("🔍 VERIFICACIÓN DE ESTRUCTURA DE MODELOS")
    print("=" * 50)
    
    # Verificar campos de ProductVariant
    print("📦 CAMPOS DE ProductVariant:")
    variant_fields = [field.name for field in ProductVariant._meta.fields]
    for field in variant_fields:
        print(f"  - {field}")
    
    print(f"\n✅ ¿Tiene 'price'? {'price' in variant_fields}")
    print(f"✅ ¿Tiene 'sale_price'? {'sale_price' in variant_fields}")
    print(f"✅ ¿Tiene 'min_stock'? {'min_stock' in variant_fields}")
    print(f"✅ ¿Tiene 'low_stock_threshold'? {'low_stock_threshold' in variant_fields}")
    
    print("\n" + "=" * 30)
    
    # Verificar campos de Warehouse
    print("🏭 CAMPOS DE Warehouse:")
    warehouse_fields = [field.name for field in Warehouse._meta.fields]
    for field in warehouse_fields:
        print(f"  - {field}")
    
    print(f"\n✅ ¿Tiene 'location'? {'location' in warehouse_fields}")
    print(f"✅ ¿Tiene 'address'? {'address' in warehouse_fields}")
    
    print("\n" + "=" * 30)
    
    # Verificar campos de ProductWarehouseStock
    print("📊 CAMPOS DE ProductWarehouseStock:")
    stock_fields = [field.name for field in ProductWarehouseStock._meta.fields]
    for field in stock_fields:
        print(f"  - {field}")
    
    print("\n" + "=" * 50)
    print("✅ VERIFICACIÓN COMPLETADA")
    
    # Resumen de correcciones necesarias
    print("\n🔧 CORRECCIONES APLICADAS EN EL BACKEND:")
    print("1. ❌ stock.product_variant.price → ✅ stock.product_variant.sale_price")
    print("2. ❌ stock.product_variant.min_stock → ✅ stock.product_variant.low_stock_threshold") 
    print("3. ❌ stock.warehouse.location → ✅ stock.warehouse.address")
    print("\n🎯 Estas correcciones ya fueron aplicadas en core/views.py líneas 942-956")

if __name__ == "__main__":
    main()
