#!/usr/bin/env python3
"""
Script de prueba usando urllib con credenciales específicas
"""

import urllib.request
import urllib.parse
import json
import ssl

# Configuración
BASE_URL = "http://127.0.0.1:8030/api"
USERNAME = "admin@admin.com"
PASSWORD = "admin123"

def get_auth_token():
    """Obtener token de autenticación"""
    url = f"{BASE_URL}/token/"
    
    data = {
        "email": USERNAME,
        "password": PASSWORD
    }
    
    json_data = json.dumps(data).encode('utf-8')
    
    req = urllib.request.Request(
        url, 
        data=json_data, 
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        print(f"🔑 Intentando autenticar con {USERNAME}...")
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            print(f"✅ Token obtenido exitosamente")
            return result.get("access")
    except urllib.error.HTTPError as e:
        print(f"❌ Error HTTP {e.code}: {e.reason}")
        error_body = e.read().decode()
        print(f"   Detalles: {error_body}")
        return None
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return None

def test_create_movement(token):
    """Probar crear un movimiento de inventario"""
    url = f"{BASE_URL}/inventory-movements/"
    
    # Datos de prueba para un movimiento de inventario
    movement_data = {
        "warehouse_id": 1,  # Almacén "sancho"
        "type": "IN",       # Entrada
        "notes": "Movimiento de prueba desde API",
        "details": [
            {
                "product_id": 501,  # Primer producto encontrado
                "quantity": 10,
                "expiration_date": "2025-12-31",
                "notes": "Detalle de prueba API"
            },
            {
                "product_id": 502,  # Segundo producto encontrado
                "quantity": 5,
                "notes": "Otro detalle de prueba API"
            }
        ]
    }
    
    print(f"\n🔄 Enviando movimiento a {url}:")
    print(json.dumps(movement_data, indent=2))
    
    json_data = json.dumps(movement_data).encode('utf-8')
    
    req = urllib.request.Request(
        url,
        data=json_data,
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}'
        }
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            print(f"✅ Movimiento creado exitosamente! Status: {response.getcode()}")
            print("📄 Respuesta:")
            print(json.dumps(result, indent=2))
            return True
    except urllib.error.HTTPError as e:
        print(f"❌ Error HTTP {e.code}: {e.reason}")
        try:
            error_body = e.read().decode()
            print(f"   Detalles del error:")
            error_data = json.loads(error_body)
            print(json.dumps(error_data, indent=2))
        except:
            print(f"   Error body: {error_body}")
        return False
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return False

def test_list_movements(token):
    """Probar listar movimientos"""
    url = f"{BASE_URL}/inventory-movements/"
    
    req = urllib.request.Request(
        url,
        headers={'Authorization': f'Bearer {token}'}
    )
    
    try:
        print(f"\n📋 Obteniendo lista de movimientos...")
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            print(f"✅ Lista obtenida exitosamente! Status: {response.getcode()}")
            
            if isinstance(result, dict) and 'results' in result:
                movements = result['results']
            elif isinstance(result, list):
                movements = result
            else:
                movements = []
            
            print(f"📊 Total movimientos: {len(movements)}")
            
            for i, movement in enumerate(movements[-3:]):  # Mostrar últimos 3
                print(f"   {i+1}. ID: {movement.get('id')} - Almacén: {movement.get('warehouse_name')} - Tipo: {movement.get('movement_type')} - Fecha: {movement.get('created_at')}")
            
            return True
    except Exception as e:
        print(f"❌ Error obteniendo movimientos: {e}")
        return False

def main():
    print("🚀 Prueba completa de API de Movimientos de Inventario")
    print("=" * 60)
    
    # 1. Obtener token
    print("1️⃣ Obteniendo token de autenticación...")
    token = get_auth_token()
    
    if not token:
        print("❌ No se pudo obtener el token. Verifica las credenciales y que el servidor esté corriendo.")
        return False
    
    print(f"✅ Token obtenido: {token[:20]}...")
    
    # 2. Listar movimientos existentes
    print("\n2️⃣ Listando movimientos existentes...")
    test_list_movements(token)
    
    # 3. Crear nuevo movimiento
    print("\n3️⃣ Creando nuevo movimiento...")
    success = test_create_movement(token)
    
    if success:
        print("\n4️⃣ Listando movimientos después de crear...")
        test_list_movements(token)
    
    return success

if __name__ == "__main__":
    success = main()
    if success:
        print("\n🎉 ¡Todas las pruebas pasaron exitosamente!")
        print("✅ El error al grabar está CORREGIDO")
    else:
        print("\n💥 Algunas pruebas fallaron")
        print("❌ El error persiste, revisar logs")
