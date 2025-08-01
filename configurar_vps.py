#!/usr/bin/env python3
"""
Configurador para sincronización de base de datos con VPS
Ejecuta este script primero para configurar tus datos
"""

def create_config():
    """Crear archivo de configuración interactivo"""
    print("🔧 CONFIGURADOR DE SINCRONIZACIÓN VPS")
    print("=" * 40)
    
    # Solicitar datos del VPS
    vps_host = input("🌐 IP o dominio del VPS: ")
    vps_user = input("👤 Usuario SSH: ")
    vps_path = input("📁 Ruta del proyecto en VPS: ")
    db_name = input("🗄️ Nombre de la base de datos [maestro_inventario]: ") or "maestro_inventario"
    
    # Crear archivo de configuración
    config_content = f"""# Configuración para sincronización VPS
VPS_HOST = "{vps_host}"
VPS_USER = "{vps_user}"
VPS_PATH = "{vps_path}"
DB_NAME = "{db_name}"

# Comandos de ejemplo para usar:
# 1. Crear backup: docker-compose exec postgres pg_dump -U postgres {db_name} > backup.sql
# 2. Subir: scp backup.sql {vps_user}@{vps_host}:{vps_path}/
# 3. Restaurar en VPS: ssh {vps_user}@{vps_host} "cd {vps_path} && docker-compose exec postgres psql -U postgres -d {db_name} < backup.sql"
"""
    
    with open('vps_config.py', 'w') as f:
        f.write(config_content)
    
    print("\n✅ Configuración guardada en vps_config.py")
    
    # Crear script de sincronización personalizado
    sync_script = f"""#!/usr/bin/env python3
import subprocess
import os
from datetime import datetime

# Configuración
VPS_HOST = "{vps_host}"
VPS_USER = "{vps_user}"  
VPS_PATH = "{vps_path}"
DB_NAME = "{db_name}"

def sync_to_vps():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"backup_{{timestamp}}.sql"
    
    print("🚀 Sincronizando con VPS...")
    
    # 1. Crear backup
    print("📦 Creando backup...")
    os.system(f"docker-compose exec -T postgres pg_dump -U postgres {{DB_NAME}} > {{backup_file}}")
    
    # 2. Subir al VPS
    print("⬆️ Subiendo al VPS...")
    os.system(f"scp {{backup_file}} {{VPS_USER}}@{{VPS_HOST}}:{{VPS_PATH}}/")
    
    # 3. Restaurar en VPS
    print("🔄 Restaurando en VPS...")
    restore_cmd = f'''ssh {{VPS_USER}}@{{VPS_HOST}} "
    cd {{VPS_PATH}} && 
    docker-compose down && 
    docker-compose up -d postgres && 
    sleep 10 && 
    docker-compose exec -T postgres psql -U postgres -c 'DROP DATABASE IF EXISTS {{DB_NAME}};' && 
    docker-compose exec -T postgres psql -U postgres -c 'CREATE DATABASE {{DB_NAME}};' && 
    docker-compose exec -T postgres psql -U postgres -d {{DB_NAME}} < {{backup_file}} && 
    docker-compose up -d && 
    rm {{backup_file}}
    "'''
    
    os.system(restore_cmd)
    
    # 4. Limpiar
    os.remove(backup_file)
    print("✅ Sincronización completada!")

if __name__ == '__main__':
    sync_to_vps()
"""
    
    with open('sync_configurado.py', 'w') as f:
        f.write(sync_script)
    
    print("✅ Script personalizado creado: sync_configurado.py")
    
    # Crear comandos manuales
    manual_commands = f"""
# COMANDOS MANUALES PARA SINCRONIZACIÓN
# ====================================

# 1. CREAR BACKUP LOCAL:
docker-compose exec -T postgres pg_dump -U postgres {db_name} > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. SUBIR AL VPS:
scp backup_*.sql {vps_user}@{vps_host}:{vps_path}/

# 3. CONECTAR AL VPS:
ssh {vps_user}@{vps_host}

# 4. EN EL VPS - RESTAURAR:
cd {vps_path}
docker-compose down
docker-compose up -d postgres
sleep 10
docker-compose exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS {db_name};"
docker-compose exec -T postgres psql -U postgres -c "CREATE DATABASE {db_name};"
docker-compose exec -T postgres psql -U postgres -d {db_name} < backup_*.sql
docker-compose up -d

# 5. VERIFICAR:
docker-compose exec backend python manage.py shell -c "
from core.models import *
print(f'Productos: {{Product.objects.count()}}')
print(f'Variantes: {{ProductVariant.objects.count()}}')
"
"""
    
    with open('comandos_manuales.txt', 'w') as f:
        f.write(manual_commands)
    
    print("✅ Comandos manuales guardados en: comandos_manuales.txt")
    
    print(f"""
🎉 CONFIGURACIÓN COMPLETA!

📁 Archivos creados:
- vps_config.py (configuración)
- sync_configurado.py (script automático)  
- comandos_manuales.txt (comandos paso a paso)

🚀 Para sincronizar:
python sync_configurado.py

📋 O sigue los pasos en comandos_manuales.txt
""")

if __name__ == '__main__':
    create_config()
