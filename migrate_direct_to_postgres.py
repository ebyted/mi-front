#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script para migrar directamente de SQLite a PostgreSQL
Evita problemas de codificación usando conexiones directas
"""

import sqlite3
import psycopg2
import os
import locale
from datetime import datetime

# Forzar codificación UTF-8
import sys
if sys.platform.startswith('win'):
    # En Windows, configurar codificación UTF-8
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    os.environ['PYTHONUTF8'] = '1'

# Configuración PostgreSQL
POSTGRES_CONFIG = {
    'host': 'localhost',
    'port': 5433,
    'database': 'maestro_inventario',
    'user': 'maestro',
    'password': 'maestro123'
}

# Configuración SQLite
SQLITE_PATH = 'db.sqlite3'

def connect_postgres():
    """Conectar a PostgreSQL"""
    try:
        # Agregar parámetros de codificación explícitos
        config = POSTGRES_CONFIG.copy()
        config['client_encoding'] = 'utf8'
        
        conn = psycopg2.connect(**config)
        conn.autocommit = True
        
        # Configurar codificación en la conexión
        cursor = conn.cursor()
        cursor.execute("SET client_encoding TO 'UTF8'")
        
        print("✅ Conectado a PostgreSQL")
        return conn
    except Exception as e:
        print(f"❌ Error conectando a PostgreSQL: {e}")
        return None

def connect_sqlite():
    """Conectar a SQLite"""
    try:
        conn = sqlite3.connect(SQLITE_PATH)
        conn.row_factory = sqlite3.Row  # Para acceder por nombre de columna
        print("✅ Conectado a SQLite")
        return conn
    except Exception as e:
        print(f"❌ Error conectando a SQLite: {e}")
        return None

def create_postgres_tables(pg_conn):
    """Crear las tablas básicas en PostgreSQL usando SQL directo"""
    
    tables_sql = """
    -- Tabla de usuarios
    CREATE TABLE IF NOT EXISTS auth_user (
        id SERIAL PRIMARY KEY,
        password VARCHAR(128) NOT NULL,
        last_login TIMESTAMPTZ,
        is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
        username VARCHAR(150) NOT NULL UNIQUE,
        first_name VARCHAR(150) NOT NULL DEFAULT '',
        last_name VARCHAR(150) NOT NULL DEFAULT '',
        email VARCHAR(254) NOT NULL DEFAULT '',
        is_staff BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        date_joined TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Tabla de marcas
    CREATE TABLE IF NOT EXISTS core_brand (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Tabla de categorías
    CREATE TABLE IF NOT EXISTS core_category (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Tabla de proveedores
    CREATE TABLE IF NOT EXISTS core_supplier (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        contact_person VARCHAR(100),
        phone VARCHAR(20),
        email VARCHAR(254),
        address TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Tabla de almacenes
    CREATE TABLE IF NOT EXISTS core_warehouse (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        location VARCHAR(200),
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Tabla de productos
    CREATE TABLE IF NOT EXISTS core_product (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        sku VARCHAR(100) UNIQUE,
        barcode VARCHAR(100),
        brand_id INTEGER REFERENCES core_brand(id),
        category_id INTEGER REFERENCES core_category(id),
        unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        minimum_stock INTEGER NOT NULL DEFAULT 0,
        maximum_stock INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        product_group VARCHAR(100),
        lote VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Tabla de movimientos de inventario
    CREATE TABLE IF NOT EXISTS core_inventorymovement (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES core_product(id),
        warehouse_id INTEGER NOT NULL REFERENCES core_warehouse(id),
        movement_type VARCHAR(10) NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        total_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
        reference VARCHAR(100),
        notes TEXT,
        created_by_id INTEGER REFERENCES auth_user(id),
        lote VARCHAR(100),
        authorized BOOLEAN NOT NULL DEFAULT FALSE,
        authorized_by_id INTEGER REFERENCES auth_user(id),
        authorized_at TIMESTAMPTZ,
        is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
        cancelled_by_id INTEGER REFERENCES auth_user(id),
        cancellation_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Crear índices importantes
    CREATE INDEX IF NOT EXISTS idx_product_sku ON core_product(sku);
    CREATE INDEX IF NOT EXISTS idx_product_barcode ON core_product(barcode);
    CREATE INDEX IF NOT EXISTS idx_movement_product ON core_inventorymovement(product_id);
    CREATE INDEX IF NOT EXISTS idx_movement_warehouse ON core_inventorymovement(warehouse_id);
    """
    
    try:
        cursor = pg_conn.cursor()
        cursor.execute(tables_sql)
        print("✅ Tablas creadas en PostgreSQL")
        return True
    except Exception as e:
        print(f"❌ Error creando tablas: {e}")
        return False

def migrate_table_data(sqlite_conn, pg_conn, table_name, sqlite_table, pg_table, column_mapping=None):
    """Migrar datos de una tabla específica"""
    
    try:
        # Obtener datos de SQLite
        sqlite_cursor = sqlite_conn.cursor()
        sqlite_cursor.execute(f"SELECT * FROM {sqlite_table}")
        rows = sqlite_cursor.fetchall()
        
        if not rows:
            print(f"⚠️  Tabla {table_name}: Sin datos para migrar")
            return True
        
        # Obtener nombres de columnas
        column_names = [description[0] for description in sqlite_cursor.description]
        
        # Aplicar mapeo de columnas si existe
        if column_mapping:
            # Filtrar solo las columnas que existen en el mapeo
            filtered_columns = []
            filtered_data_indices = []
            
            for i, col in enumerate(column_names):
                if col in column_mapping:
                    filtered_columns.append(column_mapping[col])
                    filtered_data_indices.append(i)
            
            column_names = filtered_columns
            # Filtrar datos según las columnas mapeadas
            filtered_rows = []
            for row in rows:
                filtered_row = [row[i] for i in filtered_data_indices]
                filtered_rows.append(filtered_row)
            rows = filtered_rows
        
        # Preparar query de inserción para PostgreSQL
        placeholders = ', '.join(['%s'] * len(column_names))
        columns_str = ', '.join(column_names)
        
        pg_cursor = pg_conn.cursor()
        
        # Insertar datos en PostgreSQL
        insert_query = f"INSERT INTO {pg_table} ({columns_str}) VALUES ({placeholders})"
        
        success_count = 0
        error_count = 0
        
        for row in rows:
            try:
                pg_cursor.execute(insert_query, list(row))
                success_count += 1
            except Exception as e:
                error_count += 1
                print(f"   ⚠️  Error en fila: {e}")
        
        print(f"✅ {table_name}: {success_count} registros migrados, {error_count} errores")
        return error_count == 0
        
    except Exception as e:
        print(f"❌ Error migrando tabla {table_name}: {e}")
        return False

def main():
    """Función principal de migración"""
    print("🚀 MIGRACIÓN DIRECTA SQLITE → POSTGRESQL")
    print("=" * 50)
    
    # Conectar a ambas bases de datos
    sqlite_conn = connect_sqlite()
    if not sqlite_conn:
        return False
    
    postgres_conn = connect_postgres()
    if not postgres_conn:
        sqlite_conn.close()
        return False
    
    try:
        # Crear tablas en PostgreSQL
        print("\n🔧 Creando estructura de tablas...")
        if not create_postgres_tables(postgres_conn):
            return False
        
        # Migrar datos tabla por tabla
        print("\n📊 Migrando datos...")
        
        # Mapeo de columnas para usuarios (Django auth_user)
        user_mapping = {
            'id': 'id',
            'password': 'password', 
            'username': 'username',
            'email': 'email',
            'first_name': 'first_name',
            'last_name': 'last_name',
            'is_active': 'is_active',
            'is_staff': 'is_staff',
            'is_superuser': 'is_superuser',
            'date_joined': 'date_joined',
            'last_login': 'last_login'
        }
        
        # Migrar usuarios
        migrate_table_data(
            sqlite_conn, postgres_conn,
            "Usuarios", "core_user", "auth_user",
            user_mapping
        )
        
        # Migrar marcas
        migrate_table_data(
            sqlite_conn, postgres_conn,
            "Marcas", "core_brand", "core_brand"
        )
        
        # Migrar categorías  
        migrate_table_data(
            sqlite_conn, postgres_conn,
            "Categorías", "core_category", "core_category"
        )
        
        # Migrar proveedores
        migrate_table_data(
            sqlite_conn, postgres_conn,
            "Proveedores", "core_supplier", "core_supplier"
        )
        
        # Migrar almacenes
        migrate_table_data(
            sqlite_conn, postgres_conn,
            "Almacenes", "core_warehouse", "core_warehouse"
        )
        
        # Migrar productos
        migrate_table_data(
            sqlite_conn, postgres_conn,
            "Productos", "core_product", "core_product"
        )
        
        # Migrar movimientos de inventario
        migrate_table_data(
            sqlite_conn, postgres_conn,
            "Movimientos", "core_inventorymovement", "core_inventorymovement"
        )
        
        print("\n✅ MIGRACIÓN COMPLETADA")
        print("=" * 50)
        print("🐘 PostgreSQL configurado en:")
        print(f"   Host: {POSTGRES_CONFIG['host']}:{POSTGRES_CONFIG['port']}")
        print(f"   Database: {POSTGRES_CONFIG['database']}")
        print(f"   Usuario: {POSTGRES_CONFIG['user']}")
        
        return True
        
    finally:
        sqlite_conn.close()
        postgres_conn.close()

if __name__ == "__main__":
    main()
