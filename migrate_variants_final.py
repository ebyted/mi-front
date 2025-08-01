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

def migrate_variants_final():
    """Migrar TODAS las variantes usando el modelo Unit correcto"""
    
    # Conectar a SQLite
    sqlite_conn = sqlite3.connect('db.sqlite3')
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cursor = sqlite_conn.cursor()
    
    print("🔀 Migración final de variantes...")
    
    # Obtener o crear unidades por defecto usando los campos correctos
    unit_uni, created = Unit.objects.get_or_create(
        symbol='UNI',
        defaults={
            'name': 'Unidad',
            'symbol': 'UNI',
            'unit_type': 'piece',
            'conversion_factor': 1.0,
            'is_active': True
        }
    )
    if created:
        print(f"✅ Unidad creada: {unit_uni.name} ({unit_uni.symbol})")
    
    unit_pza, created = Unit.objects.get_or_create(
        symbol='PZA',
        defaults={
            'name': 'Pieza',
            'symbol': 'PZA',
            'unit_type': 'piece',
            'conversion_factor': 1.0,
            'is_active': True
        }
    )
    if created:
        print(f"✅ Unidad creada: {unit_pza.name} ({unit_pza.symbol})")
    
    unit_ml, created = Unit.objects.get_or_create(
        symbol='ML',
        defaults={
            'name': 'Mililitro',
            'symbol': 'ML',
            'unit_type': 'volume',
            'conversion_factor': 1.0,
            'is_active': True
        }
    )
    if created:
        print(f"✅ Unidad creada: {unit_ml.name} ({unit_ml.symbol})")
    
    # Limpiar variantes existentes
    print("🧹 Limpiando variantes existentes...")
    ProductVariant.objects.all().delete()
    print("✅ Variantes limpiadas")
    
    # Migrar TODAS las variantes
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
                    variants_errors += 1
                    continue
                
                # Determinar la unidad correcta basada en el nombre del producto
                product_name = product.name.upper()
                unit_str = safe_get(row, 'unit', 'UNI').upper()
                
                if 'ML' in product_name or 'MILILITRO' in product_name:
                    unit = unit_ml
                elif unit_str in ['PZA', 'PIEZA'] or 'PZA' in product_name:
                    unit = unit_pza
                else:
                    unit = unit_uni
                
                # Crear variante
                variant, created = ProductVariant.objects.get_or_create(
                    id=safe_get(row, 'id'),
                    defaults={
                        'product': product,
                        'name': safe_get(row, 'name') or product.name,
                        'sku': safe_get(row, 'sku') or f'VAR{row["id"]}',
                        'barcode': safe_get(row, 'barcode'),
                        'cost_price': float(safe_get(row, 'cost_price', 0)),
                        'purchase_price': float(safe_get(row, 'purchase_price', 0)),
                        'sale_price': float(safe_get(row, 'sale_price', 0)),
                        'unit': unit,
                        'low_stock_threshold': int(safe_get(row, 'low_stock_threshold', 10)),
                        'is_active': bool(safe_get(row, 'is_active', True)),
                    }
                )
                
                if created:
                    variants_created += 1
                
                # Progress indicator cada 200 variantes
                if (i + 1) % 200 == 0:
                    print(f"  📈 Progreso: {i+1}/{total_variants} variantes procesadas")
                    
            except Exception as e:
                variants_errors += 1
                if variants_errors <= 5:  # Solo mostrar primeros 5 errores
                    print(f"  ❌ Error migrando variante {safe_get(row, 'id')}: {e}")
        
        print(f"✅ Variantes migradas: {variants_created}")
        print(f"❌ Errores: {variants_errors}")
        print(f"📊 Total en PostgreSQL: {ProductVariant.objects.count()}")
        
    except Exception as e:
        print(f"❌ Error en migración de variantes: {e}")
    
    # Cerrar conexión SQLite
    sqlite_conn.close()
    
    print("\n🎉 ¡MIGRACIÓN COMPLETA FINALIZADA!")
    print(f"📊 RESUMEN FINAL:")
    print(f"  - Productos en PostgreSQL: {Product.objects.count()}")
    print(f"  - Variantes en PostgreSQL: {ProductVariant.objects.count()}")
    print(f"  - Marcas: {Brand.objects.count()}")
    print(f"  - Categorías: {Category.objects.count()}")
    print(f"  - Unidades: {Unit.objects.count()}")
    
    # Mostrar estadísticas por unidad
    print(f"\n📝 Distribución por unidades:")
    for unit in Unit.objects.all():
        count = ProductVariant.objects.filter(unit=unit).count()
        print(f"  - {unit.name} ({unit.symbol}): {count} variantes")
    
    # Mostrar algunas variantes de ejemplo
    print(f"\n📝 Primeras 5 variantes migradas:")
    for variant in ProductVariant.objects.all()[:5]:
        print(f"  - {variant.name[:50]}... (Unit: {variant.unit.symbol}, Precio: ${variant.sale_price})")

if __name__ == '__main__':
    migrate_variants_final()
