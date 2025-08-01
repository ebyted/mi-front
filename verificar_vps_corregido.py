#!/usr/bin/env python3
"""
Script para verificar datos en VPS con comandos corregidos
"""
import subprocess

VPS_HOST = "168.231.67.221"
VPS_USER = "root"
VPS_PASSWORD = "Arkano-IA2025+"
VPS_CONTAINER = "maestro_db"

def ejecutar_comando_vps(comando, descripcion):
    """Ejecutar comando en VPS"""
    print(f"🔍 {descripcion}...")
    
    # Comando SSH con contraseña
    ssh_cmd = f"sshpass -p '{VPS_PASSWORD}' ssh -o StrictHostKeyChecking=no {VPS_USER}@{VPS_HOST} '{comando}'"
    
    try:
        result = subprocess.run(ssh_cmd, shell=True, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            return True, result.stdout.strip()
        else:
            return False, result.stderr.strip()
    except Exception as e:
        return False, str(e)

def verificar_datos_vps():
    """Verificar datos en VPS"""
    print("🚀 VERIFICANDO DATOS EN VPS")
    print("=" * 40)
    print(f"🎯 VPS: {VPS_HOST}")
    print(f"🐳 Contenedor: {VPS_CONTAINER}")
    print()
    
    # 1. Verificar contenedor en ejecución
    success, result = ejecutar_comando_vps("docker ps | grep maestro_db", "Verificando contenedor maestro_db")
    if success and result:
        print("✅ Contenedor maestro_db está en ejecución")
        print(f"   {result}")
    else:
        print("❌ Contenedor maestro_db no encontrado")
        return
    print()
    
    # 2. Listar bases de datos disponibles
    success, result = ejecutar_comando_vps(f"docker exec {VPS_CONTAINER} psql -U maestro -l", "Listando bases de datos")
    if success:
        print("🗄️ BASES DE DATOS DISPONIBLES:")
        print(result)
        print()
    else:
        print(f"❌ Error listando bases de datos: {result}")
        return
    
    # 3. Intentar con diferentes nombres de base de datos
    bases_posibles = ["maestro_inventario", "maestro", "postgres", "django"]
    
    for base_datos in bases_posibles:
        print(f"🔍 Probando base de datos: {base_datos}")
        
        # Verificar si la base de datos existe y tiene tablas
        success, result = ejecutar_comando_vps(
            f"docker exec {VPS_CONTAINER} psql -U maestro -d {base_datos} -c \"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'core_%' LIMIT 5;\"",
            f"Verificando tablas en {base_datos}"
        )
        
        if success and "core_" in result:
            print(f"✅ ¡Encontrada base de datos con datos! -> {base_datos}")
            print("📋 Tablas encontradas:")
            print(result)
            
            # Contar registros
            success, result = ejecutar_comando_vps(
                f"docker exec {VPS_CONTAINER} psql -U maestro -d {base_datos} -c \"SELECT 'Productos' as tabla, COUNT(*) as registros FROM core_product UNION ALL SELECT 'Variantes' as tabla, COUNT(*) as registros FROM core_productvariant UNION ALL SELECT 'Marcas' as tabla, COUNT(*) as registros FROM core_brand UNION ALL SELECT 'Usuarios' as tabla, COUNT(*) as registros FROM core_user;\"",
                f"Contando datos en {base_datos}"
            )
            
            if success:
                print("\n📊 CONTEO DE DATOS:")
                print(result)
            
            # Mostrar algunos productos
            success, result = ejecutar_comando_vps(
                f"docker exec {VPS_CONTAINER} psql -U maestro -d {base_datos} -c \"SELECT id, name FROM core_product LIMIT 3;\"",
                f"Mostrando productos de ejemplo"
            )
            
            if success:
                print("\n📦 PRODUCTOS DE EJEMPLO:")
                print(result)
            
            # Mostrar usuarios
            success, result = ejecutar_comando_vps(
                f"docker exec {VPS_CONTAINER} psql -U maestro -d {base_datos} -c \"SELECT email, first_name, last_name FROM core_user;\"",
                f"Mostrando usuarios"
            )
            
            if success:
                print("\n👤 USUARIOS:")
                print(result)
            
            print(f"\n✅ Base de datos activa: {base_datos}")
            return base_datos
            
        elif success:
            print(f"   ℹ️ Base de datos {base_datos} existe pero no tiene datos Django")
        else:
            print(f"   ❌ No se puede acceder a {base_datos}")
        print()
    
    print("❌ No se encontraron bases de datos con datos Django")
    return None

def comandos_manuales():
    """Mostrar comandos para ejecutar manualmente"""
    print("\n" + "="*50)
    print("📋 COMANDOS PARA EJECUTAR MANUALMENTE EN VPS:")
    print("="*50)
    print(f"ssh {VPS_USER}@{VPS_HOST}")
    print()
    print("# 1. Ver contenedores:")
    print("docker ps")
    print()
    print("# 2. Ver bases de datos:")
    print(f"docker exec {VPS_CONTAINER} psql -U maestro -l")
    print()
    print("# 3. Verificar datos (prueba con cada base de datos):")
    print(f"docker exec {VPS_CONTAINER} psql -U maestro -d maestro_inventario -c \"SELECT COUNT(*) FROM core_product;\"")
    print(f"docker exec {VPS_CONTAINER} psql -U maestro -d maestro -c \"SELECT COUNT(*) FROM core_product;\"")
    print(f"docker exec {VPS_CONTAINER} psql -U maestro -d postgres -c \"SELECT COUNT(*) FROM core_product;\"")
    print()
    print("# 4. Si encuentras datos, ver detalles:")
    print(f"docker exec {VPS_CONTAINER} psql -U maestro -d NOMBRE_BD -c \"SELECT email FROM core_user;\"")

if __name__ == '__main__':
    base_encontrada = verificar_datos_vps()
    
    if not base_encontrada:
        comandos_manuales()
        print("\n💡 Si no hay datos, necesitas sincronizar desde tu local")
    else:
        print(f"\n🎉 ¡Datos encontrados en la base de datos: {base_encontrada}!")
        print("🌐 Tu aplicación debería estar funcionando en el VPS")
