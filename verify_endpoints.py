#!/usr/bin/env python3
import os
import sys
import django
from django.conf import settings

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.models import Category, Brand, SalesOrder, SalesOrderItem

print("=== VERIFICACIÓN DE MODELOS Y DATOS ===\n")

# Verificar categorías
categories_count = Category.objects.count()
print(f"📁 Categorías: {categories_count}")
if categories_count > 0:
    sample_category = Category.objects.first()
    print(f"   - Ejemplo: {sample_category.name} (ID: {sample_category.id})")

# Verificar marcas
brands_count = Brand.objects.count()
print(f"🏷️  Marcas: {brands_count}")
if brands_count > 0:
    sample_brand = Brand.objects.first()
    print(f"   - Ejemplo: {sample_brand.name} (ID: {sample_brand.id})")

# Verificar pedidos de venta
orders_count = SalesOrder.objects.count()
print(f"📋 Pedidos de Venta: {orders_count}")
if orders_count > 0:
    sample_order = SalesOrder.objects.first()
    print(f"   - Ejemplo: Pedido #{sample_order.id} - Cliente: {sample_order.customer}")

# Verificar detalles de pedidos
order_items_count = SalesOrderItem.objects.count()
print(f"📦 Items de Pedidos: {order_items_count}")
if order_items_count > 0:
    sample_item = SalesOrderItem.objects.first()
    print(f"   - Ejemplo: Item #{sample_item.id} - Producto: {sample_item.product_variant}")

print("\n=== ENDPOINTS DISPONIBLES ===")
print("✅ /api/categories/")
print("✅ /api/brands/")
print("✅ /api/sales-orders/")
print("✅ /api/sales-order-items/")

print("\n=== VERIFICACIÓN COMPLETADA ===")
