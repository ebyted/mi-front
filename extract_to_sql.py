#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script para generar comandos SQL de inserción desde SQLite
"""

import sqlite3

def extract_sqlite_data():
    """Extraer datos de SQLite y generar SQL"""
    
    try:
        conn = sqlite3.connect('db.sqlite3')
        conn.row_factory = sqlite3.Row  # Para acceder por nombre de columna
        cursor = conn.cursor()
        
        sql_commands = []
        
        print("🔄 Extrayendo datos de SQLite...")
        
        # Extraer marcas
        cursor.execute("SELECT * FROM core_brand")
        brands = cursor.fetchall()
        print(f"📦 Marcas encontradas: {len(brands)}")
        
        for brand in brands:
            name = brand['name'].replace("'", "''")  # Escapar comillas
            desc = brand['description'].replace("'", "''") if brand['description'] else ''
            sql = f"INSERT INTO core_brand (id, name, description) VALUES ({brand['id']}, '{name}', '{desc}');"
            sql_commands.append(sql)
        
        # Extraer categorías
        cursor.execute("SELECT * FROM core_category")
        categories = cursor.fetchall()
        print(f"📂 Categorías encontradas: {len(categories)}")
        
        for cat in categories:
            name = cat['name'].replace("'", "''")
            desc = cat['description'].replace("'", "''") if cat['description'] else ''
            sql = f"INSERT INTO core_category (id, name, description) VALUES ({cat['id']}, '{name}', '{desc}');"
            sql_commands.append(sql)
        
        # Extraer almacenes
        cursor.execute("SELECT * FROM core_warehouse")
        warehouses = cursor.fetchall()
        print(f"🏪 Almacenes encontrados: {len(warehouses)}")
        
        for wh in warehouses:
            name = wh['name'].replace("'", "''")
            location = wh['location'].replace("'", "''") if wh['location'] else ''
            desc = wh['description'].replace("'", "''") if wh['description'] else ''
            sql = f"INSERT INTO core_warehouse (id, name, location, description) VALUES ({wh['id']}, '{name}', '{location}', '{desc}');"
            sql_commands.append(sql)
        
        # Extraer usuarios
        cursor.execute("SELECT * FROM core_user")
        users = cursor.fetchall()
        print(f"👥 Usuarios encontrados: {len(users)}")
        
        for user in users:
            # La tabla core_user no tiene username, necesito usar email como username
            email = user[4].replace("'", "''") if user[4] else ''  # email es índice 4
            first_name = user[5].replace("'", "''") if user[5] else ''  # first_name es índice 5
            last_name = user[6].replace("'", "''") if user[6] else ''  # last_name es índice 6  
            password = user[1].replace("'", "''") if user[1] else ''  # password es índice 1
            
            # Usar email como username o generar uno
            username = email if email else f'user_{user[0]}'  # user[0] es id
            
            sql = f"""INSERT INTO auth_user (id, username, email, first_name, last_name, password, is_active, is_staff, is_superuser) 
                     VALUES ({user[0]}, '{username}', '{email}', '{first_name}', '{last_name}', '{password}', 
                     {str(bool(user[7])).lower()}, {str(bool(user[8])).lower()}, {str(bool(user[3])).lower()});"""
            sql_commands.append(sql)
        
        # Extraer productos
        cursor.execute("SELECT * FROM core_product")
        products = cursor.fetchall()
        print(f"📦 Productos encontrados: {len(products)}")
        
        for prod in products:
            name = prod['name'].replace("'", "''")
            desc = prod['description'].replace("'", "''") if prod['description'] else ''
            sku = prod['sku'].replace("'", "''") if prod['sku'] else 'NULL'
            barcode = prod['barcode'].replace("'", "''") if prod['barcode'] else 'NULL'
            group_val = str(prod['group']) if prod['group'] else 'NULL'
            
            brand_id = prod['brand_id'] if prod['brand_id'] else 'NULL'
            category_id = prod['category_id'] if prod['category_id'] else 'NULL'
            
            # Manejar valores NULL correctamente
            sku_val = f"'{sku}'" if sku != 'NULL' else 'NULL'
            barcode_val = f"'{barcode}'" if barcode != 'NULL' else 'NULL'
            group_val = f"'{group_val}'" if group_val != 'NULL' else 'NULL'
            
            # Usar valores por defecto para campos que no existen en SQLite
            sql = f"""INSERT INTO core_product (id, name, description, sku, barcode, brand_id, category_id, 
                     unit_price, cost_price, minimum_stock, maximum_stock, is_active, product_group, lote) 
                     VALUES ({prod['id']}, '{name}', '{desc}', {sku_val}, {barcode_val}, {brand_id}, {category_id}, 
                     0, 0, {prod['minimum_stock']}, {prod['maximum_stock']}, 
                     {str(prod['is_active']).lower()}, {group_val}, NULL);"""
            sql_commands.append(sql)
        
        # Extraer detalles de movimientos de inventario
        cursor.execute("SELECT * FROM core_inventorymovementdetail")
        movements = cursor.fetchall()
        print(f"📊 Detalles de movimientos encontrados: {len(movements)}")
        
        for mov in movements:
            # Primero necesito obtener el movimiento padre
            cursor.execute("SELECT * FROM core_inventorymovement WHERE id = ?", (mov['movement_id'],))
            parent_mov = cursor.fetchone()
            
            if not parent_mov:
                continue
                
            reference = parent_mov['reference_document'].replace("'", "''") if parent_mov['reference_document'] else ''
            notes = parent_mov['notes'].replace("'", "''") if parent_mov['notes'] else ''
            
            reference_val = f"'{reference}'" if reference else 'NULL'
            notes_val = f"'{notes}'" if notes else 'NULL'
            
            created_by_id = parent_mov['user_id'] if parent_mov['user_id'] else 'NULL'
            authorized_by_id = parent_mov['authorized_by_id'] if parent_mov['authorized_by_id'] else 'NULL'
            cancelled_by_id = parent_mov['cancelled_by_id'] if parent_mov['cancelled_by_id'] else 'NULL'
            
            # Usar valores por defecto para campos que faltan
            sql = f"""INSERT INTO core_inventorymovement (id, product_id, warehouse_id, movement_type, quantity, 
                     unit_price, total_cost, reference, notes, created_by_id, lote, authorized, authorized_by_id, 
                     is_cancelled, cancelled_by_id) 
                     VALUES ({mov['id']}, {mov['product_id']}, {parent_mov['warehouse_id']}, '{parent_mov['movement_type']}', 
                     {mov['quantity']}, {mov['unit_price']}, {mov['total_price']}, {reference_val}, {notes_val}, 
                     {created_by_id}, NULL, {str(parent_mov['authorized']).lower()}, {authorized_by_id}, 
                     {str(parent_mov['is_cancelled']).lower()}, {cancelled_by_id});"""
            sql_commands.append(sql)
        
        # Guardar comandos SQL en archivo
        with open('postgres_import_commands.sql', 'w', encoding='utf-8') as f:
            # Reiniciar secuencias después de insertar
            f.write("-- Comandos de inserción generados desde SQLite\n\n")
            
            for cmd in sql_commands:
                f.write(cmd + "\n")
            
            # Actualizar secuencias para que los IDs sigan correctamente
            f.write("\n-- Actualizar secuencias\n")
            f.write("SELECT setval('core_brand_id_seq', (SELECT MAX(id) FROM core_brand));\n")
            f.write("SELECT setval('core_category_id_seq', (SELECT MAX(id) FROM core_category));\n")
            f.write("SELECT setval('core_warehouse_id_seq', (SELECT MAX(id) FROM core_warehouse));\n")
            f.write("SELECT setval('auth_user_id_seq', (SELECT MAX(id) FROM auth_user));\n")
            f.write("SELECT setval('core_product_id_seq', (SELECT MAX(id) FROM core_product));\n")
            f.write("SELECT setval('core_inventorymovement_id_seq', (SELECT MAX(id) FROM core_inventorymovement));\n")
        
        print(f"\n✅ Archivo generado: postgres_import_commands.sql")
        print(f"📊 Total comandos: {len(sql_commands)}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    extract_sqlite_data()
