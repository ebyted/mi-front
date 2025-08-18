#!/usr/bin/env python3
"""
Script simplificado para cargar datos básicos desde CSV
"""
import os
import sys
import django
import csv

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.models import Business, Brand, Category, Product, ProductVariant

def load_basic_data():
    # Obtener el business
    business = Business.objects.first()
    if not business:
        business = Business.objects.create(
            name="Sancho Distribuidora",
            code="SANCHO",
            description="Empresa principal",
            is_active=True
        )
    
    print(f"✅ Business: {business.name}")
    
    # Leer CSV y cargar algunos productos básicos
    csv_path = 'cat_art.csv'
    if not os.path.exists(csv_path):
        print("❌ No se encontró el archivo cat_art.csv")
        return
    
    with open(csv_path, encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter=';')
        count = 0
        
        for row in reader:
            if count >= 20:  # Solo cargar los primeros 20 productos
                break
                
            try:
                # Obtener datos básicos
                product_name = None
                for key in row.keys():
                    if 'PRODUCTO' in key.upper():
                        product_name = row[key]
                        break
                
                if not product_name or not product_name.strip():
                    continue
                
                brand_name = row.get('Marca', '').strip()
                category_name = row.get('CATEGORIA', '').strip()
                
                # Crear marca si no existe
                brand = None
                if brand_name:
                    brand, created = Brand.objects.get_or_create(
                        name=brand_name,
                        defaults={
                            'business': business,
                            'description': f'Marca {brand_name}',
                            'is_active': True
                        }
                    )
                
                # Crear categoría si no existe
                category = None
                if category_name:
                    category, created = Category.objects.get_or_create(
                        name=category_name,
                        defaults={
                            'business': business,
                            'description': f'Categoría {category_name}',
                            'is_active': True
                        }
                    )
                
                # Crear producto
                sku = f'SKU{count+1:04d}'
                product, created = Product.objects.get_or_create(
                    sku=sku,
                    defaults={
                        'business': business,
                        'name': product_name[:200],  # Limitar longitud
                        'description': product_name,
                        'brand': brand,
                        'category': category,
                        'minimum_stock': 0,
                        'maximum_stock': 100,
                        'is_active': True
                    }
                )
                
                if created:
                    # Crear variante por defecto
                    ProductVariant.objects.get_or_create(
                        product=product,
                        variant_type='default',
                        defaults={
                            'variant_value': 'Standard',
                            'sku': sku,
                            'cost_price': 0.00,
                            'selling_price': 10.00,
                            'is_active': True
                        }
                    )
                    count += 1
                    print(f"  ✅ Producto {count}: {product_name[:50]}...")
                    
            except Exception as e:
                print(f"  ❌ Error: {e}")
                continue
    
    print(f"\n📊 Resumen:")
    print(f"  - Business: {Business.objects.count()}")
    print(f"  - Brands: {Brand.objects.count()}")
    print(f"  - Categories: {Category.objects.count()}")
    print(f"  - Products: {Product.objects.count()}")
    print(f"  - ProductVariants: {ProductVariant.objects.count()}")

if __name__ == '__main__':
    load_basic_data()
