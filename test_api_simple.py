#!/usr/bin/env python3
"""
Script simple usando urllib para probar la API sin dependencias externas
"""

import urllib.request
import urllib.parse
import json
import sys
import os

# Agregar el directorio del proyecto al path de Python
project_path = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_path)

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
import django
django.setup()

# Ahora importar los modelos
from core.models import User, Product, Warehouse

def get_auth_token():
    """Obtener token usando urllib"""
    url = "http://127.0.0.1:8030/api/token/"
    
    # Buscar un usuario activo
    user = User.objects.filter(is_active=True, is_superuser=True).first()
    if not user:
        print("❌ No se encontró un superusuario activo")
        return None
    
    print(f"📧 Usando usuario: {user.email}")
    
    data = {
        "username": user.email,
        "password": "123456789"  # Contraseña común de desarrollo
    }
    
    json_data = json.dumps(data).encode('utf-8')
    
    req = urllib.request.Request(
        url, 
        data=json_data, 
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            return result.get("access")
    except Exception as e:
        print(f"❌ Error obteniendo token: {e}")
        return None

def test_api_directly():
    """Probar la API directamente usando los modelos de Django"""
    print("🔧 Probando funcionalidad usando Django directamente...")
    
    # Importar las vistas y serializers
    from core.views import InventoryMovementViewSet
    from core.serializers import InventoryMovementSerializer
    from django.test import RequestFactory
    from django.contrib.auth.models import AnonymousUser
    from rest_framework.test import APIRequestFactory
    
    # Crear una request de prueba
    factory = APIRequestFactory()
    
    # Datos de prueba
    movement_data = {
        "warehouse_id": 1,
        "type": "IN",
        "notes": "Movimiento de prueba directo",
        "details": [
            {
                "product_id": 501,
                "quantity": 10,
                "expiration_date": "2025-12-31",
                "notes": "Detalle de prueba"
            }
        ]
    }
    
    print("📦 Datos de prueba:")
    print(json.dumps(movement_data, indent=2))
    
    # Crear request POST
    request = factory.post('/api/inventory-movements/', movement_data, format='json')
    
    # Obtener un usuario para la request
    user = User.objects.filter(is_active=True).first()
    if user:
        request.user = user
        print(f"👤 Usuario de prueba: {user.email}")
    else:
        print("❌ No se encontró usuario activo")
        return
    
    # Crear la vista
    view = InventoryMovementViewSet()
    view.request = request
    view.format_kwarg = None
    
    try:
        # Intentar crear el movimiento
        response = view.create(request)
        print(f"✅ Respuesta: {response.status_code}")
        print(f"📄 Datos: {response.data}")
        
        return response
    except Exception as e:
        print(f"❌ Error en la vista: {e}")
        import traceback
        traceback.print_exc()
        return None

def main():
    print("🧪 Diagnóstico de API de Movimientos de Inventario")
    print("=" * 60)
    
    print("\n1️⃣ Verificando datos disponibles...")
    products = Product.objects.all()[:3]
    warehouses = Warehouse.objects.all()
    users = User.objects.filter(is_active=True)
    
    print(f"📦 Productos disponibles: {products.count()}")
    for p in products:
        print(f"  - {p.id}: {p.name}")
    
    print(f"🏪 Almacenes disponibles: {warehouses.count()}")
    for w in warehouses:
        print(f"  - {w.id}: {w.name}")
    
    print(f"👥 Usuarios activos: {users.count()}")
    for u in users[:3]:
        print(f"  - {u.email} ({'admin' if u.is_superuser else 'user'})")
    
    print("\n2️⃣ Probando API con token...")
    token = get_auth_token()
    if token:
        print(f"✅ Token obtenido: {token[:20]}...")
    else:
        print("❌ No se pudo obtener token")
    
    print("\n3️⃣ Probando funcionalidad directamente...")
    response = test_api_directly()

if __name__ == "__main__":
    main()
