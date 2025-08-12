#!/usr/bin/env python3
"""
Script para migrar datos de SQLite a PostgreSQL - Versión corregida
"""
import os
import sys
import sqlite3
import django
from django.db import connection
from django.core.management import execute_from_command_line

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.models import (
    Business, Brand, Category, Product, ProductVariant, Warehouse, 
    Supplier, User, SalesOrder, SalesOrderItem, InventoryMovement,
    InventoryMovementDetail, ProductWarehouseStock, Role, MenuOption
)

def safe_get(row, key, default=''):
    """Obtener valor de forma segura de SQLite row"""
    try:
        return row[key] if row[key] is not None else default
    except (KeyError, IndexError):
        return default

def migrate_data_from_sqlite():
    """Migrar datos de SQLite a PostgreSQL"""
    
    # Conectar a SQLite
    sqlite_conn = sqlite3.connect('db.sqlite3')
    sqlite_conn.row_factory = sqlite3.Row  # Para acceso por nombre de columna
    sqlite_cursor = sqlite_conn.cursor()
    
    print("🚀 Iniciando migración de datos de SQLite a PostgreSQL...")
    
    # 1. Migrar Business
    print("\n📊 Migrando Business...")
    try:
        sqlite_cursor.execute("SELECT * FROM core_business")
        business_rows = sqlite_cursor.fetchall()
        for row in business_rows:
            business, created = Business.objects.get_or_create(
                id=safe_get(row, 'id'),
                defaults={
                    'name': safe_get(row, 'company_name') or safe_get(row, 'name') or f'Business {row["id"]}',
                    'description': safe_get(row, 'description'),
                    'code': safe_get(row, 'code') or f'BUS{row["id"]}',
                    'tax_id': safe_get(row, 'ruc'),
                    'address': safe_get(row, 'address'),
                    'phone': safe_get(row, 'phone'),
                    'email': safe_get(row, 'email'),
                    'is_active': True,
                }
            )
            print(f"  Business: {'Created' if created else 'Updated'} - {business.name}")
    except Exception as e:
        print(f"  Error migrating business: {e}")
    
    # 2. Migrar Roles
    print("\n👥 Migrando Roles...")
    try:
        sqlite_cursor.execute("SELECT * FROM core_role")
        role_rows = sqlite_cursor.fetchall()
        for row in role_rows:
            role, created = Role.objects.get_or_create(
                id=safe_get(row, 'id'),
                defaults={
                    'name': safe_get(row, 'name'),
                    'description': safe_get(row, 'description'),
                    'is_active': bool(safe_get(row, 'is_active', True)),
                }
            )
            print(f"  Role: {'Created' if created else 'Updated'} - {role.name}")
    except Exception as e:
        print(f"  Error migrating roles: {e}")
    
    # 3. Migrar Brands
    print("\n🏷️  Migrando Brands...")
    try:
        sqlite_cursor.execute("SELECT * FROM core_brand")
        brand_rows = sqlite_cursor.fetchall()
        for row in brand_rows:
            brand, created = Brand.objects.get_or_create(
                id=safe_get(row, 'id'),
                defaults={
                    'name': safe_get(row, 'name'),
                    'description': safe_get(row, 'description'),
                    'code': safe_get(row, 'code') or f'BR{row["id"]}',
                    'country': safe_get(row, 'country'),
                    'website': safe_get(row, 'website'),
                    'is_active': bool(safe_get(row, 'is_active', True)),
                }
            )
            if created:
                print(f"  Brand created: {brand.name}")
        print(f"  Total brands: {Brand.objects.count()}")
    except Exception as e:
        print(f"  Error migrating brands: {e}")
    
    # 4. Migrar Categories
    print("\n📂 Migrando Categories...")
    try:
        sqlite_cursor.execute("SELECT * FROM core_category")
        category_rows = sqlite_cursor.fetchall()
        for row in category_rows:
            category, created = Category.objects.get_or_create(
                id=safe_get(row, 'id'),
                defaults={
                    'name': safe_get(row, 'name'),
                    'description': safe_get(row, 'description'),
                    'code': safe_get(row, 'code') or f'CAT{row["id"]}',
                    'is_active': bool(safe_get(row, 'is_active', True)),
                }
            )
            if created:
                print(f"  Category created: {category.name}")
        print(f"  Total categories: {Category.objects.count()}")
    except Exception as e:
        print(f"  Error migrating categories: {e}")
    
    # 5. Migrar Warehouses
    print("\n🏪 Migrando Warehouses...")
    try:
        sqlite_cursor.execute("SELECT * FROM core_warehouse")
        warehouse_rows = sqlite_cursor.fetchall()
        for row in warehouse_rows:
            warehouse, created = Warehouse.objects.get_or_create(
                id=safe_get(row, 'id'),
                defaults={
                    'name': safe_get(row, 'name'),
                    'description': safe_get(row, 'description'),
                    'code': safe_get(row, 'code') or f'WH{row["id"]}',
                    'address': safe_get(row, 'address'),
                    'phone': safe_get(row, 'phone'),
                    'is_active': bool(safe_get(row, 'is_active', True)),
                }
            )
            print(f"  Warehouse: {'Created' if created else 'Updated'} - {warehouse.name}")
    except Exception as e:
        print(f"  Error migrating warehouses: {e}")
    
    # 6. Migrar Suppliers
    print("\n🏭 Migrando Suppliers...")
    try:
        sqlite_cursor.execute("SELECT * FROM core_supplier")
        supplier_rows = sqlite_cursor.fetchall()
        for row in supplier_rows:
            supplier, created = Supplier.objects.get_or_create(
                id=safe_get(row, 'id'),
                defaults={
                    'name': safe_get(row, 'name'),
                    'code': safe_get(row, 'code') or f'SUP{row["id"]}',
                    'tax_id': safe_get(row, 'ruc'),
                    'address': safe_get(row, 'address'),
                    'phone': safe_get(row, 'phone'),
                    'email': safe_get(row, 'email'),
                    'contact_person': safe_get(row, 'contact_person'),
                    'credit_limit': float(safe_get(row, 'credit_limit', 0)),
                    'credit_days': int(safe_get(row, 'credit_days', 0)),
                    'is_active': bool(safe_get(row, 'is_active', True)),
                }
            )
            print(f"  Supplier: {'Created' if created else 'Updated'} - {supplier.name}")
    except Exception as e:
        print(f"  Error migrating suppliers: {e}")
    
    # 7. Migrar Products
    print("\n📦 Migrando Products...")
    try:
        sqlite_cursor.execute("SELECT * FROM core_product ORDER BY id")
        product_rows = sqlite_cursor.fetchall()
        
        for i, row in enumerate(product_rows):
            try:
                # Obtener brand y category
                brand = None
                brand_id = safe_get(row, 'brand_id')
                if brand_id:
                    try:
                        brand = Brand.objects.get(id=brand_id)
                    except Brand.DoesNotExist:
                        pass
                
                category = None
                category_id = safe_get(row, 'category_id')
                if category_id:
                    try:
                        category = Category.objects.get(id=category_id)
                    except Category.DoesNotExist:
                        pass
                
                product, created = Product.objects.get_or_create(
                    id=safe_get(row, 'id'),
                    defaults={
                        'name': safe_get(row, 'name'),
                        'description': safe_get(row, 'description'),
                        'sku': safe_get(row, 'sku') or f'SKU{row["id"]}',
                        'barcode': safe_get(row, 'barcode'),
                        'brand': brand,
                        'category': category,
                        'unit': safe_get(row, 'unit') or 'UNI',
                        'weight': float(safe_get(row, 'weight', 0)),
                        'is_active': bool(safe_get(row, 'is_active', True)),
                    }
                )
                
                if i % 500 == 0:  # Progress indicator
                    print(f"  Products processed: {i+1}/{len(product_rows)}")
                    
            except Exception as e:
                print(f"  Error migrating product {safe_get(row, 'id')}: {e}")
        
        print(f"  Total products: {Product.objects.count()}")
    except Exception as e:
        print(f"  Error in products migration: {e}")
    
    # 8. Migrar ProductVariants
    print("\n🔀 Migrando ProductVariants...")
    try:
        sqlite_cursor.execute("SELECT * FROM core_productvariant ORDER BY id")
        variant_rows = sqlite_cursor.fetchall()
        
        for i, row in enumerate(variant_rows):
            try:
                product_id = safe_get(row, 'product_id')
                if not product_id:
                    continue
                    
                product = Product.objects.get(id=product_id)
                
                variant, created = ProductVariant.objects.get_or_create(
                    id=safe_get(row, 'id'),
                    defaults={
                        'product': product,
                        'variant_type': safe_get(row, 'variant_type') or 'default',
                        'variant_value': safe_get(row, 'variant_value'),
                        'sku': safe_get(row, 'sku'),
                        'barcode': safe_get(row, 'barcode'),
                        'cost_price': float(safe_get(row, 'cost_price', 0)),
                        'selling_price': float(safe_get(row, 'selling_price', 0)),
                        'is_active': bool(safe_get(row, 'is_active', True)),
                    }
                )
                
                if i % 500 == 0:  # Progress indicator
                    print(f"  Variants processed: {i+1}/{len(variant_rows)}")
                    
            except Product.DoesNotExist:
                print(f"  Product {product_id} not found for variant {safe_get(row, 'id')}")
            except Exception as e:
                print(f"  Error migrating variant {safe_get(row, 'id')}: {e}")
        
        print(f"  Total variants: {ProductVariant.objects.count()}")
    except Exception as e:
        print(f"  Error in variants migration: {e}")
    
    # 9. Migrar Users (preservando contraseñas hasheadas)
    print("\n👤 Migrando Users...")
    try:
        sqlite_cursor.execute("SELECT * FROM core_user")
        user_rows = sqlite_cursor.fetchall()
        for row in user_rows:
            try:
                email = safe_get(row, 'email')
                if not email:
                    continue
                    
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        # 'username': safe_get(row, 'username') or email,  # Eliminado, solo email
                        'first_name': safe_get(row, 'first_name'),
                        'last_name': safe_get(row, 'last_name'),
                        'is_active': bool(safe_get(row, 'is_active', True)),
                        'is_staff': bool(safe_get(row, 'is_staff', False)),
                        'is_superuser': bool(safe_get(row, 'is_superuser', False)),
                    }
                )
                # Preservar la contraseña hasheada original de SQLite
                password = safe_get(row, 'password')
                if created and password:
                    user.password = password
                    user.save(update_fields=['password'])
                
                print(f"  User: {'Created' if created else 'Updated'} - {user.email}")
            except Exception as e:
                print(f"  Error migrating user {safe_get(row, 'email')}: {e}")
    except Exception as e:
        print(f"  Error in users migration: {e}")
    
    # Cerrar conexión SQLite
    sqlite_conn.close()
    
    print("\n✅ Migración completada!")
    print(f"📊 Resumen:")
    print(f"  - Productos: {Product.objects.count()}")
    print(f"  - Variantes: {ProductVariant.objects.count()}")
    print(f"  - Marcas: {Brand.objects.count()}")
    print(f"  - Categorías: {Category.objects.count()}")
    print(f"  - Almacenes: {Warehouse.objects.count()}")
    print(f"  - Usuarios: {User.objects.count()}")

if __name__ == '__main__':
    migrate_data_from_sqlite()
