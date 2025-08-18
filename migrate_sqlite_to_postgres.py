#!/usr/bin/env python
"""
Script para migrar datos de SQLite a PostgreSQL
Migra la base de datos actual db.sqlite3 a PostgreSQL
"""

import os
import sys
import django
from django.core.management import execute_from_command_line
from django.conf import settings
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
import json
from datetime import datetime

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from django.apps import apps
from django.core import serializers
from django.db import connection

def export_sqlite_data():
    """Exportar datos de SQLite usando Django"""
    print("🔄 Exportando datos de SQLite...")
    
    # Obtener todos los modelos de la app 'core'
    core_models = apps.get_app_config('core').get_models()
    
    data = {}
    
    for model in core_models:
        model_name = model._meta.label
        print(f"   📦 Exportando {model_name}...")
        
        try:
            # Obtener todos los objetos del modelo
            objects = model.objects.all()
            
            # Serializar a JSON
            serialized_data = []
            for obj in objects:
                # Usar el serializer de Django
                serialized = serializers.serialize('json', [obj])
                serialized_obj = json.loads(serialized)[0]
                serialized_data.append(serialized_obj)
            
            data[model_name] = serialized_data
            print(f"   ✅ {model_name}: {len(serialized_data)} registros")
            
        except Exception as e:
            print(f"   ❌ Error exportando {model_name}: {e}")
            continue
    
    # Guardar en archivo JSON
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    export_file = f"sqlite_export_{timestamp}.json"
    
    with open(export_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False, default=str)
    
    print(f"✅ Datos exportados a: {export_file}")
    return export_file

def create_postgres_database():
    """Crear base de datos PostgreSQL si no existe"""
    print("🔄 Configurando PostgreSQL...")
    
    # Configuración de PostgreSQL
    postgres_config = {
        'host': 'localhost',
        'port': '5433',  # Puerto local diferente al estándar
        'user': 'maestro',
        'password': 'maestro123',
        'database': 'postgres'  # Conectar a DB por defecto primero
    }
    
    try:
        # Conectar a PostgreSQL
        conn = psycopg2.connect(**postgres_config)
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Verificar si la base de datos existe
        cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = 'maestro_inventario'")
        exists = cursor.fetchone()
        
        if not exists:
            print("   📁 Creando base de datos 'maestro_inventario'...")
            cursor.execute("CREATE DATABASE maestro_inventario")
            print("   ✅ Base de datos creada")
        else:
            print("   ℹ️ Base de datos 'maestro_inventario' ya existe")
        
        cursor.close()
        conn.close()
        return True
        
    except psycopg2.Error as e:
        print(f"   ❌ Error configurando PostgreSQL: {e}")
        print("   💡 Asegúrate de que PostgreSQL esté ejecutándose en localhost:5433")
        print("   💡 Usuario: maestro, Password: maestro123")
        return False

def update_django_settings_for_postgres():
    """Actualizar configuración temporal para PostgreSQL"""
    print("🔄 Configurando Django para PostgreSQL...")
    
    # Crear archivo temporal de configuración
    postgres_env = """
# PostgreSQL settings para migración
DATABASE_ENGINE=django.db.backends.postgresql
DATABASE_NAME=maestro_inventario
DATABASE_USER=maestro
DATABASE_PASSWORD=maestro123
DATABASE_HOST=localhost
DATABASE_PORT=5433
DEBUG=True
"""
    
    with open('.env.postgres', 'w') as f:
        f.write(postgres_env)
    
    print("✅ Configuración PostgreSQL guardada en .env.postgres")

def run_django_migrations():
    """Ejecutar migraciones de Django en PostgreSQL"""
    print("🔄 Ejecutando migraciones en PostgreSQL...")
    
    # Cambiar temporalmente las variables de entorno
    original_env = {}
    postgres_vars = {
        'DATABASE_ENGINE': 'django.db.backends.postgresql',
        'DATABASE_NAME': 'maestro_inventario',
        'DATABASE_USER': 'maestro',
        'DATABASE_PASSWORD': 'maestro123',
        'DATABASE_HOST': 'localhost',
        'DATABASE_PORT': '5433'
    }
    
    # Guardar valores originales y establecer nuevos
    for key, value in postgres_vars.items():
        original_env[key] = os.environ.get(key)
        os.environ[key] = value
    
    try:
        # Recargar configuración de Django
        from django.conf import settings
        settings.configure()
        
        # Ejecutar migraciones
        execute_from_command_line(['manage.py', 'migrate'])
        print("✅ Migraciones completadas")
        return True
        
    except Exception as e:
        print(f"❌ Error ejecutando migraciones: {e}")
        return False
        
    finally:
        # Restaurar valores originales
        for key, value in original_env.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value

def import_data_to_postgres(export_file):
    """Importar datos a PostgreSQL"""
    print("🔄 Importando datos a PostgreSQL...")
    
    # Leer datos exportados
    with open(export_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Cambiar configuración a PostgreSQL temporalmente
    postgres_vars = {
        'DATABASE_ENGINE': 'django.db.backends.postgresql',
        'DATABASE_NAME': 'maestro_inventario',
        'DATABASE_USER': 'maestro',
        'DATABASE_PASSWORD': 'maestro123',
        'DATABASE_HOST': 'localhost',
        'DATABASE_PORT': '5433'
    }
    
    original_env = {}
    for key, value in postgres_vars.items():
        original_env[key] = os.environ.get(key)
        os.environ[key] = value
    
    try:
        # Reconfigurar Django
        django.setup()
        
        # Importar datos modelo por modelo
        for model_name, model_data in data.items():
            if not model_data:
                continue
                
            print(f"   📦 Importando {model_name}...")
            
            try:
                # Deserializar y guardar objetos
                for obj_data in model_data:
                    for deserialized_obj in serializers.deserialize('json', [obj_data]):
                        deserialized_obj.save()
                
                print(f"   ✅ {model_name}: {len(model_data)} registros importados")
                
            except Exception as e:
                print(f"   ❌ Error importando {model_name}: {e}")
                continue
        
        print("✅ Importación completada")
        return True
        
    except Exception as e:
        print(f"❌ Error general en importación: {e}")
        return False
        
    finally:
        # Restaurar configuración original
        for key, value in original_env.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value

def main():
    """Función principal de migración"""
    print("🚀 MIGRACIÓN DE SQLITE A POSTGRESQL")
    print("=" * 50)
    
    # Paso 1: Exportar datos de SQLite
    try:
        export_file = export_sqlite_data()
    except Exception as e:
        print(f"❌ Error exportando SQLite: {e}")
        return False
    
    # Paso 2: Configurar PostgreSQL
    if not create_postgres_database():
        print("❌ No se pudo configurar PostgreSQL")
        return False
    
    # Paso 3: Actualizar configuración
    update_django_settings_for_postgres()
    
    # Paso 4: Ejecutar migraciones
    if not run_django_migrations():
        print("❌ No se pudieron ejecutar las migraciones")
        return False
    
    # Paso 5: Importar datos
    if not import_data_to_postgres(export_file):
        print("❌ No se pudieron importar los datos")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE")
    print("=" * 50)
    print(f"📁 Archivo de exportación: {export_file}")
    print("🐘 Base de datos PostgreSQL: maestro_inventario")
    print("🔧 Host: localhost:5433")
    print("👤 Usuario: maestro")
    print("🔑 Password: maestro123")
    
    return True

if __name__ == "__main__":
    main()
