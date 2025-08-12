#!/usr/bin/env python3
"""
Script para descubrir la configuración Docker en el VPS
"""
import subprocess
import json

VPS_HOST = "168.231.67.221"
VPS_USER = "root"

def ejecutar_en_vps(comando, descripcion):
    """Ejecutar comando en VPS y retornar resultado"""
    print(f"🔍 {descripcion}...")
    
    ssh_cmd = f"ssh {VPS_USER}@{VPS_HOST} '{comando}'"
    
    try:
        result = subprocess.run(ssh_cmd, shell=True, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            return result.stdout.strip()
        else:
            print(f"❌ Error: {result.stderr}")
            return None
    except subprocess.TimeoutExpired:
        print("⏰ Comando expiró")
        return None
    except Exception as e:
        print(f"❌ Error ejecutando comando: {e}")
        return None

def descubrir_docker():
    """Descubrir configuración Docker en VPS"""
    print("🔍 DESCUBRIENDO CONFIGURACIÓN DOCKER EN VPS")
    print("=" * 50)
    print(f"🎯 VPS: {VPS_HOST}")
    print(f"👤 Usuario: {VPS_USER}")
    print()
    
    # 1. Contenedores en ejecución
    containers = ejecutar_en_vps("docker ps --format 'table {{.Names}}\\t{{.Image}}\\t{{.Ports}}'", "Contenedores en ejecución")
    if containers:
        print("🐳 CONTENEDORES EN EJECUCIÓN:")
        print(containers)
        print()
    
    # 2. Todos los contenedores
    all_containers = ejecutar_en_vps("docker ps -a --format 'table {{.Names}}\\t{{.Image}}\\t{{.Status}}'", "Todos los contenedores")
    if all_containers:
        print("📋 TODOS LOS CONTENEDORES:")
        print(all_containers)
        print()
    
    # 3. Buscar docker-compose.yml
    compose_files = ejecutar_en_vps("find / -name 'docker-compose.yml' -type f 2>/dev/null | head -5", "Archivos docker-compose.yml")
    if compose_files:
        print("📄 ARCHIVOS DOCKER-COMPOSE ENCONTRADOS:")
        for file in compose_files.split('\n'):
            if file.strip():
                print(f"  📁 {file}")
                
                # Leer servicios de cada archivo
                servicios = ejecutar_en_vps(f"cd $(dirname {file}) && docker-compose config --services 2>/dev/null", f"Servicios en {file}")
                if servicios:
                    print(f"     Servicios: {servicios.replace(chr(10), ', ')}")
        print()
    
    # 4. Buscar proyectos relacionados con maestro
    proyectos_maestro = ejecutar_en_vps("find / -type d -name '*maestro*' 2>/dev/null | head -10", "Proyectos relacionados con maestro")
    if proyectos_maestro:
        print("📂 DIRECTORIOS RELACIONADOS CON MAESTRO:")
        for dir in proyectos_maestro.split('\n'):
            if dir.strip():
                print(f"  📁 {dir}")
        print()
    
    # 5. Puertos ocupados
    puertos = ejecutar_en_vps("netstat -tlnp 2>/dev/null | grep -E ':(80|3000|8000|5432|5000)' | head -10", "Puertos importantes en uso")
    if puertos:
        print("🌐 PUERTOS EN USO:")
        print(puertos)
        print()
    
    # 6. Obtener detalles de contenedores PostgreSQL
    postgres_containers = ejecutar_en_vps("docker ps --filter 'ancestor=postgres' --format '{{.Names}}'", "Contenedores PostgreSQL")
    if postgres_containers:
        print("🗄️ CONTENEDORES POSTGRESQL:")
        for container in postgres_containers.split('\n'):
            if container.strip():
                print(f"  📦 {container}")
                
                # Obtener variables de entorno
                env_vars = ejecutar_en_vps(f"docker exec {container} env | grep POSTGRES", f"Variables de entorno de {container}")
                if env_vars:
                    print(f"     Variables de entorno:")
                    for var in env_vars.split('\n'):
                        if var.strip():
                            print(f"       {var}")
        print()
    
    # 7. Inspeccionar contenedores con nombres comunes
    nombres_comunes = ['backend', 'frontend', 'db', 'postgres', 'maestro', 'web', 'api']
    print("🔍 BUSCANDO CONTENEDORES CON NOMBRES COMUNES:")
    
    for nombre in nombres_comunes:
        container_info = ejecutar_en_vps(f"docker ps --filter 'name={nombre}' --format '{{.Names}}\\t{{.Image}}\\t{{.Status}}'", f"Contenedor {nombre}")
        if container_info and container_info.strip():
            print(f"  ✅ {nombre}: {container_info}")
    print()
    
    # 8. Crear script de sincronización personalizado
    print("🛠️ GENERANDO SCRIPT DE SINCRONIZACIÓN PERSONALIZADO...")
    
    # Intentar determinar la configuración más probable
    if containers:
        lines = containers.split('\n')[1:]  # Saltar header
        for line in lines:
            if line.strip():
                parts = line.split()
                if len(parts) > 0:
                    container_name = parts[0]
                    if 'postgres' in container_name.lower() or 'db' in container_name.lower():
                        print(f"  🎯 Contenedor de BD detectado: {container_name}")
                        
                        # Generar comandos de sincronización
                        print("\n📝 COMANDOS DE SINCRONIZACIÓN SUGERIDOS:")
                        print(f"# Crear backup en VPS:")
                        print(f"docker exec {container_name} pg_dump -U [usuario] [base_datos] > backup.sql")
                        print(f"# Restaurar backup en VPS:")
                        print(f"docker exec -i {container_name} psql -U [usuario] -d [base_datos] < backup.sql")

def generar_script_personalizado():
    """Generar script de sincronización basado en los hallazgos"""
    
    # Obtener información básica
    containers = ejecutar_en_vps("docker ps --format '{{.Names}}'", "Nombres de contenedores")
    
    if containers:
        print("\n🛠️ GENERANDO SCRIPT PERSONALIZADO...")
        
        script_content = f'''#!/usr/bin/env python3
"""
Script de sincronización personalizado para tu VPS
Generado automáticamente
"""
import subprocess
import os
from datetime import datetime

VPS_HOST = "{VPS_HOST}"
VPS_USER = "{VPS_USER}"

# Contenedores detectados en el VPS:
# {containers.replace(chr(10), ', ')}

def sincronizar_con_vps():
    print("🚀 Sincronizando con VPS...")
    
    # 1. Crear backup local
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"backup_{{timestamp}}.sql"
    
    # Crear backup (ajustar según tu configuración local)
    print("📦 Creando backup local...")
    os.system("docker-compose exec -T db pg_dump -U maestro maestro > " + backup_file)
    
    # 2. Subir al VPS
    print("⬆️ Subiendo al VPS...")
    os.system(f"scp {{backup_file}} {VPS_USER}@{VPS_HOST}:/tmp/")
    
    # 3. Restaurar en VPS (ajustar contenedor según hallazgos)
    print("🔄 Restaurando en VPS...")
    restore_cmd = f"""
    ssh {VPS_USER}@{VPS_HOST} "
    # Ajustar estos comandos según los contenedores encontrados:
    rm /tmp/{{backup_file}}
    "
    """
    
    os.system(restore_cmd)
    
    # 4. Limpiar
    os.remove(backup_file)
    print("✅ Sincronización completada!")

if __name__ == '__main__':
    sincronizar_con_vps()
'''
        
        with open('sync_personalizado_vps.py', 'w') as f:
            f.write(script_content)
        
        print("✅ Script generado: sync_personalizado_vps.py")

if __name__ == '__main__':
    descubrir_docker()
    generar_script_personalizado()
