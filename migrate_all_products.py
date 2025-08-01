#!/usr/bin/env python
import os
import sys
import sqlite3
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.models import *

def safe_get(row, key, default=''):
    """Obtener valor de forma segura de SQLite row"""
    try:
        return row[key] if row[key] is not None else default
    except (KeyError, IndexError):
        return default

def migrate_all_products():
    """Migrar TODOS los productos y variantes de SQLite a PostgreSQL"""
    
    # Conectar a SQLite
    sqlite_conn = sqlite3.connect('db.sqlite3')
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cursor = sqlite_conn.cursor()
    
    print("🚀 Migrando 100% de productos y variantes de SQLite a PostgreSQL...")
    
    # Obtener business por defecto
    try:
        business = Business.objects.get(name="Sancho Distribuidora")
        print(f"✅ Usando business: {business.name}")
    except Business.DoesNotExist:
        business = Business.objects.first()
        print(f"⚠️ Usando business por defecto: {business.name if business else 'None'}")
    
    # Limpiar productos existentes para una migración limpia
    print("🧹 Limpiando productos existentes...")
    ProductVariant.objects.all().delete()
    Product.objects.all().delete()
    print("✅ Productos limpiados")
    
    # 1. Migrar TODOS los productos
    print("\n📦 Migrando TODOS los productos...")
    try:
        sqlite_cursor.execute("SELECT COUNT(*) as total FROM core_product")
        total_products = sqlite_cursor.fetchone()['total']
        print(f"📊 Total productos en SQLite: {total_products}")
        
        sqlite_cursor.execute("SELECT * FROM core_product ORDER BY id")
        product_rows = sqlite_cursor.fetchall()
        
        products_created = 0
        products_errors = 0
        
        for i, row in enumerate(product_rows):
            try:
                # Obtener brand y category con manejo de errores
                brand = None
                brand_id = safe_get(row, 'brand_id')
                if brand_id:
                    try:
                        brand = Brand.objects.get(id=brand_id)
                    except Brand.DoesNotExist:
                        # Crear brand si no existe
                        brand = Brand.objects.create(
                            id=brand_id,
                            name=f"Brand {brand_id}",
                            code=f"BR{brand_id}",
                            business=business
                        )
                
                category = None
                category_id = safe_get(row, 'category_id')
                if category_id:
                    try:
                        category = Category.objects.get(id=category_id)
                    except Category.DoesNotExist:
                        # Crear category si no existe
                        category = Category.objects.create(
                            id=category_id,
                            name=f"Category {category_id}",
                            code=f"CAT{category_id}",
                            business=business
                        )
                
                # Crear producto
                product, created = Product.objects.get_or_create(
                    id=safe_get(row, 'id'),
                    defaults={
                        'name': safe_get(row, 'name') or f'Product {row["id"]}',
                        'description': safe_get(row, 'description'),
                        'sku': safe_get(row, 'sku') or f'SKU{row["id"]}',
                        'barcode': safe_get(row, 'barcode'),
                        'brand': brand,
                        'category': category,
                        'business': business,
                        'is_active': bool(safe_get(row, 'is_active', True)),
                    }
                )
                
                if created:
                    products_created += 1
                
                # Progress indicator cada 100 productos
                if (i + 1) % 100 == 0:
                    print(f"  📈 Progreso: {i+1}/{total_products} productos procesados")
                    
            except Exception as e:
                products_errors += 1
                print(f"  ❌ Error migrando producto {safe_get(row, 'id')}: {e}")
        
        print(f"✅ Productos migrados: {products_created}")
        print(f"❌ Errores: {products_errors}")
        print(f"📊 Total en PostgreSQL: {Product.objects.count()}")
        
    except Exception as e:
        print(f"❌ Error en migración de productos: {e}")
    
    # 2. Migrar TODAS las variantes
    print("\n🔀 Migrando TODAS las variantes...")
    try:
        sqlite_cursor.execute("SELECT COUNT(*) as total FROM core_productvariant")
        total_variants = sqlite_cursor.fetchone()['total']
        print(f"📊 Total variantes en SQLite: {total_variants}")
        
        sqlite_cursor.execute("SELECT * FROM core_productvariant ORDER BY id")
        variant_rows = sqlite_cursor.fetchall()
        
        variants_created = 0
        variants_errors = 0
        
        for i, row in enumerate(variant_rows):
            try:
                product_id = safe_get(row, 'product_id')
                if not product_id:
                    variants_errors += 1
                    continue
                
                try:
                    product = Product.objects.get(id=product_id)
                except Product.DoesNotExist:
                    print(f"  ⚠️ Producto {product_id} no encontrado para variante {safe_get(row, 'id')}")
                    variants_errors += 1
                    continue
                
                # Crear variante SIN el campo variant_type que no existe
                variant, created = ProductVariant.objects.get_or_create(
                    id=safe_get(row, 'id'),
                    defaults={
                        'product': product,
                        'name': safe_get(row, 'name') or f'Variant {row["id"]}',
                        'sku': safe_get(row, 'sku') or f'VAR{row["id"]}',
                        'barcode': safe_get(row, 'barcode'),
                        'cost_price': float(safe_get(row, 'cost_price', 0)),
                        'purchase_price': float(safe_get(row, 'purchase_price', 0)),
                        'sale_price': float(safe_get(row, 'sale_price', 0)),
                        'unit': safe_get(row, 'unit') or 'UNI',
                        'low_stock_threshold': int(safe_get(row, 'low_stock_threshold', 10)),
                        'is_active': bool(safe_get(row, 'is_active', True)),
                    }
                )
                
                if created:
                    variants_created += 1
                
                # Progress indicator cada 100 variantes
                if (i + 1) % 100 == 0:
                    print(f"  📈 Progreso: {i+1}/{total_variants} variantes procesadas")
                    
            except Exception as e:
                variants_errors += 1
                print(f"  ❌ Error migrando variante {safe_get(row, 'id')}: {e}")
        
        print(f"✅ Variantes migradas: {variants_created}")
        print(f"❌ Errores: {variants_errors}")
        print(f"📊 Total en PostgreSQL: {ProductVariant.objects.count()}")
        
    except Exception as e:
        print(f"❌ Error en migración de variantes: {e}")
    
    # Cerrar conexión SQLite
    sqlite_conn.close()
    
    print("\n🎉 ¡Migración completa de productos y variantes finalizada!")
    print(f"📊 RESUMEN FINAL:")
    print(f"  - Productos en PostgreSQL: {Product.objects.count()}")
    print(f"  - Variantes en PostgreSQL: {ProductVariant.objects.count()}")
    print(f"  - Marcas: {Brand.objects.count()}")
    print(f"  - Categorías: {Category.objects.count()}")

if __name__ == '__main__':
    migrate_all_products()
