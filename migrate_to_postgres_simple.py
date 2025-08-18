#!/usr/bin/env python
"""
Script simplificado para migrar de SQLite a PostgreSQL
Usa Django dumpdata/loaddata para una migración más confiable
"""

import os
import subprocess
import sys
import json
from datetime import datetime

def run_command(command, description=""):
    """Ejecutar comando y mostrar resultado"""
    if description:
        print(f"🔄 {description}")
    
    print(f"   📝 Ejecutando: {command}")
    
    try:
        result = subprocess.run(command, shell=True, check=True, 
                              capture_output=True, text=True, encoding='utf-8')
        
        if result.stdout:
            print(f"   ✅ {result.stdout.strip()}")
        
        return True, result.stdout
        
    except subprocess.CalledProcessError as e:
        print(f"   ❌ Error: {e}")
        if e.stdout:
            print(f"   📄 Output: {e.stdout}")
        if e.stderr:
            print(f"   🚨 Error: {e.stderr}")
        return False, None

def backup_current_db():
    """Crear respaldo de la BD actual antes de migrar"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_name = f"bdlocal_pre_postgres_{timestamp}.sqlite3"
    
    success, _ = run_command(
        f"copy db.sqlite3 {backup_name}",
        f"Creando respaldo de SQLite: {backup_name}"
    )
    
    return success, backup_name

def export_sqlite_data():
    """Exportar datos desde SQLite usando Django dumpdata"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    dump_file = f"sqlite_dump_{timestamp}.json"
    
    print("🔄 Exportando datos desde SQLite...")
    
    # Activar entorno virtual y exportar datos
    command = f".venv\\Scripts\\activate && python manage.py dumpdata --natural-foreign --natural-primary -e contenttypes -e auth.Permission --indent 2 > {dump_file}"
    
    success, _ = run_command(command, "Exportando datos con dumpdata")
    
    if success:
        # Verificar que el archivo se creó y tiene contenido
        if os.path.exists(dump_file) and os.path.getsize(dump_file) > 100:
            print(f"   ✅ Datos exportados a: {dump_file}")
            return True, dump_file
        else:
            print(f"   ❌ El archivo de exportación está vacío o no existe")
            return False, None
    
    return success, dump_file if success else None

def create_postgres_env():
    """Crear archivo .env para PostgreSQL"""
    postgres_env = """# PostgreSQL settings para migración
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost
DATABASE_ENGINE=django.db.backends.postgresql
DATABASE_NAME=maestro_inventario
DATABASE_USER=maestro
DATABASE_PASSWORD=maestro123
DATABASE_HOST=localhost
DATABASE_PORT=5433
SECRET_KEY=inventario-maestro-inventario-secret-key-123456789abcdef
"""
    
    with open('.env.postgres', 'w', encoding='utf-8') as f:
        f.write(postgres_env)
    
    print("✅ Configuración PostgreSQL creada en .env.postgres") 
    return True

def start_postgres_container():
    """Iniciar contenedor PostgreSQL usando Docker Compose"""
    print("🔄 Iniciando PostgreSQL con Docker...")
    
    # Verificar si Docker está disponible
    success, _ = run_command("docker --version", "Verificando Docker")
    if not success:
        print("❌ Docker no está disponible")
        return False
    
    # Iniciar PostgreSQL
    success, _ = run_command(
        "docker-compose -f docker-compose.postgres.yml up -d",
        "Iniciando contenedor PostgreSQL"
    )
    
    if success:
        print("   ⏳ Esperando que PostgreSQL esté listo...")
        # Esperar un poco para que PostgreSQL inicie
        import time
        time.sleep(10)
        
        # Verificar que PostgreSQL está corriendo
        success, _ = run_command(
            'docker exec maestro_postgres_local pg_isready -U maestro -d maestro_inventario',
            "Verificando estado de PostgreSQL"
        )
    
    return success

def run_migrations_postgres():
    """Ejecutar migraciones en PostgreSQL"""
    print("🔄 Ejecutando migraciones en PostgreSQL...")
    
    # Respaldar .env actual
    if os.path.exists('.env'):
        run_command("copy .env .env.backup", "Respaldando .env actual")
    
    # Usar configuración PostgreSQL
    run_command("copy .env.postgres .env", "Cambiando a configuración PostgreSQL")
    
    try:
        success, _ = run_command(
            ".venv\\Scripts\\activate && python manage.py migrate",
            "Ejecutando migraciones en PostgreSQL"
        )
        
        return success
        
    finally:
        # Restaurar .env original
        if os.path.exists('.env.backup'):
            run_command("copy .env.backup .env", "Restaurando .env original")
            run_command("del .env.backup", "Limpiando respaldo temporal")

