#!/usr/bin/env python3
"""
Script para importar TODOS los 2595 productos desde PostgreSQL
"""
import os
import sys
import django
import subprocess
from datetime import datetime

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.models import Product, Brand, Category, Business

def run_postgres_query(query):
    
    """Ejecuta una query en PostgreSQL usando docker exec con mejor manejo de encoding"""
    try:
        cmd = [
            'docker', 'exec', '-i', 'sancho_db_v2',
            'psql', '-U', 'maestro', '-d', 'maestro', 
            '-t', '-A', '-F', '|', '-c', query
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', check=True)
        if result.stdout:
            return result.stdout.strip().split('\n')
        return []
    except subprocess.CalledProcessError as e:
        print(f"❌ Error ejecutando query: {e}")
        return []
    except UnicodeDecodeError as e:
        print(f"❌ Error de codificación: {e}")
        return []

def import_all_products():
    print("🔄 IMPORTANDO TODOS LOS PRODUCTOS DESDE POSTGRESQL")
    print("=" * 60)
    
    # Obtener business principal
    business = Business.objects.first()
    if not business:
        print("❌ No hay business disponible")
        return
    
    print(f"📌 Empresa: {business.name}")
    
    # Primero eliminar productos existentes para evitar duplicados
    existing_count = Product.objects.count()
    print(f"🗑️ Eliminando {existing_count} productos existentes...")
    Product.objects.all().delete()
    
    # Importar TODOS los productos sin límite
    print("\n📦 Importando TODOS los productos desde PostgreSQL...")
    print("⚠️ Esto puede tomar varios minutos...")
    
    # Query para obtener TODOS los productos
    products_query = """
        SELECT p.sku, p.name, p.description, p.minimum_stock, p.maximum_stock,
               p.brand_id, p.category_id, p.business_id, p.is_active,
               b.name as brand_name, c.name as category_name
        FROM core_product p
        LEFT JOIN core_brand b ON p.brand_id = b.id
        LEFT JOIN core_category c ON p.category_id = c.id
        WHERE p.is_active = true;
    """
    
    print("🔍 Ejecutando query para obtener todos los productos...")
    products_data = run_postgres_query(products_query)
    
    if not products_data or len(products_data) == 0:
        print("❌ No se obtuvieron productos de PostgreSQL")
        return
        
    print(f"📊 Se obtuvieron {len(products_data)} productos para procesar")
    
    products_imported = 0
    products_skipped = 0
    
    for i, row in enumerate(products_data, 1):
        if row and '|' in row:
            parts = row.split('|')
            if len(parts) >= 2 and parts[0] and parts[1]:
                try:
                    sku = parts[0].strip()
                    name = parts[1][:200].strip()  # Limitar longitud
                    description = parts[2].strip() if len(parts) > 2 and parts[2] else name
                    min_stock = int(parts[3]) if len(parts) > 3 and parts[3] and parts[3].isdigit() else 0
                    max_stock = int(parts[4]) if len(parts) > 4 and parts[4] and parts[4].isdigit() else 100
                    is_active = parts[8].lower() == 't' if len(parts) > 8 else True
                    brand_name = parts[9].strip() if len(parts) > 9 and parts[9] else None
                    category_name = parts[10].strip() if len(parts) > 10 and parts[10] else None
                    
                    # Validar que SKU no esté vacío
                    if not sku:
                        products_skipped += 1
                        continue
                    
                    # Buscar marca y categoría en SQLite
                    brand = None
                    category = None
                    
                    if brand_name:
                        brand = Brand.objects.filter(name=brand_name).first()
                    
                    if category_name:
                        category = Category.objects.filter(name=category_name).first()
                    
                    # Crear el producto
                    product, created = Product.objects.get_or_create(
                        sku=sku,
                        defaults={
                            'business': business,
                            'name': name,
                            'description': description,
                            'brand': brand,
                            'category': category,
                            'minimum_stock': min_stock,
                            'maximum_stock': max_stock,
                            'is_active': is_active
                        }
                    )
                    
                    if created:
                        products_imported += 1
                        
                        # Mostrar progreso cada 100 productos
                        if products_imported % 100 == 0:
                            print(f"    📦 {products_imported} productos importados... ({i}/{len(products_data)})")
                            
                except Exception as e:
                    print(f"❌ Error procesando producto {i}: {e}")
                    products_skipped += 1
            else:
                products_skipped += 1
    
    print(f"\n✅ IMPORTACIÓN COMPLETADA:")
    print(f"  📦 Productos importados: {products_imported}")
    print(f"  ⚠️ Productos omitidos: {products_skipped}")
    print(f"  📊 Total en base de datos: {Product.objects.count()}")
    
    # Verificar algunos productos importados
    print(f"\n🔍 VERIFICACIÓN - Primeros 5 productos:")
    for i, product in enumerate(Product.objects.all()[:5], 1):
        brand_name = product.brand.name if product.brand else 'Sin marca'
        category_name = product.category.name if product.category else 'Sin categoría'
        print(f"  {i}. {product.sku}: {product.name[:60]}")
        print(f"     Marca: {brand_name} | Categoría: {category_name}")
    
    print(f"\n🎉 ¡IMPORTACIÓN DE TODOS LOS PRODUCTOS COMPLETADA!")
    print(f"📊 Total productos en SQLite: {Product.objects.count()}/2595 esperados")

if __name__ == '__main__':
    start_time = datetime.now()
    import_all_products()
    end_time = datetime.now()
    duration = end_time - start_time
    print(f"\n⏱️ Tiempo total: {duration}")
