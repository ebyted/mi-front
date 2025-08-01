#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script directo para sincronizar con tu VPS Docker
"""
import subprocess
import os
from datetime import datetime

# Tu configuración VPS
VPS_HOST = "168.231.67.221"
VPS_USER = "root"
DB_NAME = "maestro_inventario"
VPS_CONTAINER = "maestro_db"  # Nombre del contenedor PostgreSQL en VPS

def create_backup():
    """Crear backup de PostgreSQL local"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"backup_{timestamp}.sql"
    
    print("Creando backup de base de datos local...")
    
    # Comando para crear backup desde el contenedor Docker local (db con usuario maestro)
    cmd = f"docker-compose exec -T db pg_dump -U maestro maestro > {backup_file}"
    
    try:
        result = subprocess.run(cmd, shell=True, check=True)
        print(f"Backup creado: {backup_file}")
        return backup_file
    except subprocess.CalledProcessError as e:
        print(f"Error creando backup: {e}")
        return None

def upload_to_vps(backup_file):
    """Subir backup al VPS"""
    print(f"Subiendo {backup_file} al VPS...")
    
    cmd = f"scp {backup_file} {VPS_USER}@{VPS_HOST}:/tmp/"
    
    try:
        result = subprocess.run(cmd, shell=True, check=True)
        print("Archivo subido exitosamente")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error subiendo archivo: {e}")
        return False

def restore_on_vps(backup_file):
    """Ejecutar restauracion en VPS"""
    print("Ejecutando restauracion en VPS...")
    
    # Comandos para ejecutar en el VPS con contenedor maestro_db
    restore_commands = f"""
    echo "Eliminando base de datos existente..." &&
    docker exec -i maestro_db psql -U maestro -c "DROP DATABASE IF EXISTS maestro_inventario;" &&
    echo "Creando base de datos nueva..." &&
    docker exec -i maestro_db psql -U maestro -c "CREATE DATABASE maestro_inventario;" &&
    echo "Restaurando backup..." &&
    docker exec -i maestro_db psql -U maestro -d maestro_inventario < /tmp/{backup_file} &&
    echo "Limpiando archivo temporal..." &&
    rm /tmp/{backup_file} &&
    echo "Restauracion completada!"
    """
    
    cmd = f"ssh {VPS_USER}@{VPS_HOST} '{restore_commands}'"
    
    try:
        result = subprocess.run(cmd, shell=True, check=True)
        print("Restauracion completada en VPS")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error en restauracion: {e}")
        return False

def verify_sync():
    """Verificar que la sincronización fue exitosa"""
    print("Verificando sincronización en VPS...")
    
    verify_commands = f"""
    echo "Verificando datos en VPS..." &&
    docker exec maestro_db psql -U maestro -d maestro_inventario -c "
    SELECT 
        (SELECT COUNT(*) FROM core_product) as productos,
        (SELECT COUNT(*) FROM core_productvariant) as variantes,
        (SELECT COUNT(*) FROM core_brand) as marcas,
        (SELECT COUNT(*) FROM core_category) as categorias,
        (SELECT COUNT(*) FROM core_user) as usuarios;
    "
    """
    
    cmd = f"ssh {VPS_USER}@{VPS_HOST} '{verify_commands}'"
    
    try:
        result = subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)
        print("✅ Verificación completada:")
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error en verificación: {e}")
        return False

def sync_database():
    """Proceso completo de sincronizacion"""
    print("=" * 50)
    print("SINCRONIZACION LOCAL -> VPS")
    print("=" * 50)
    print(f"VPS: {VPS_HOST}")
    print(f"Usuario: {VPS_USER}")
    print(f"Base de datos: {DB_NAME}")
    print()
    
    # Paso 1: Crear backup
    backup_file = create_backup()
    if not backup_file:
        print("Error: No se pudo crear el backup")
        return False
    
    # Paso 2: Subir al VPS
    if not upload_to_vps(backup_file):
        print("Error: No se pudo subir el archivo")
        return False
    
    # Paso 3: Restaurar en VPS
    if not restore_on_vps(backup_file):
        print("Error: No se pudo restaurar en VPS")
        return False
    
    # Paso 4: Limpiar archivo local
    try:
        os.remove(backup_file)
        print("Archivo temporal eliminado")
    except:
        print("No se pudo eliminar archivo temporal")
    
    # Paso 5: Verificar sincronización
    print("\n🔍 Verificando sincronización...")
    verify_sync()
    
    print("✅ Sincronizacion completada exitosamente!")
    print(f"🌐 Accede a tu aplicación en: http://{VPS_HOST}")
    print("🔑 Inicia sesión con: ebyted@hotmail.com")
    return True

if __name__ == '__main__':
    sync_database()
