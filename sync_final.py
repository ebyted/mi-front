#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script final para sincronizar base de datos con VPS
Configurado para tu setup específico
"""
import subprocess
import os
from datetime import datetime

# CONFIGURACION PARA TU VPS
VPS_HOST = "168.231.67.221"
VPS_USER = "root"
LOCAL_DB_USER = "maestro"
LOCAL_DB_NAME = "maestro"
VPS_DB_NAME = "maestro_inventario"  # Ajusta según tu VPS

def ejecutar_comando(cmd, descripcion):
    """Ejecutar comando y mostrar resultado"""
    print(f"🔄 {descripcion}...")
    try:
        result = subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {descripcion} - Completado")
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        print(f"❌ Error en {descripcion}: {e.stderr}")
        return False, None

def crear_backup_local():
    """Crear backup de PostgreSQL local"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"backup_vps_{timestamp}.sql"
    
    print("📦 Creando backup de base de datos local...")
    
    # Comando específico para tu configuración
    cmd = f"docker-compose exec -T db pg_dump -U {LOCAL_DB_USER} {LOCAL_DB_NAME} > {backup_file}"
    
    success, output = ejecutar_comando(cmd, "Creando backup")
    if success:
        # Verificar tamaño del archivo
        try:
            size = os.path.getsize(backup_file)
            if size > 0:
                print(f"📊 Backup creado: {backup_file} ({size/1024/1024:.1f} MB)")
                return backup_file
            else:
                print("❌ El backup está vacío")
                return None
        except FileNotFoundError:
            print("❌ No se encontró el archivo de backup")
            return None
    return None

def subir_a_vps(backup_file):
    """Subir backup al VPS"""
    print(f"⬆️ Subiendo {backup_file} al VPS {VPS_HOST}...")
    
    cmd = f"scp {backup_file} {VPS_USER}@{VPS_HOST}:/tmp/"
    success, output = ejecutar_comando(cmd, "Subiendo archivo al VPS")
    
    return success

def restaurar_en_vps(backup_file):
    """Restaurar base de datos en VPS"""
    print("🔄 Restaurando base de datos en VPS...")
    
    # Comandos para ejecutar en el VPS
    vps_commands = f'''
    echo "Parando servicios Docker..."
    cd /path/to/your/project && docker-compose down
    
    echo "Iniciando PostgreSQL..."
    docker-compose up -d db
    sleep 15
    
    echo "Eliminando base de datos existente..."
    docker-compose exec -T db psql -U maestro -c "DROP DATABASE IF EXISTS {VPS_DB_NAME};"
    
    echo "Creando base de datos nueva..."
    docker-compose exec -T db psql -U maestro -c "CREATE DATABASE {VPS_DB_NAME};"
    
    echo "Restaurando backup..."
    docker-compose exec -T db psql -U maestro -d {VPS_DB_NAME} < /tmp/{backup_file}
    
    echo "Iniciando todos los servicios..."
    docker-compose up -d
    
    echo "Limpiando archivo temporal..."
    rm /tmp/{backup_file}
    
    echo "Verificando datos..."
    docker-compose exec backend python manage.py shell -c "
from core.models import *
print(f'Productos: {{Product.objects.count()}}')
print(f'Variantes: {{ProductVariant.objects.count()}}')
print(f'Marcas: {{Brand.objects.count()}}')
print(f'Usuarios: {{User.objects.count()}}')
"
    '''
    
    cmd = f"ssh {VPS_USER}@{VPS_HOST} '{vps_commands}'"
    success, output = ejecutar_comando(cmd, "Restaurando en VPS")
    
    if success:
        print("📊 Salida de verificación:")
        print(output)
    
    return success

def sincronizar():
    """Proceso completo de sincronización"""
    print("=" * 60)
    print("🚀 SINCRONIZACIÓN DE BASE DE DATOS LOCAL → VPS")
    print("=" * 60)
    print(f"🎯 VPS: {VPS_HOST}")
    print(f"👤 Usuario SSH: {VPS_USER}")
    print(f"🗄️ BD Local: {LOCAL_DB_NAME} (usuario: {LOCAL_DB_USER})")
    print(f"🗄️ BD VPS: {VPS_DB_NAME}")
    print()
    
    # Confirmar antes de proceder
    print("⚠️ ADVERTENCIA: Esto reemplazará completamente la base de datos en el VPS")
    confirm = input("¿Continuar? (y/N): ")
    if confirm.lower() != 'y':
        print("❌ Operación cancelada")
        return
    
    # Paso 1: Crear backup local
    backup_file = crear_backup_local()
    if not backup_file:
        print("❌ No se pudo crear el backup local")
        return
    
    try:
        # Paso 2: Subir al VPS
        if not subir_a_vps(backup_file):
            print("❌ No se pudo subir el archivo al VPS")
            return
        
        # Paso 3: Restaurar en VPS
        if not restaurar_en_vps(backup_file):
            print("❌ No se pudo restaurar en el VPS")
            return
        
        print("🎉 ¡Sincronización completada exitosamente!")
        print(f"🌐 Verifica en: http://{VPS_HOST}")
        print("🔑 Inicia sesión con: ebyted@hotmail.com")
        
    finally:
        # Limpiar archivo local
        try:
            os.remove(backup_file)
            print(f"🧹 Archivo local {backup_file} eliminado")
        except:
            print(f"⚠️ No se pudo eliminar {backup_file}")

if __name__ == '__main__':
    sincronizar()
