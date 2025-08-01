#!/usr/bin/env python3
"""
Script simple para sincronizar base de datos local con VPS
"""
import subprocess
import os
from datetime import datetime

# Configuración
VPS_CONFIG = {
    'host': 'tu-servidor.com',
    'user': 'usuario', 
    'path': '/ruta/a/tu/proyecto',
    'db_name': 'maestro_inventario'
}

def run_command(cmd, description):
    """Ejecutar comando y mostrar resultado"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completado")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error en {description}: {e}")
        print(f"Output: {e.output}")
        return False

def sync_database():
    """Sincronizar base de datos local con VPS"""
    print("🚀 Iniciando sincronización de base de datos...")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"backup_{timestamp}.sql"
    
    # 1. Crear backup local
    backup_cmd = f"docker-compose exec -T postgres pg_dump -U postgres {VPS_CONFIG['db_name']} > {backup_file}"
    if not run_command(backup_cmd, "Creando backup local"):
        return False
    
    # 2. Subir backup al VPS
    upload_cmd = f"scp {backup_file} {VPS_CONFIG['user']}@{VPS_CONFIG['host']}:{VPS_CONFIG['path']}/"
    if not run_command(upload_cmd, "Subiendo backup al VPS"):
        return False
    
    # 3. Ejecutar restauración en VPS
    restore_commands = f"""
    cd {VPS_CONFIG['path']} && \\
    docker-compose down && \\
    docker-compose up -d postgres && \\
    sleep 15 && \\
    docker-compose exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS {VPS_CONFIG['db_name']};" && \\
    docker-compose exec -T postgres psql -U postgres -c "CREATE DATABASE {VPS_CONFIG['db_name']};" && \\
    docker-compose exec -T postgres psql -U postgres -d {VPS_CONFIG['db_name']} < {backup_file} && \\
    docker-compose up -d && \\
    rm {backup_file}
    """
    
    ssh_cmd = f"ssh {VPS_CONFIG['user']}@{VPS_CONFIG['host']} '{restore_commands}'"
    if not run_command(ssh_cmd, "Restaurando en VPS"):
        return False
    
    # 4. Limpiar archivo local
    os.remove(backup_file)
    print("🧹 Archivo temporal eliminado")
    
    print("🎉 ¡Sincronización completada exitosamente!")
    return True

def verify_sync():
    """Verificar que la sincronización fue exitosa"""
    print("🔍 Verificando sincronización...")
    
    verify_cmd = f"""
    ssh {VPS_CONFIG['user']}@{VPS_CONFIG['host']} \\
    'cd {VPS_CONFIG['path']} && docker-compose exec -T backend python manage.py shell -c "
from core.models import *
print(f\"Productos: {{Product.objects.count()}}\")
print(f\"Variantes: {{ProductVariant.objects.count()}}\")  
print(f\"Marcas: {{Brand.objects.count()}}\")
print(f\"Usuarios: {{User.objects.count()}}\")
"'
    """
    
    run_command(verify_cmd, "Verificando datos en VPS")

if __name__ == '__main__':
    print("=" * 50)
    print("🔄 SINCRONIZACIÓN DE BASE DE DATOS LOCAL → VPS")
    print("=" * 50)
    
    # Verificar configuración
    print(f"🎯 VPS: {VPS_CONFIG['host']}")
    print(f"👤 Usuario: {VPS_CONFIG['user']}")
    print(f"📁 Ruta: {VPS_CONFIG['path']}")
    print(f"🗄️ Base de datos: {VPS_CONFIG['db_name']}")
    print()
    
    # Confirmar antes de proceder
    confirm = input("¿Continuar con la sincronización? (y/N): ")
    if confirm.lower() != 'y':
        print("❌ Operación cancelada")
        exit(0)
    
    # Ejecutar sincronización
    if sync_database():
        verify_sync()
    else:
        print("❌ Sincronización falló")
        exit(1)
