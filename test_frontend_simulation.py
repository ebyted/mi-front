#!/usr/bin/env python3
"""
Script que simula EXACTAMENTE lo que hace el frontend
"""

import urllib.request
import urllib.parse
import json

# Configuración exacta del frontend
BASE_URL = "http://localhost:8030/api"

def simulate_frontend_login():
    """Simular el login del frontend"""
    url = f"{BASE_URL}/token/"
    
    # Datos exactos como los enviaría el frontend
    data = {
        "email": "admin@admin.com",
        "password": "admin123"
    }
    
    json_data = json.dumps(data).encode('utf-8')
    
    req = urllib.request.Request(
        url, 
        data=json_data, 
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        print(f"🔑 Simulando login del frontend...")
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            token = result.get("access")
            print(f"✅ Login exitoso! Token: {token[:20]}...")
            return token
    except Exception as e:
        print(f"❌ Error en login: {e}")
        return None

def simulate_frontend_create_movement(token):
    """Simular la creación de movimiento desde el frontend"""
    url = f"{BASE_URL}/inventory-movements/"
    
    # Datos EXACTOS como los enviaría el InventoryMovements.jsx
    movement_data = {
        "warehouse_id": 1,  # ID del almacén seleccionado
        "type": "IN",       # Tipo de movimiento
        "notes": "Movimiento creado desde frontend simulado",
        "details": [
            {
                "product_id": 501,  # ID del producto
                "quantity": 15,     # Cantidad
                "expiration_date": "2025-12-31",  # Fecha de expiración (opcional)
                "notes": "Detalle desde frontend"
            },
            {
                "product_id": 502,  # Segundo producto
                "quantity": 8,      # Cantidad
                "notes": "Segundo detalle desde frontend"
                # Sin fecha de expiración para probar opcional
            }
        ]
    }
    
    print(f"\n📦 Simulando creación de movimiento desde frontend...")
    print(f"🔄 URL: {url}")
    print(f"📄 Datos enviados:")
    print(json.dumps(movement_data, indent=2))
    
    json_data = json.dumps(movement_data).encode('utf-8')
    
    req = urllib.request.Request(
        url,
        data=json_data,
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}',
            'Accept': 'application/json'
        }
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            print(f"✅ ¡MOVIMIENTO CREADO EXITOSAMENTE!")
            print(f"📊 Status: {response.getcode()}")
            print(f"🆔 ID del movimiento: {result.get('id')}")
            print(f"🏪 Almacén: {result.get('warehouse_name')}")
            print(f"📅 Fecha: {result.get('created_at')}")
            print(f"👤 Usuario: {result.get('user_email')}")
            print(f"📝 Detalles creados: {len(result.get('details', []))}")
            
            for i, detail in enumerate(result.get('details', []), 1):
                print(f"   {i}. {detail.get('product_name')} - Cantidad: {detail.get('quantity')}")
            
            return True
            
    except urllib.error.HTTPError as e:
        print(f"❌ Error HTTP {e.code}: {e.reason}")
        try:
            error_body = e.read().decode()
            error_data = json.loads(error_body)
            print(f"💥 Detalles del error:")
            print(json.dumps(error_data, indent=2))
        except:
            print(f"💥 Error body: {error_body}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("🎭 SIMULACIÓN COMPLETA DEL FRONTEND")
    print("=" * 50)
    print("Simulando exactamente lo que hace el usuario en el navegador...")
    
    # 1. Simular login
    print("\n1️⃣ PASO 1: Login del usuario")
    token = simulate_frontend_login()
    
    if not token:
        print("❌ FALLO: No se pudo autenticar")
        return False
    
    # 2. Simular creación de movimiento
    print("\n2️⃣ PASO 2: Crear movimiento de inventario")
    success = simulate_frontend_create_movement(token)
    
    # 3. Resultado final
    print(f"\n{'='*50}")
    if success:
        print("🎉 ¡SIMULACIÓN EXITOSA!")
        print("✅ El frontend puede crear movimientos sin problemas")
        print("✅ El botón 'Guardar' funcionará correctamente")
        print("✅ NO HAY ERRORES AL GRABAR")
    else:
        print("💥 SIMULACIÓN FALLIDA")
        print("❌ Hay problemas que necesitan corrección")
    
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
