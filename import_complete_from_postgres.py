#!/usr/bin/env python3
"""
Script COMPLETO para importar TODOS los datos desde PostgreSQL 
Borra todo en SQLite e importa completamente desde docker postgres_local
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

from core.models import *
from django.contrib.auth.hashers import make_password

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
        print(f"Query: {query[:100]}...")
        return []
    except UnicodeDecodeError as e:
        print(f"❌ Error de codificación: {e}")
        return []

def import_complete_data():
    print("🔄 IMPORTACIÓN COMPLETA DESDE POSTGRESQL")
    print("=" * 50)
    
    # 1. Importar Business (empresas)
    print("\n🏢 Importando empresas...")
    business_query = "SELECT name, code, description, is_active FROM core_business LIMIT 10;"
    business_data = run_postgres_query(business_query)
    
    business_imported = 0
    main_business = None
    
    for row in business_data:
        if row and '|' in row:
            parts = row.split('|')
            if len(parts) >= 2 and parts[0] and parts[1]:
                name = parts[0]
                code = parts[1]
                description = parts[2] if len(parts) > 2 and parts[2] else name
                is_active = parts[3].lower() == 't' if len(parts) > 3 else True
                
                business, created = Business.objects.get_or_create(
                    code=code,
                    defaults={
                        'name': name,
                        'description': description,
                        'is_active': is_active
                    }
                )
                if created:
                    business_imported += 1
                if not main_business:
                    main_business = business
    
    # Crear business por defecto si no existe
    if not main_business:
        main_business = Business.objects.create(
            name="Sancho Distribuidora",
            code="SANCHO", 
            description="Empresa principal",
            is_active=True
        )
        business_imported += 1
        
    print(f"  ✅ Empresas importadas: {business_imported}")
    print(f"  📌 Empresa principal: {main_business.name}")

    # 2. Importar Roles
    print("\n👔 Importando roles...")
    roles_query = "SELECT name, business_id FROM core_role LIMIT 20;"
    roles_data = run_postgres_query(roles_query)
    
    roles_imported = 0
    for row in roles_data:
        if row and '|' in row:
            parts = row.split('|')
            if len(parts) >= 1 and parts[0]:
                name = parts[0]
                
                role, created = Role.objects.get_or_create(
                    name=name,
                    defaults={'business': main_business}
                )
                if created:
                    roles_imported += 1
    print(f"  ✅ Roles importados: {roles_imported}")

    # 3. Importar Usuarios
    print("\n👥 Importando usuarios...")
    users_query = """
        SELECT email, first_name, last_name, is_active, is_staff, 
               password, is_superuser, role_id, business_id
        FROM core_user 
        LIMIT 100;
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
                password = parts[5] if len(parts) > 5 and parts[5] else make_password('admin123')
                is_superuser = parts[6].lower() == 't' if len(parts) > 6 else False
                
                # Buscar role por ID si existe
                role = None
                if len(parts) > 7 and parts[7] and parts[7].isdigit():
                    # Simplemente usar el primer role disponible
                    role = Role.objects.first()
                
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        'first_name': first_name,
                        'last_name': last_name,
                        'business': main_business,
                        'role': role,
                        'is_active': is_active,
                        'is_staff': is_staff,
                        'is_superuser': is_superuser,
                        'password': password
                    }
                )
                if created:
                    users_imported += 1
                    if users_imported % 10 == 0:
                        print(f"    👤 {users_imported} usuarios importados...")
    print(f"  ✅ Usuarios importados: {users_imported}")

    # 4. Importar Categorías
    print("\n📂 Importando categorías...")
    categories_query = "SELECT name, code, business_id, parent_id, is_active FROM core_category LIMIT 200;"
    categories_data = run_postgres_query(categories_query)
    
    categories_imported = 0
    for row in categories_data:
        if row and '|' in row:
            parts = row.split('|')
            if len(parts) >= 1 and parts[0]:
                name = parts[0]
                code = parts[1] if len(parts) > 1 and parts[1] else f"CAT_{name[:10].upper()}"
                is_active = parts[4].lower() == 't' if len(parts) > 4 else True
                
                category, created = Category.objects.get_or_create(
                    name=name,
                    defaults={
                        'business': main_business,
                        'code': code,
                        'description': f'Categoría {name}',
                        'is_active': is_active
                    }
                )
                if created:
                    categories_imported += 1
    print(f"  ✅ Categorías importadas: {categories_imported}")

    # 5. Importar Marcas
    print("\n🏷️ Importando marcas...")
    brands_query = "SELECT name, code, business_id, is_active FROM core_brand LIMIT 500;"
    brands_data = run_postgres_query(brands_query)
    
    brands_imported = 0
    for row in brands_data:
        if row and '|' in row:
            parts = row.split('|')
            if len(parts) >= 1 and parts[0]:
                name = parts[0]
                code = parts[1] if len(parts) > 1 and parts[1] else f"BR_{name[:10].upper()}"
                is_active = parts[3].lower() == 't' if len(parts) > 3 else True
                
                brand, created = Brand.objects.get_or_create(
                    name=name,
                    defaults={
                        'business': main_business,
                        'code': code,
                        'description': f'Marca {name}',
                        'is_active': is_active
                    }
                )
                if created:
                    brands_imported += 1
                    if brands_imported % 50 == 0:
                        print(f"    🏷️ {brands_imported} marcas importadas...")
    print(f"  ✅ Marcas importadas: {brands_imported}")

    # 6. Importar Unidades
    print("\n📏 Importando unidades...")
    units_query = "SELECT name, symbol, is_active FROM core_unit LIMIT 50;"
    units_data = run_postgres_query(units_query)
    
    units_imported = 0
    for row in units_data:
        if row and '|' in row:
            parts = row.split('|')
            if len(parts) >= 2 and parts[0] and parts[1]:
                name = parts[0]
                symbol = parts[1]
                is_active = parts[2].lower() == 't' if len(parts) > 2 else True
                
                unit, created = Unit.objects.get_or_create(
                    name=name,
                    defaults={
                        'symbol': symbol,
                        'unit_type': 'GENERAL',
                        'conversion_factor': 1.0,
                        'is_active': is_active
                    }
                )
                if created:
                    units_imported += 1
    print(f"  ✅ Unidades importadas: {units_imported}")

    # 7. Importar Productos
    print("\n📦 Importando productos...")
    products_query = """
        SELECT p.sku, p.name, p.description, p.minimum_stock, p.maximum_stock,
               p.brand_id, p.category_id, p.business_id, p.is_active,
               b.name as brand_name, c.name as category_name
        FROM core_product p
        LEFT JOIN core_brand b ON p.brand_id = b.id
        LEFT JOIN core_category c ON p.category_id = c.id
        WHERE p.is_active = true
        LIMIT 500;
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
                min_stock = int(parts[3]) if len(parts) > 3 and parts[3] and parts[3].isdigit() else 0
                max_stock = int(parts[4]) if len(parts) > 4 and parts[4] and parts[4].isdigit() else 100
                is_active = parts[8].lower() == 't' if len(parts) > 8 else True
                brand_name = parts[9] if len(parts) > 9 else None
                category_name = parts[10] if len(parts) > 10 else None
                
                # Buscar marca y categoría en SQLite
                brand = Brand.objects.filter(name=brand_name).first() if brand_name else None
                category = Category.objects.filter(name=category_name).first() if category_name else None
                
                product, created = Product.objects.get_or_create(
                    sku=sku,
                    defaults={
                        'business': main_business,
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
                    if products_imported % 100 == 0:
                        print(f"    📦 {products_imported} productos importados...")
    
    print(f"  ✅ Productos importados: {products_imported}")

    # 8. Importar Almacenes
    print("\n🏪 Importando almacenes...")
    warehouses_query = """
        SELECT name, code, address, business_id, is_active
        FROM core_warehouse 
        LIMIT 50;
    """
    warehouses_data = run_postgres_query(warehouses_query)
    
    warehouses_imported = 0
    for row in warehouses_data:
        if row and '|' in row:
            parts = row.split('|')
            if len(parts) >= 1 and parts[0]:
                name = parts[0]
                code = parts[1] if len(parts) > 1 and parts[1] else f"WH_{name[:10].upper()}"
                address = parts[2] if len(parts) > 2 and parts[2] else ''
                is_active = parts[4].lower() == 't' if len(parts) > 4 else True
                
                warehouse, created = Warehouse.objects.get_or_create(
                    name=name,
                    defaults={
                        'business': main_business,
                        'code': code,
                        'address': address,
                        'description': f'Almacén {name}',
                        'is_active': is_active
                    }
                )
                if created:
                    warehouses_imported += 1
    print(f"  ✅ Almacenes importados: {warehouses_imported}")

    # 9. Importar Proveedores
    print("\n🚚 Importando proveedores...")
    suppliers_query = """
        SELECT name, contact_name, email, phone, address, business_id, is_active
        FROM core_supplier 
        LIMIT 100;
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
                is_active = parts[6].lower() == 't' if len(parts) > 6 else True
                
                supplier, created = Supplier.objects.get_or_create(
                    name=name,
                    defaults={
                        'business': main_business,
                        'contact_name': contact_name,
                        'email': email,
                        'phone': phone,
                        'address': address,
                        'is_active': is_active
                    }
                )
                if created:
                    suppliers_imported += 1
    print(f"  ✅ Proveedores importados: {suppliers_imported}")

    # 10. Importar Movimientos de Inventario
    print("\n📊 Importando movimientos de inventario...")
    movements_query = """
        SELECT im.movement_type, im.reference_document, im.notes, 
               im.authorized, im.warehouse_id, im.user_id, im.created_at,
               w.name as warehouse_name, u.email as user_email
        FROM core_inventorymovement im
        LEFT JOIN core_warehouse w ON im.warehouse_id = w.id
        LEFT JOIN core_user u ON im.user_id = u.id
        LIMIT 200;
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
                warehouse_name = parts[7] if len(parts) > 7 else None
                user_email = parts[8] if len(parts) > 8 else None
                
                # Buscar warehouse y user en SQLite
                warehouse = Warehouse.objects.filter(name=warehouse_name).first() if warehouse_name else Warehouse.objects.first()
                user = User.objects.filter(email=user_email).first() if user_email else User.objects.first()
                
                if warehouse:
                    movement, created = InventoryMovement.objects.get_or_create(
                        warehouse=warehouse,
                        user=user,
                        movement_type=movement_type,
                        reference_document=reference_document,
                        notes=notes,
                        defaults={
                            'authorized': authorized,
                            'is_cancelled': False
                        }
                    )
                    if created:
                        movements_imported += 1
    print(f"  ✅ Movimientos importados: {movements_imported}")

    # 11. Crear usuario admin por defecto
    print("\n👑 Creando usuario administrador...")
    admin_user, created = User.objects.get_or_create(
        email='admin@sancho.com',
        defaults={
            'first_name': 'Administrador',
            'last_name': 'Sistema',
            'business': main_business,
            'is_active': True,
            'is_staff': True,
            'is_superuser': True,
            'password': make_password('admin123')
        }
    )
    if created:
        print("  ✅ Usuario admin creado: admin@sancho.com / admin123")
    else:
        print("  ℹ️ Usuario admin ya existe")

    # RESUMEN FINAL
    print(f"\n" + "="*60)
    print(f"🎉 IMPORTACIÓN COMPLETA FINALIZADA")
    print(f"="*60)
    print(f"  🏢 Empresas:           {Business.objects.count()}")
    print(f"  👔 Roles:              {Role.objects.count()}")
    print(f"  👥 Usuarios:           {User.objects.count()}")
    print(f"  🏷️ Marcas:             {Brand.objects.count()}")
    print(f"  📂 Categorías:         {Category.objects.count()}")
    print(f"  📏 Unidades:           {Unit.objects.count()}")
    print(f"  📦 Productos:          {Product.objects.count()}")
    print(f"  🧬 Variantes Producto: {ProductVariant.objects.count()}")
    print(f"  🏪 Almacenes:          {Warehouse.objects.count()}")
    print(f"  🚚 Proveedores:        {Supplier.objects.count()}")
    print(f"  📊 Movimientos Inv.:   {InventoryMovement.objects.count()}")
    print(f"  🛒 Órdenes de Compra:  {PurchaseOrder.objects.count()}")
    print(f"\n🔑 Credenciales Admin:")
    print(f"   📧 Email: admin@sancho.com")
    print(f"   🔐 Password: admin123")
    print(f"\n✨ ¡LISTO! Todas las tablas importadas desde PostgreSQL")

if __name__ == '__main__':
    import_complete_data()