def import_data_postgres(dump_file):
    """Importar datos a PostgreSQL"""
    print("🔄 Importando datos a PostgreSQL...")
    
    # Usar configuración PostgreSQL
    run_command("copy .env.postgres .env", "Cambiando a configuración PostgreSQL")
    
    try:
        success, _ = run_command(
            f".venv\\Scripts\\activate && python manage.py loaddata {dump_file}",
            "Importando datos con loaddata"
        )
        
        return success
        
    finally:
        # Restaurar .env original
        if os.path.exists('.env.backup'):
            run_command("copy .env.backup .env", "Restaurando .env original")

def verify_migration():
    """Verificar que la migración fue exitosa"""
    print("🔄 Verificando migración...")
    
    # Usar configuración PostgreSQL temporalmente
    if os.path.exists('.env'):
        run_command("copy .env .env.backup", "")
    run_command("copy .env.postgres .env", "")
    
    try:
        # Contar registros en algunas tablas principales
        tables_to_check = [
            "core.User",
            "core.Product", 
            "core.Warehouse",
            "core.InventoryMovement"
        ]
        
        all_success = True
        
        for table in tables_to_check:
            app_label, model_name = table.split('.')
            command = f'.venv\\Scripts\\activate && python -c "import django; django.setup(); from {app_label}.models import {model_name}; print(f\'{model_name}: {{len({model_name}.objects.all())}} registros\')"'
            
            success, output = run_command(command, f"Verificando tabla {table}")
            
            if success and output:
                print(f"   📊 {output.strip()}")
            else:
                all_success = False
        
        return all_success
        
    finally:
        # Restaurar configuración original
        if os.path.exists('.env.backup'):
            run_command("copy .env.backup .env", "")
            run_command("del .env.backup", "")

def main():
    """Función principal"""
    print("🚀 MIGRACIÓN DE SQLITE A POSTGRESQL")
    print("=" * 60)
    print("Este script migrará tu base de datos SQLite actual a PostgreSQL")
    print("usando Docker para PostgreSQL y Django dumpdata/loaddata")
    print("=" * 60)
    
    # Confirmación del usuario
    response = input("\n¿Continuar con la migración? (s/N): ").lower().strip()
    if response not in ['s', 'si', 'sí', 'y', 'yes']:
        print("❌ Migración cancelada por el usuario")
        return False
    
    # Paso 1: Crear respaldo
    print("\n📁 PASO 1: Creando respaldo de seguridad")
    success, backup_file = backup_current_db()
    if not success:
        print("❌ No se pudo crear el respaldo")
        return False
    
    # Paso 2: Exportar datos de SQLite
    print("\n📤 PASO 2: Exportando datos de SQLite")
    success, dump_file = export_sqlite_data()
    if not success:
        print("❌ No se pudieron exportar los datos")
        return False
    
    # Paso 3: Crear configuración PostgreSQL
    print("\n⚙️ PASO 3: Configurando PostgreSQL")
    create_postgres_env()
    
    # Paso 4: Iniciar PostgreSQL
    print("\n🐘 PASO 4: Iniciando PostgreSQL")
    success = start_postgres_container()
    if not success:
        print("❌ No se pudo iniciar PostgreSQL")
        print("💡 Alternativas:")
        print("   - Instalar PostgreSQL localmente en puerto 5433")
        print("   - Usar otro servicio PostgreSQL")
        return False
    
    # Paso 5: Ejecutar migraciones
    print("\n🔧 PASO 5: Ejecutando migraciones en PostgreSQL")
    success = run_migrations_postgres()
    if not success:
        print("❌ No se pudieron ejecutar las migraciones")
        return False
    
    # Paso 6: Importar datos
    print("\n📥 PASO 6: Importando datos a PostgreSQL")
    success = import_data_postgres(dump_file)
    if not success:
        print("❌ No se pudieron importar los datos")
        return False
    
    # Paso 7: Verificar migración
    print("\n✅ PASO 7: Verificando migración")
    success = verify_migration()
    
    # Resultado final
    print("\n" + "=" * 60)
    if success:
        print("🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE")
        print("=" * 60)
        print(f"📁 Respaldo SQLite: {backup_file}")
        print(f"📄 Archivo de datos: {dump_file}")
        print("🐘 PostgreSQL:")
        print("   - Host: localhost:5433")
        print("   - Database: maestro_inventario")
        print("   - Usuario: maestro")
        print("   - Password: maestro123")
        print("\n💡 Para usar PostgreSQL:")
        print("   1. copy .env.postgres .env")
        print("   2. Reiniciar el servidor Django")
        print("\n💡 Para volver a SQLite:")
        print("   1. Restaurar .env original")
        print("   2. Reiniciar el servidor Django")
    else:
        print("❌ MIGRACIÓN INCOMPLETA")
        print("=" * 60)
        print("Revisa los errores anteriores y vuelve a intentar")
    
    return success

if __name__ == "__main__":
    main()
