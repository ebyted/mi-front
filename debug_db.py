#!/usr/bin/env python3
"""
Script de debugging para verificar el estado de la base de datos
"""
import os
import sys
import django

# Configurar Django
sys.path.append('/path/to/your/project')  # Ajustar según la estructura
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario.settings')
django.setup()

from core.models import Customer, Business, Product, ProductVariant

def debug_database():
    print("=== DEBUGGING DATABASE ===")
    
    # Verificar Business
    businesses = Business.objects.all()
    print(f"\n📊 Businesses encontrados: {businesses.count()}")
    for business in businesses:
        print(f"  - {business.name} (ID: {business.id}, Code: {business.code})")
    
    # Verificar Customers
    customers = Customer.objects.all()
    print(f"\n👥 Customers encontrados: {customers.count()}")
    for customer in customers[:5]:  # Solo los primeros 5
        print(f"  - {customer.name} (ID: {customer.id}, Code: {customer.code})")
    
    # Verificar Products
    products = Product.objects.all()
    print(f"\n📦 Products encontrados: {products.count()}")
    for product in products[:5]:  # Solo los primeros 5
        print(f"  - {product.name} (ID: {product.id})")
        
    # Verificar ProductVariants
    variants = ProductVariant.objects.all()
    print(f"\n📋 ProductVariants encontrados: {variants.count()}")
    for variant in variants[:5]:  # Solo los primeros 5
        print(f"  - {variant.product.name} (ID: {variant.id})")
    
    print("\n" + "="*50)

if __name__ == "__main__":
    debug_database()
