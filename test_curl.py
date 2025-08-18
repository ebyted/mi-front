import urllib.request
import urllib.parse
import json

def test_token():
    """Probar obtener token"""
    url = "http://127.0.0.1:8030/api/token/"
    
    data = {
        "username": "ebyted@gmail.com",
        "password": "admin123"  # Probar diferentes contraseñas comunes
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
            print(f"✅ Token obtenido exitosamente")
            return result.get("access")
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def test_movement_creation(token):
    """Probar crear movimiento con token"""
    url = "http://127.0.0.1:8030/api/inventory-movements/"
    
    movement_data = {
        "warehouse_id": 1,
        "type": "IN",
        "notes": "Movimiento de prueba desde urllib",
        "details": [
            {
                "product_id": 501,
                "quantity": 5,
                "notes": "Test detail"
            }
        ]
    }
    
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
            print(f"✅ Movimiento creado: {result}")
            return result
    except urllib.error.HTTPError as e:
        print(f"❌ Error HTTP {e.code}:")
        error_body = e.read().decode()
        print(error_body)
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

# Lista de contraseñas comunes para probar
passwords = ["admin123", "123456789", "admin", "password", "ebyted123"]

print("🧪 Probando autenticación...")
token = None

for password in passwords:
    print(f"Probando contraseña: {password}")
    
    data = {
        "username": "ebyted@gmail.com",
        "password": password
    }
    
    json_data = json.dumps(data).encode('utf-8')
    
    req = urllib.request.Request(
        "http://127.0.0.1:8030/api/token/", 
        data=json_data, 
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            token = result.get("access")
            print(f"✅ ¡Contraseña correcta! Token: {token[:20]}...")
            break
    except Exception as e:
        print(f"❌ Falló con {password}")
        
if token:
    print(f"\n🚀 Probando creación de movimiento...")
    test_movement_creation(token)
else:
    print(f"\n❌ No se pudo obtener token con ninguna contraseña")
