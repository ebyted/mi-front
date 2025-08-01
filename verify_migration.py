#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.models import *

print('=== RESUMEN DE DATOS EN POSTGRESQL ===')
print(f'Businesses: {Business.objects.count()}')
print(f'Brands: {Brand.objects.count()}')
print(f'Categories: {Category.objects.count()}')
print(f'Products: {Product.objects.count()}')
print(f'ProductVariants: {ProductVariant.objects.count()}')
print(f'Warehouses: {Warehouse.objects.count()}')
print(f'Suppliers: {Supplier.objects.count()}')
print(f'Users: {User.objects.count()}')
print()

print('=== PRIMEROS 5 PRODUCTOS ===')
for p in Product.objects.all()[:5]:
    brand_name = p.brand.name if p.brand else "N/A"
    category_name = p.category.name if p.category else "N/A"
    print(f'- {p.name} (Brand: {brand_name}, Category: {category_name})')
print()

print('=== USUARIOS ===')
for u in User.objects.all():
    business_name = u.business.name if u.business else "N/A"
    print(f'- {u.first_name} {u.last_name} ({u.email}) - Business: {business_name}')
print()

print('=== MARCAS (PRIMERAS 10) ===')
for b in Brand.objects.all()[:10]:
    print(f'- {b.name}')
print()

print('=== CATEGORIAS (PRIMERAS 10) ===')
for c in Category.objects.all()[:10]:
    print(f'- {c.name}')
