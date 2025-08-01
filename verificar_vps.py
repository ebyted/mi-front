#!/usr/bin/env python3
"""
Script para verificar datos en el VPS
"""
import subprocess

VPS_HOST = "168.231.67.221"
VPS_USER = "root"
VPS_CONTAINER = "maestro_db"
VPS_PASSWORD = "Arkano-IA2025+"

def ejecutar_en_vps(comando, descripcion):
    """Ejecutar comando en VPS usando sshpass"""
    print(f"🔍 {descripcion}...")
    
    # Usar sshpass para autenticación automática
    ssh_cmd = f"sshpass -p '{VPS_PASSWORD}' ssh -o StrictHostKeyChecking=no {VPS_USER}@{VPS_HOST} '{comando}'"
    
    try:
        result = subprocess.run(ssh_cmd, shell=True, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            return result.stdout.strip()
        else:
            print(f"❌ Error: {result.stderr}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def verificar_vps():
    """Verificar estado del VPS y base de datos"""
    print("🚀 VERIFICANDO VPS Y BASE DE DATOS")
    print("=" * 50)
    print(f"🎯 VPS: {VPS_HOST}")
    print(f"👤 Usuario: {VPS_USER}")
    print(f"🐳 Contenedor: {VPS_CONTAINER}")
    print()
    
    # 1. Verificar conexión SSH
    conexion = ejecutar_en_vps("echo 'Conexión SSH exitosa'", "Verificando conexión SSH")
    if not conexion:
        print("❌ No se puede conectar al VPS")
        return
    print(f"✅ {conexion}")
    print()
    
    # 2. Verificar contenedores Docker
    contenedores = ejecutar_en_vps("docker ps --format 'table {{.Names}}\\t{{.Image}}\\t{{.Status}}'", "Listando contenedores Docker")
    if contenedores:
        print("🐳 CONTENEDORES EN EJECUCIÓN:")
        print(contenedores)
        print()
    
    # 3. Verificar si existe el contenedor maestro_db
    contenedor_existe = ejecutar_en_vps(f"docker ps --filter 'name={VPS_CONTAINER}' --format '{{{{.Names}}}}'", f"Verificando contenedor {VPS_CONTAINER}")
    if contenedor_existe and VPS_CONTAINER in contenedor_existe:
        print(f"✅ Contenedor {VPS_CONTAINER} encontrado y en ejecución")
    else:
        print(f"❌ Contenedor {VPS_CONTAINER} no encontrado o no está en ejecución")
        
        # Intentar ver todos los contenedores
        todos_contenedores = ejecutar_en_vps("docker ps -a --format '{{.Names}}'", "Verificando todos los contenedores")
        if todos_contenedores:
            print("📋 Todos los contenedores disponibles:")
            for contenedor in todos_contenedores.split('\n'):
                if contenedor.strip():
                    print(f"  - {contenedor}")
        return
    print()
    
    # 4. Verificar bases de datos disponibles
    bases_datos = ejecutar_en_vps(f"docker exec {VPS_CONTAINER} psql -U maestro -l", "Listando bases de datos")
    if bases_datos:
        print("🗄️ BASES DE DATOS DISPONIBLES:")
        print(bases_datos)
        print()
    
    # 5. Verificar si existe la base de datos maestro_inventario
    db_existe = ejecutar_en_vps(f"docker exec {VPS_CONTAINER} psql -U maestro -lqt | cut -d \\| -f 1 | grep -w maestro_inventario", "Verificando base de datos maestro_inventario")
    if db_existe and db_existe.strip():
        print("✅ Base de datos 'maestro_inventario' encontrada")
        
        # 6. Verificar tablas y datos
        print("\n📊 VERIFICANDO DATOS EN LA BASE DE DATOS:")
        
        # Contar registros en tablas principales
        consulta_datos = f"""
        docker exec {VPS_CONTAINER} psql -U maestro -d maestro_inventario -c "
        SELECT 
            'Productos' as tabla, COUNT(*) as registros FROM core_product
        UNION ALL
        SELECT 
            'Variantes' as tabla, COUNT(*) as registros FROM core_productvariant
        UNION ALL
        SELECT 
            'Marcas' as tabla, COUNT(*) as registros FROM core_brand
        UNION ALL
        SELECT 
            'Categorias' as tabla, COUNT(*) as registros FROM core_category
        UNION ALL
        SELECT 
            'Usuarios' as tabla, COUNT(*) as registros FROM core_user
        UNION ALL
        SELECT 
            'Almacenes' as tabla, COUNT(*) as registros FROM core_warehouse;
        "
        """
        
        datos = ejecutar_en_vps(consulta_datos, "Contando registros en tablas principales")
        if datos:
            print(datos)
            print()
        
        # 7. Verificar algunos productos de ejemplo
        productos_ejemplo = ejecutar_en_vps(f"docker exec {VPS_CONTAINER} psql -U maestro -d maestro_inventario -c \"SELECT name, id FROM core_product LIMIT 5;\"", "Mostrando productos de ejemplo")
        if productos_ejemplo:
            print("📦 PRODUCTOS DE EJEMPLO:")
            print(productos_ejemplo)
            print()
        
        # 8. Verificar usuarios
        usuarios = ejecutar_en_vps(f"docker exec {VPS_CONTAINER} psql -U maestro -d maestro_inventario -c \"SELECT email, first_name, last_name FROM core_user;\"", "Mostrando usuarios")
        if usuarios:
            print("👤 USUARIOS REGISTRADOS:")
            print(usuarios)
            print()
            
    else:
        print("❌ Base de datos 'maestro_inventario' no encontrada")
        
        # Intentar con otras bases de datos posibles
        otras_bases = ejecutar_en_vps(f"docker exec {VPS_CONTAINER} psql -U maestro -lqt | cut -d \\| -f 1 | grep -v template | grep -v postgres | head -5", "Buscando otras bases de datos")
        if otras_bases:
            print("📋 Otras bases de datos encontradas:")
            for db in otras_bases.split('\n'):
                if db.strip():
                    print(f"  - {db.strip()}")
    
    # 9. Verificar puertos en uso
    puertos = ejecutar_en_vps("netstat -tlnp | grep -E ':(80|3000|8000|5432)' | head -5", "Verificando puertos en uso")
    if puertos:
        print("🌐 PUERTOS EN USO:")
        print(puertos)
        print()
    
    print("✅ Verificación completada!")

if __name__ == '__main__':
    verificar_vps()
