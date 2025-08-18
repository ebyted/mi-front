#!/usr/bin/env python3
"""
Script de prueba para la API de movimientos de inventario
"""

import requests
import json

# Configuración de la API
BASE_URL = "http://127.0.0.1:8030/api"
USERNAME = "admin"  # Cambiar por un usuario válido
PASSWORD = "123456789"  # Cambiar por la contraseña válida

def get_auth_token():
    """Obtener token de autenticación"""
    url = f"{BASE_URL}/token/"
    data = {
        "username": USERNAME,
        "password": PASSWORD
    }
    
    try:
        response = requests.post(url, json=data)
        if response.status_code == 200:
            return response.json()["access"]
        else:
            print(f"❌ Error obteniendo token: {response.status_code}")
            print(response.text)
            return None
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return None

def test_create_movement(token):
    """Probar crear un movimiento de inventario"""
    url = f"{BASE_URL}/inventory-movements/"
    headers = {"Authorization": f"Bearer {token}"}
    
    # Datos de prueba para un movimiento de inventario
    movement_data = {
        "warehouse_id": 1,  # Almacén "sancho"
        "type": "IN",       # Entrada
        "notes": "Movimiento de prueba desde script",
        "details": [
            {
                "product_id": 501,  # Primer producto encontrado
                "quantity": 10,
                "expiration_date": "2025-12-31",
                "notes": "Detalle de prueba"
            },
            {
                "product_id": 502,  # Segundo producto encontrado
                "quantity": 5,
                "notes": "Otro detalle de prueba"
            }
        ]
    }
    
    print(f"🔄 Enviando movimiento:")
    print(json.dumps(movement_data, indent=2))
    
    try:
        response = requests.post(url, json=movement_data, headers=headers)
        print(f"\n📊 Respuesta: {response.status_code}")
        
        if response.status_code in [200, 201]:
            print("✅ Movimiento creado exitosamente!")
            print(json.dumps(response.json(), indent=2))
        else:
            print("❌ Error creando movimiento:")
            print(response.text)
            
        return response
        
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return None

def main():
    print("🚀 Probando API de movimientos de inventario")
    print("=" * 50)
    
    # 1. Obtener token de autenticación
    print("1️⃣ Obteniendo token de autenticación...")
    token = get_auth_token()
    
    if not token:
        print("❌ No se pudo obtener el token. Verifica las credenciales.")
        return
    
    print(f"✅ Token obtenido: {token[:20]}...")
    
    # 2. Probar crear movimiento
    print("\n2️⃣ Probando crear movimiento de inventario...")
    response = test_create_movement(token)
    
    if response:
        print(f"\n📝 Headers de la respuesta:")
        for key, value in response.headers.items():
            print(f"  {key}: {value}")

if __name__ == "__main__":
    main()
