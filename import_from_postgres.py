#!/usr/bin/env python3
"""
Script para importar datos desde PostgreSQL a SQLite
"""
import os
import sys
import django
import psycopg2

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.models import Business, Brand, Category, Product, ProductVariant, User

def import_from_postgres():
    print("🔄 Conectando a PostgreSQL...")
    
    # Conectar directamente a PostgreSQL
    try:
        pg_conn = psycopg2.connect(
            host="172.17.0.1",  # IP del host Docker
            port=5432,
            database="maestro",
            user="maestro",
            password="maestro"
        )
        pg_cursor = pg_conn.cursor()
        print("✅ Conectado a PostgreSQL")
    except Exception as e:
        print(f"❌ Error conectando a PostgreSQL: {e}")
        return

    try:
        # Obtener o crear business en SQLite
        business = Business.objects.first()
        if not business:
            business = Business.objects.create(
                name="Sancho Distribuidora",
                code="SANCHO", 
                description="Empresa principal",
                is_active=True
            )
        print(f"✅ Business SQLite: {business.name}")

        # 1. Importar usuarios
        print("\n👥 Importando usuarios desde PostgreSQL...")
        pg_cursor.execute("SELECT email, first_name, last_name, is_staff, is_superuser, password FROM core_user WHERE is_active = true")
        users_data = pg_cursor.fetchall()
        
        users_imported = 0
        for email, first_name, last_name, is_staff, is_superuser, password in users_data:
            if email and '@' in email:
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        'first_name': first_name or '',
                        'last_name': last_name or '',
                        'is_staff': bool(is_staff),
                        'is_superuser': bool(is_superuser),
                        'is_active': True,
                        'password': password or ''
                    }
                )
                if created:
                    users_imported += 1
        print(f"  ✅ Usuarios importados: {users_imported}")

        # 2. Importar marcas
        print("\n🏷️ Importando marcas desde PostgreSQL...")
        pg_cursor.execute("SELECT name, description, code, is_active FROM core_brand WHERE is_active = true LIMIT 50")
        brands_data = pg_cursor.fetchall()
        
        brands_imported = 0
        for name, description, code, is_active in brands_data:
            if name:
                brand, created = Brand.objects.get_or_create(
                    name=name,
                    defaults={
                        'business': business,
                        'description': description or f'Marca {name}',
                        'code': code or f'BR_{name[:10].upper()}',
                        'is_active': bool(is_active)
                    }
                )
                if created:
                    brands_imported += 1
        print(f"  ✅ Marcas importadas: {brands_imported}")

        # 3. Importar categorías
        print("\n📂 Importando categorías desde PostgreSQL...")
        pg_cursor.execute("SELECT name, description, code, is_active FROM core_category WHERE is_active = true LIMIT 50")
        categories_data = pg_cursor.fetchall()
        
        categories_imported = 0
        for name, description, code, is_active in categories_data:
            if name:
                category, created = Category.objects.get_or_create(
                    name=name,
                    defaults={
                        'business': business,
                        'description': description or f'Categoría {name}',
                        'code': code or f'CAT_{name[:10].upper()}',
                        'is_active': bool(is_active)
                    }
                )
                if created:
                    categories_imported += 1
        print(f"  ✅ Categorías importadas: {categories_imported}")

        # 4. Importar productos
        print("\n📦 Importando productos desde PostgreSQL...")
        pg_cursor.execute("""
            SELECT p.sku, p.name, p.description, p.barcode, 
                   p.minimum_stock, p.maximum_stock, p.is_active,
                   b.name as brand_name, c.name as category_name
            FROM core_product p
            LEFT JOIN core_brand b ON p.brand_id = b.id
            LEFT JOIN core_category c ON p.category_id = c.id
            WHERE p.is_active = true 
            LIMIT 100
        """)
        products_data = pg_cursor.fetchall()
        
        products_imported = 0
        for sku, name, description, barcode, min_stock, max_stock, is_active, brand_name, category_name in products_data:
            if sku and name:
                # Buscar marca y categoría en SQLite
                brand = Brand.objects.filter(name=brand_name).first() if brand_name else None
                category = Category.objects.filter(name=category_name).first() if category_name else None
                
                product, created = Product.objects.get_or_create(
                    sku=sku,
                    defaults={
                        'business': business,
                        'name': name[:200],  # Limitar longitud
                        'description': description or name,
                        'barcode': barcode or '',
                        'brand': brand,
                        'category': category,
                        'minimum_stock': min_stock or 0,
                        'maximum_stock': max_stock or 100,
                        'is_active': bool(is_active)
                    }
                )
                if created:
                    products_imported += 1
                    if products_imported % 20 == 0:
                        print(f"    📦 Importados {products_imported} productos...")
        
        print(f"  ✅ Productos importados: {products_imported}")

    except Exception as e:
        print(f"❌ Error durante la importación: {e}")
    finally:
        pg_conn.close()
        print("🔒 Conexión PostgreSQL cerrada")

    # Mostrar resumen final
    print(f"\n📊 RESUMEN FINAL:")
    print(f"  👥 Usuarios: {User.objects.count()}")
    print(f"  🏢 Business: {Business.objects.count()}")
    print(f"  🏷️ Marcas: {Brand.objects.count()}")
    print(f"  📂 Categorías: {Category.objects.count()}")
    print(f"  📦 Productos: {Product.objects.count()}")

if __name__ == '__main__':
    import_from_postgres()
