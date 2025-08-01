#!/usr/bin/env python3
"""
Script para exportar datos de PostgreSQL local y sincronizar con VPS
usando Django fixtures
"""
import os
import sys
import subprocess
import json
from datetime import datetime

def export_local_data():
    """Exportar datos locales usando Django fixtures"""
    print("📦 Exportando datos locales...")
    
    # Lista de modelos a exportar
    models = [
        'core.Business',
        'core.Brand', 
        'core.Category',
        'core.Unit',
        'core.Warehouse',
        'core.Supplier',
        'core.Product',
        'core.ProductVariant',
        'core.User',
        'core.Role',
    ]
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    for model in models:
        model_name = model.split('.')[-1].lower()
        filename = f"fixture_{model_name}_{timestamp}.json"
        
        print(f"  Exportando {model}...")
        
        # Ejecutar dumpdata en el contenedor Django
        cmd = [
            'docker-compose', 'exec', 'backend', 
            'python', 'manage.py', 'dumpdata', 
            model, '--indent', '2', '--output', f'/app/{filename}'
        ]
        
        subprocess.run(cmd, check=True)
        
        # Copiar desde el contenedor al host
        subprocess.run([
            'docker', 'cp', 
            f'maestro_backend:/app/{filename}', 
            f'./{filename}'
        ], check=True)
        
        print(f"  ✅ {filename} exportado")
    
    print("✅ Exportación local completada!")
    return timestamp

def create_sync_script(timestamp):
    """Crear script para sincronizar en VPS"""
    script_content = f"""#!/bin/bash
# Script de sincronización automática para VPS
# Generado: {datetime.now()}

echo "🚀 Sincronizando datos en VPS..."

# Parar servicios
docker-compose down

# Iniciar solo PostgreSQL y backend
docker-compose up -d postgres
sleep 10
docker-compose up -d backend
sleep 5

# Limpiar datos existentes (solo si es necesario)
# docker-compose exec backend python manage.py flush --noinput

# Cargar fixtures en orden
echo "📥 Cargando Business..."
docker-compose exec backend python manage.py loaddata fixture_business_{timestamp}.json

echo "📥 Cargando Units..."
docker-compose exec backend python manage.py loaddata fixture_unit_{timestamp}.json

echo "📥 Cargando Brands..."
docker-compose exec backend python manage.py loaddata fixture_brand_{timestamp}.json

echo "📥 Cargando Categories..."
docker-compose exec backend python manage.py loaddata fixture_category_{timestamp}.json

echo "📥 Cargando Warehouses..."
docker-compose exec backend python manage.py loaddata fixture_warehouse_{timestamp}.json

echo "📥 Cargando Suppliers..."
docker-compose exec backend python manage.py loaddata fixture_supplier_{timestamp}.json

echo "📥 Cargando Products..."
docker-compose exec backend python manage.py loaddata fixture_product_{timestamp}.json

echo "📥 Cargando ProductVariants..."
docker-compose exec backend python manage.py loaddata fixture_productvariant_{timestamp}.json

echo "📥 Cargando Users..."
docker-compose exec backend python manage.py loaddata fixture_user_{timestamp}.json

echo "📥 Cargando Roles..."
docker-compose exec backend python manage.py loaddata fixture_role_{timestamp}.json

# Iniciar todos los servicios
docker-compose up -d

echo "✅ Sincronización completada!"
echo "📊 Verificando datos..."
docker-compose exec backend python manage.py shell -c "
from core.models import *
print(f'Productos: {{Product.objects.count()}}')
print(f'Variantes: {{ProductVariant.objects.count()}}')
print(f'Marcas: {{Brand.objects.count()}}')
print(f'Categorías: {{Category.objects.count()}}')
print(f'Usuarios: {{User.objects.count()}}')
"
"""
    
    with open(f'sync_vps_{timestamp}.sh', 'w') as f:
        f.write(script_content)
    
    # Hacer ejecutable
    os.chmod(f'sync_vps_{timestamp}.sh', 0o755)
    
    print(f"✅ Script de VPS creado: sync_vps_{timestamp}.sh")

def create_upload_script(timestamp):
    """Crear script para subir archivos al VPS"""
    upload_script = f"""#!/bin/bash
# Script para subir fixtures al VPS

VPS_HOST="tu-servidor.com"
VPS_USER="usuario"
VPS_PATH="/ruta/a/tu/proyecto"

echo "⬆️ Subiendo fixtures al VPS..."

# Subir todos los fixtures
scp fixture_*_{timestamp}.json $VPS_USER@$VPS_HOST:$VPS_PATH/
scp sync_vps_{timestamp}.sh $VPS_USER@$VPS_HOST:$VPS_PATH/

echo "🔄 Ejecutando sincronización en VPS..."
ssh $VPS_USER@$VPS_HOST "cd $VPS_PATH && ./sync_vps_{timestamp}.sh"

echo "✅ Sincronización con VPS completada!"
"""
    
    with open(f'upload_to_vps_{timestamp}.sh', 'w') as f:
        f.write(upload_script)
    
    os.chmod(f'upload_to_vps_{timestamp}.sh', 0o755)
    
    print(f"✅ Script de subida creado: upload_to_vps_{timestamp}.sh")

if __name__ == '__main__':
    print("🚀 Iniciando proceso de sincronización...")
    
    # Exportar datos locales
    timestamp = export_local_data()
    
    # Crear scripts de sincronización
    create_sync_script(timestamp)
    create_upload_script(timestamp)
    
    print(f"""
✅ Proceso completado!

📋 Pasos siguientes:
1. Edita upload_to_vps_{timestamp}.sh con los datos de tu VPS
2. Ejecuta: ./upload_to_vps_{timestamp}.sh

🔧 O manualmente:
1. Sube los archivos fixture_*_{timestamp}.json al VPS
2. Sube sync_vps_{timestamp}.sh al VPS  
3. En el VPS ejecuta: ./sync_vps_{timestamp}.sh
""")
