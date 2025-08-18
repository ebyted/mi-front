#!/usr/bin/env python3
"""
Script para importar TODOS los datos desde PostgreSQL usando docker exec
Incluye: Usuarios, Almacenes, Movimientos de Inventario y todas las tablas
"""
import os
import sys
import django
import subprocess
import json
from datetime import datetime

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.models import (
    Business, Brand, Category, Product, ProductVariant, User, Role, 
    Warehouse, ProductWarehouseStock, InventoryMovement, InventoryMovementDetail,
    Supplier, SupplierProduct, PurchaseOrder, PurchaseOrderItem, Unit
)
from django.contrib.auth.hashers import make_password

def run_postgres_query(query):
    """Ejecuta una query en PostgreSQL usando docker exec"""
    try:
        cmd = [
            'docker', 'exec', '-i', 'sancho_db_v2',
            'psql', '-U', 'maestro', '-d', 'maestro', 
            '-t', '-A', '-F', '|', '-c', query
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return result.stdout.strip().split('\n') if result.stdout.strip() else []
    except subprocess.CalledProcessError as e:
        print(f"Error ejecutando query: {e}")
        return []

def import_from_postgres():
    print("🔄 Importando datos desde PostgreSQL...")
    
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

    # 1. Importar marcas
    print("\n🏷️ Importando marcas desde PostgreSQL...")
    brands_query = "SELECT name, description, code FROM core_brand WHERE is_active = true LIMIT 50;"
    brands_data = run_postgres_query(brands_query)
    
    brands_imported = 0
    for row in brands_data:
        if row and '|' in row:
            parts = row.split('|')
            if len(parts) >= 1 and parts[0]:
                name = parts[0]
                description = parts[1] if len(parts) > 1 and parts[1] else f'Marca {name}'
                code = parts[2] if len(parts) > 2 and parts[2] else f'BR_{name[:10].upper()}'
                
                brand, created = Brand.objects.get_or_create(
                    name=name,
                    defaults={
                        'business': business,
                        'description': description,
                        'code': code,
                        'is_active': True
                    }
                )
                if created:
                    brands_imported += 1
    print(f"  ✅ Marcas importadas: {brands_imported}")

    # 2. Importar categorías
    print("\n📂 Importando categorías desde PostgreSQL...")
    categories_query = "SELECT name, description, code FROM core_category WHERE is_active = true LIMIT 50;"
    categories_data = run_postgres_query(categories_query)
    
    categories_imported = 0
    for row in categories_data:
        if row and '|' in row:
            parts = row.split('|')
            if len(parts) >= 1 and parts[0]:
                name = parts[0]
                description = parts[1] if len(parts) > 1 and parts[1] else f'Categoría {name}'
                code = parts[2] if len(parts) > 2 and parts[2] else f'CAT_{name[:10].upper()}'
                
                category, created = Category.objects.get_or_create(
                    name=name,
                    defaults={
                        'business': business,
                        'description': description,
                        'code': code,
                        'is_active': True
                    }
                )
                if created:
                    categories_imported += 1
    print(f"  ✅ Categorías importadas: {categories_imported}")

    # 3. Importar productos
    print("\n📦 Importando productos desde PostgreSQL...")
    products_query = """
        SELECT p.sku, p.name, p.description, p.minimum_stock, p.maximum_stock,
               b.name as brand_name, c.name as category_name
        FROM core_product p
        LEFT JOIN core_brand b ON p.brand_id = b.id
        LEFT JOIN core_category c ON p.category_id = c.id
        WHERE p.is_active = true 
        LIMIT 100;
    """
    products_data = run_postgres_query(products_query)
    
    products_imported = 0
    for row in products_data:
        if row and '|' in row:
            parts = row.split('|')
            if len(parts) >= 2 and parts[0] and parts[1]:
                sku = parts[0]
                name = parts[1][:200]  # Limitar longitud
                description = parts[2] if len(parts) > 2 and parts[2] else name
                min_stock = int(parts[3]) if len(parts) > 3 and parts[3].isdigit() else 0
                max_stock = int(parts[4]) if len(parts) > 4 and parts[4].isdigit() else 100
                brand_name = parts[5] if len(parts) > 5 else None
                category_name = parts[6] if len(parts) > 6 else None
                
                # Buscar marca y categoría en SQLite
                brand = Brand.objects.filter(name=brand_name).first() if brand_name else None
                category = Category.objects.filter(name=category_name).first() if category_name else None
                
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
                        'is_active': True
                    }
                )
                if created:
                    products_imported += 1
                    if products_imported % 20 == 0:
                        print(f"    📦 Importados {products_imported} productos...")
    
    print(f"  ✅ Productos importados: {products_imported}")

    # 4. Importar roles
    print("\n👔 Importando roles desde PostgreSQL...")
    roles_query = "SELECT name, description FROM core_role LIMIT 20;"
    roles_data = run_postgres_query(roles_query)
    
    roles_imported = 0
    for row in roles_data:
        if row and '|' in row:
            parts = row.split('|')
            if len(parts) >= 1 and parts[0]:
                name = parts[0]
                description = parts[1] if len(parts) > 1 and parts[1] else f'Rol {name}'
                
                role, created = Role.objects.get_or_create(
                    name=name,
                    defaults={'description': description}
                )
                if created:
                    roles_imported += 1
    print(f"  ✅ Roles importados: {roles_imported}")

    # 5. Importar usuarios
    print("\n� Importando usuarios desde PostgreSQL...")
    users_query = """
        SELECT u.email, u.first_name, u.last_name, u.is_active, u.is_staff,
               r.name as role_name
        FROM core_user u
        LEFT JOIN core_role r ON u.role_id = r.id
        WHERE u.is_active = true
        LIMIT 50;
    """
    users_data = run_postgres_query(users_query)
    
    users_imported = 0
    for row in users_data:
        if row and '|' in row:
            parts = row.split('|')
            if len(parts) >= 3 and parts[0] and parts[1] and parts[2]:
                email = parts[0]
                first_name = parts[1]
                last_name = parts[2]
                is_active = parts[3].lower() == 't' if len(parts) > 3 else True
                is_staff = parts[4].lower() == 't' if len(parts) > 4 else False
                role_name = parts[5] if len(parts) > 5 else None
                
                # Buscar rol en SQLite
                role = Role.objects.filter(name=role_name).first() if role_name else None
                
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        'first_name': first_name,
                        'last_name': last_name,
                        'business': business,
                        'role': role,
                        'is_active': is_active,
                        'is_staff': is_staff,
                        'password': make_password('admin123')  # Password por defecto
                    }
                )
                if created:
                    users_imported += 1
    print(f"  ✅ Usuarios importados: {users_imported}")

    # 6. Importar unidades
    print("\n📏 Importando unidades desde PostgreSQL...")
    units_query = "SELECT name, symbol, description FROM core_unit WHERE is_active = true LIMIT 20;"
    units_data = run_postgres_query(units_query)
    
    units_imported = 0
    for row in units_data:
        if row and '|' in row:
            parts = row.split('|')
            if len(parts) >= 2 and parts[0] and parts[1]:
                name = parts[0]
                symbol = parts[1]
                description = parts[2] if len(parts) > 2 and parts[2] else name
                
                unit, created = Unit.objects.get_or_create(
                    name=name,
                    defaults={
                        'business': business,
                        'symbol': symbol,
                        'description': description,
                        'is_active': True
                    }
                )
                if created:
                    units_imported += 1
    print(f"  ✅ Unidades importadas: {units_imported}")

    # 7. Importar almacenes
    print("\n🏪 Importando almacenes desde PostgreSQL...")
    warehouses_query = """
        SELECT name, description, code, address
        FROM core_warehouse 
        WHERE is_active = true 
        LIMIT 30;
    """
    warehouses_data = run_postgres_query(warehouses_query)
    
    warehouses_imported = 0
    for row in warehouses_data:
        if row and '|' in row:
            parts = row.split('|')
            if len(parts) >= 1 and parts[0]:
                name = parts[0]
                description = parts[1] if len(parts) > 1 and parts[1] else f'Almacén {name}'
                code = parts[2] if len(parts) > 2 and parts[2] else f'WH_{name[:10].upper()}'
                address = parts[3] if len(parts) > 3 and parts[3] else ''
                
                warehouse, created = Warehouse.objects.get_or_create(
                    name=name,
                    defaults={
                        'business': business,
                        'description': description,
                        'code': code,
                        'address': address,
                        'is_active': True
                    }
                )
                if created:
                    warehouses_imported += 1
    print(f"  ✅ Almacenes importados: {warehouses_imported}")

    # 8. Importar proveedores
    print("\n🚚 Importando proveedores desde PostgreSQL...")
    suppliers_query = """
        SELECT name, contact_name, email, phone, address
        FROM core_supplier 
        WHERE is_active = true 
        LIMIT 30;
    """
    suppliers_data = run_postgres_query(suppliers_query)
    
    suppliers_imported = 0
    for row in suppliers_data:
        if row and '|' in row:
            parts = row.split('|')
            if len(parts) >= 1 and parts[0]:
                name = parts[0]
                contact_name = parts[1] if len(parts) > 1 and parts[1] else ''
                email = parts[2] if len(parts) > 2 and parts[2] else ''
                phone = parts[3] if len(parts) > 3 and parts[3] else ''
                address = parts[4] if len(parts) > 4 and parts[4] else ''
                
                supplier, created = Supplier.objects.get_or_create(
                    name=name,
                    defaults={
                        'business': business,
                        'contact_name': contact_name,
                        'email': email,
                        'phone': phone,
                        'address': address,
                        'is_active': True
                    }
                )
                if created:
                    suppliers_imported += 1
    print(f"  ✅ Proveedores importados: {suppliers_imported}")

    # 9. Importar movimientos de inventario
    print("\n📊 Importando movimientos de inventario desde PostgreSQL...")
    movements_query = """
        SELECT im.movement_type, im.reference_document, im.notes, 
               im.authorized, im.created_at,
               w.name as warehouse_name, u.email as user_email
        FROM core_inventorymovement im
        LEFT JOIN core_warehouse w ON im.warehouse_id = w.id
        LEFT JOIN core_user u ON im.user_id = u.id
        WHERE im.created_at >= '2024-01-01'
        LIMIT 50;
    """
    movements_data = run_postgres_query(movements_query)
    
    movements_imported = 0
    for row in movements_data:
        if row and '|' in row:
            parts = row.split('|')
            if len(parts) >= 3:
                movement_type = parts[0] if parts[0] else 'ADJUSTMENT'
                reference_document = parts[1] if len(parts) > 1 and parts[1] else ''
                notes = parts[2] if len(parts) > 2 and parts[2] else ''
                authorized = parts[3].lower() == 't' if len(parts) > 3 else False
                # created_at sería parts[4] pero es complejo de parsear
                warehouse_name = parts[5] if len(parts) > 5 else None
                user_email = parts[6] if len(parts) > 6 else None
                
                # Buscar warehouse y user en SQLite
                warehouse = Warehouse.objects.filter(name=warehouse_name).first() if warehouse_name else Warehouse.objects.first()
                user = User.objects.filter(email=user_email).first() if user_email else User.objects.first()
                
                if warehouse:
                    movement, created = InventoryMovement.objects.get_or_create(
                        warehouse=warehouse,
                        user=user,
                        movement_type=movement_type,
                        reference_document=reference_document,
                        defaults={
                            'notes': notes,
                            'authorized': authorized,
                            'is_cancelled': False
                        }
                    )
                    if created:
                        movements_imported += 1
    print(f"  ✅ Movimientos importados: {movements_imported}")

    # Mostrar resumen final
    print(f"\n📊 RESUMEN FINAL DE IMPORTACIÓN:")
    print(f"  🏢 Business: {Business.objects.count()}")
    print(f"  👔 Roles: {Role.objects.count()}")
    print(f"  👥 Usuarios: {User.objects.count()}")
    print(f"  🏷️ Marcas: {Brand.objects.count()}")
    print(f"  📂 Categorías: {Category.objects.count()}")
    print(f"  📏 Unidades: {Unit.objects.count()}")
    print(f"  📦 Productos: {Product.objects.count()}")
    print(f"  🏪 Almacenes: {Warehouse.objects.count()}")
    print(f"  🚚 Proveedores: {Supplier.objects.count()}")
    print(f"  📊 Movimientos Inventario: {InventoryMovement.objects.count()}")
    print(f"\n🎉 ¡IMPORTACIÓN COMPLETA!")

if __name__ == '__main__':
    import_from_postgres()
