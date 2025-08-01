#!/usr/bin/env python3
"""
Script simplificado para migrar datos esenciales de SQLite a PostgreSQL
"""
import os
import sys
import sqlite3
import django
from django.db import connection

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.models import Business, Brand, Category, Product, ProductVariant, Warehouse, Supplier, User

def safe_get(row, key, default=''):
    """Obtener valor de forma segura de SQLite row"""
    try:
        return row[key] if row[key] is not None else default
    except (KeyError, IndexError):
        return default

def migrate_essential_data():
    """Migrar solo los datos esenciales"""
    
    # Conectar a SQLite
    sqlite_conn = sqlite3.connect('db.sqlite3')
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cursor = sqlite_conn.cursor()
    
    print("🚀 Migrando datos esenciales de SQLite a PostgreSQL...")
    
    # Obtener o crear business principal
    business = Business.objects.first()
    if not business:
        business = Business.objects.create(
            name="Sancho Distribuidora",
            code="SANCHO",
            description="Empresa principal",
            is_active=True
        )
        print(f"✅ Business creado: {business.name}")
    else:
        print(f"✅ Usando business existente: {business.name}")
    
    # 1. Migrar Brands (simplificado)
    print("\n🏷️  Migrando Brands...")
    try:
        sqlite_cursor.execute("SELECT * FROM core_brand ORDER BY id LIMIT 50")
        brand_rows = sqlite_cursor.fetchall()
        brands_created = 0
        for row in brand_rows:
            brand, created = Brand.objects.get_or_create(
                name=safe_get(row, 'name'),
                defaults={
                    'business': business,
                    'description': safe_get(row, 'description'),
                    'code': safe_get(row, 'code') or f'BR{row["id"]}',
                    'country': safe_get(row, 'country'),
                    'is_active': True,
                }
            )
            if created:
                brands_created += 1
        print(f"  Brands creadas: {brands_created}")
    except Exception as e:
        print(f"  Error migrando brands: {e}")
    
    # 2. Migrar Categories (simplificado)
    print("\n📂 Migrando Categories...")
    try:
        sqlite_cursor.execute("SELECT * FROM core_category ORDER BY id LIMIT 50")
        category_rows = sqlite_cursor.fetchall()
        categories_created = 0
        for row in category_rows:
            category, created = Category.objects.get_or_create(
                name=safe_get(row, 'name'),
                defaults={
                    'business': business,
                    'description': safe_get(row, 'description'),
                    'code': safe_get(row, 'code') or f'CAT{row["id"]}',
                    'is_active': True,
                }
            )
            if created:
                categories_created += 1
        print(f"  Categories creadas: {categories_created}")
    except Exception as e:
        print(f"  Error migrando categories: {e}")
    
    # 3. Migrar Warehouses (simplificado)
    print("\n🏪 Migrando Warehouses...")
    try:
        sqlite_cursor.execute("SELECT * FROM core_warehouse")
        warehouse_rows = sqlite_cursor.fetchall()
        warehouses_created = 0
        for row in warehouse_rows:
            warehouse, created = Warehouse.objects.get_or_create(
                name=safe_get(row, 'name'),
                defaults={
                    'business': business,
                    'description': safe_get(row, 'description'),
                    'code': safe_get(row, 'code') or f'WH{row["id"]}',
                    'address': safe_get(row, 'address'),
                    'is_active': True,
                }
            )
            if created:
                warehouses_created += 1
        print(f"  Warehouses creadas: {warehouses_created}")
    except Exception as e:
        print(f"  Error migrando warehouses: {e}")
    
    # 4. Migrar Suppliers (simplificado)
    print("\n🏭 Migrando Suppliers...")
    try:
        sqlite_cursor.execute("SELECT * FROM core_supplier")
        supplier_rows = sqlite_cursor.fetchall()
        suppliers_created = 0
        for row in supplier_rows:
            supplier, created = Supplier.objects.get_or_create(
                name=safe_get(row, 'name'),
                defaults={
                    'business': business,
                    'tax_id': safe_get(row, 'ruc'),
                    'address': safe_get(row, 'address'),
                    'email': safe_get(row, 'email'),
                    'contact_person': safe_get(row, 'contact_person'),
                    'credit_limit': float(safe_get(row, 'credit_limit', 0)),
                    'is_active': True,
                }
            )
            if created:
                suppliers_created += 1
        print(f"  Suppliers creadas: {suppliers_created}")
    except Exception as e:
        print(f"  Error migrando suppliers: {e}")
    
    # 5. Migrar algunos Products (sample)
    print("\n📦 Migrando Products (muestra de 100)...")
    try:
        sqlite_cursor.execute("SELECT * FROM core_product ORDER BY id LIMIT 100")
        product_rows = sqlite_cursor.fetchall()
        products_created = 0
        
        for row in product_rows:
            try:
                # Obtener brand y category si existen
                brand = None
                brand_id = safe_get(row, 'brand_id')
                if brand_id:
                    sqlite_cursor.execute("SELECT name FROM core_brand WHERE id = ?", (brand_id,))
                    brand_row = sqlite_cursor.fetchone()
                    if brand_row:
                        brand = Brand.objects.filter(name=brand_row['name']).first()
                
                category = None
                category_id = safe_get(row, 'category_id')
                if category_id:
                    sqlite_cursor.execute("SELECT name FROM core_category WHERE id = ?", (category_id,))
                    category_row = sqlite_cursor.fetchone()
                    if category_row:
                        category = Category.objects.filter(name=category_row['name']).first()
                
                product, created = Product.objects.get_or_create(
                    sku=safe_get(row, 'sku') or f'SKU{row["id"]}',
                    defaults={
                        'business': business,
                        'name': safe_get(row, 'name'),
                        'description': safe_get(row, 'description'),
                        'barcode': safe_get(row, 'barcode'),
                        'brand': brand,
                        'category': category,
                        'minimum_stock': 0,
                        'maximum_stock': 100,
                        'is_active': True,
                    }
                )
                
                if created:
                    products_created += 1
                    # Crear variante por defecto
                    ProductVariant.objects.get_or_create(
                        product=product,
                        variant_type='default',
                        defaults={
                            'variant_value': 'Standard',
                            'sku': product.sku,
                            'barcode': product.barcode,
                            'cost_price': 0,
                            'selling_price': 0,
                            'is_active': True,
                        }
                    )
                    
            except Exception as e:
                print(f"    Error migrando product {safe_get(row, 'id')}: {e}")
        
        print(f"  Products creados: {products_created}")
    except Exception as e:
        print(f"  Error en products migration: {e}")
    
    # 6. Migrar Users (preservando contraseñas)
    print("\n👤 Migrando Users...")
    try:
        sqlite_cursor.execute("SELECT * FROM core_user")
        user_rows = sqlite_cursor.fetchall()
        users_migrated = 0
        for row in user_rows:
            try:
                email = safe_get(row, 'email')
                if not email:
                    continue
                    
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        'first_name': safe_get(row, 'first_name'),
                        'last_name': safe_get(row, 'last_name'),
                        'is_active': bool(safe_get(row, 'is_active', True)),
                        'is_staff': bool(safe_get(row, 'is_staff', False)),
                        'is_superuser': bool(safe_get(row, 'is_superuser', False)),
                    }
                )
                
                # Preservar contraseña hasheada original
                password = safe_get(row, 'password')
                if password and created:
                    user.password = password
                    user.save(update_fields=['password'])
                    users_migrated += 1
                
            except Exception as e:
                print(f"  Error migrando user {safe_get(row, 'email')}: {e}")
        
        print(f"  Users migrados: {users_migrated}")
    except Exception as e:
        print(f"  Error en users migration: {e}")
    
    # Cerrar conexión SQLite
    sqlite_conn.close()
    
    print("\n✅ Migración esencial completada!")
    print(f"📊 Resumen final:")
    print(f"  - Business: {Business.objects.count()}")
    print(f"  - Brands: {Brand.objects.count()}")
    print(f"  - Categories: {Category.objects.count()}")
    print(f"  - Warehouses: {Warehouse.objects.count()}")
    print(f"  - Suppliers: {Supplier.objects.count()}")
    print(f"  - Products: {Product.objects.count()}")
    print(f"  - ProductVariants: {ProductVariant.objects.count()}")
    print(f"  - Users: {User.objects.count()}")

if __name__ == '__main__':
    migrate_essential_data()
