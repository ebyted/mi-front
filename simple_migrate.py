#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script simplificado para extraer datos básicos de SQLite a PostgreSQL
"""

import sqlite3

def extract_and_import():
    """Extraer datos básicos y crear comandos de importación"""
    
    try:
        conn = sqlite3.connect('db.sqlite3')
        cursor = conn.cursor()
        
        print("🔄 Extrayendo datos básicos de SQLite...")
        
        # Solo extraer las tablas principales con datos mínimos
        
        # 1. Marcas
        cursor.execute("SELECT id, name, description FROM core_brand")
        brands = cursor.fetchall()
        print(f"📦 Marcas: {len(brands)}")
        
        # 2. Categorías
        cursor.execute("SELECT id, name, description FROM core_category")
        categories = cursor.fetchall()
        print(f"📂 Categorías: {len(categories)}")
        
        # 3. Almacenes
        cursor.execute("SELECT id, name, location, description FROM core_warehouse")
        warehouses = cursor.fetchall()
        print(f"🏪 Almacenes: {len(warehouses)}")
        
        # 4. Usuarios (seleccionar campos específicos)
        cursor.execute("SELECT id, password, email, first_name, last_name, is_active, is_staff, is_superuser FROM core_user")
        users = cursor.fetchall()
        print(f"👥 Usuarios: {len(users)}")
        
        # 5. Productos (seleccionar campos específicos)
        cursor.execute("SELECT id, name, description, sku, barcode, brand_id, category_id, minimum_stock, maximum_stock, is_active FROM core_product WHERE group IS NOT NULL")
        products = cursor.fetchall()
        print(f"📦 Productos: {len(products)}")
        
        conn.close()
        
        # Ahora ejecutar comandos directamente en PostgreSQL
        print("\n🔄 Importando a PostgreSQL...")
        
        # Importar marcas
        for brand in brands:
            name = brand[1].replace("'", "''") if brand[1] else ''
            desc = brand[2].replace("'", "''") if brand[2] else ''
            cmd = f"docker exec postgres_local psql -U maestro -d maestro_inventario -c \"INSERT INTO core_brand (id, name, description) VALUES ({brand[0]}, '{name}', '{desc}');\""
            print(f"Insertando marca: {name}")
            import subprocess
            subprocess.run(cmd, shell=True, capture_output=True)
        
        # Importar categorías
        for cat in categories:
            name = cat[1].replace("'", "''") if cat[1] else ''
            desc = cat[2].replace("'", "''") if cat[2] else ''
            cmd = f"docker exec postgres_local psql -U maestro -d maestro_inventario -c \"INSERT INTO core_category (id, name, description) VALUES ({cat[0]}, '{name}', '{desc}');\""
            print(f"Insertando categoría: {name}")
            subprocess.run(cmd, shell=True, capture_output=True)
        
        # Importar almacenes
        for wh in warehouses:
            name = wh[1].replace("'", "''") if wh[1] else ''
            location = wh[2].replace("'", "''") if wh[2] else ''
            desc = wh[3].replace("'", "''") if wh[3] else ''
            cmd = f"docker exec postgres_local psql -U maestro -d maestro_inventario -c \"INSERT INTO core_warehouse (id, name, location, description) VALUES ({wh[0]}, '{name}', '{location}', '{desc}');\""
            print(f"Insertando almacén: {name}")
            subprocess.run(cmd, shell=True, capture_output=True)
        
        # Importar usuarios
        for user in users:
            email = user[2].replace("'", "''") if user[2] else ''
            first_name = user[3].replace("'", "''") if user[3] else ''
            last_name = user[4].replace("'", "''") if user[4] else ''
            password = user[1].replace("'", "''") if user[1] else ''
            username = email if email else f'user_{user[0]}'
            
            cmd = f"docker exec postgres_local psql -U maestro -d maestro_inventario -c \"INSERT INTO auth_user (id, username, email, first_name, last_name, password, is_active, is_staff, is_superuser) VALUES ({user[0]}, '{username}', '{email}', '{first_name}', '{last_name}', '{password}', {str(bool(user[5])).lower()}, {str(bool(user[6])).lower()}, {str(bool(user[7])).lower()});\""
            print(f"Insertando usuario: {username}")
            subprocess.run(cmd, shell=True, capture_output=True)
        
        # Importar algunos productos de muestra
        count = 0
        for prod in products[:50]:  # Solo los primeros 50 productos
            name = prod[1].replace("'", "''") if prod[1] else ''
            desc = prod[2].replace("'", "''") if prod[2] else ''
            sku = prod[3] if prod[3] else f'SKU_{prod[0]}'
            barcode = prod[4] if prod[4] else None
            brand_id = prod[5] if prod[5] else 'NULL'
            category_id = prod[6] if prod[6] else 'NULL'
            
            sku_val = f"'{sku}'" if sku else 'NULL'
            barcode_val = f"'{barcode}'" if barcode else 'NULL'
            
            cmd = f"docker exec postgres_local psql -U maestro -d maestro_inventario -c \"INSERT INTO core_product (id, name, description, sku, barcode, brand_id, category_id, unit_price, cost_price, minimum_stock, maximum_stock, is_active) VALUES ({prod[0]}, '{name}', '{desc}', {sku_val}, {barcode_val}, {brand_id}, {category_id}, 0, 0, {prod[7]}, {prod[8]}, {str(bool(prod[9])).lower()});\""
            print(f"Insertando producto: {name}")
            result = subprocess.run(cmd, shell=True, capture_output=True)
            if result.returncode == 0:
                count += 1
        
        print(f"\n✅ Migración básica completada!")
        print(f"📊 Datos migrados:")
        print(f"   Marcas: {len(brands)}")
        print(f"   Categorías: {len(categories)}")
        print(f"   Almacenes: {len(warehouses)}")
        print(f"   Usuarios: {len(users)}")
        print(f"   Productos: {count}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    extract_and_import()
