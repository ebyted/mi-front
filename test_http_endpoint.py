import requests
import json

# Configurar la URL base
BASE_URL = "http://127.0.0.1:8030/api/"

def test_products_endpoint():
    """
    Probar directamente el endpoint de productos sin autenticación primero
    """
    print("🔍 Probando endpoint de productos...")
    
    # Probar endpoint básico
    try:
        print("\n1️⃣ Probando GET /api/products/")
        response = requests.get(f"{BASE_URL}products/")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Tipo de respuesta: {type(data)}")
            if isinstance(data, dict):
                print(f"Claves: {list(data.keys())}")
                if 'results' in data:
                    print(f"Productos en results: {len(data['results'])}")
                    if data['results']:
                        sample = data['results'][0]
                        print(f"Primer producto: {sample.get('name', 'N/A')} (ID: {sample.get('id', 'N/A')})")
            elif isinstance(data, list):
                print(f"Lista con {len(data)} elementos")
                if data:
                    sample = data[0]
                    print(f"Primer producto: {sample.get('name', 'N/A')} (ID: {sample.get('id', 'N/A')})")
        else:
            print(f"Error: {response.text}")
    
    except Exception as e:
        print(f"Error en petición: {e}")
    
    # Probar el nuevo endpoint search_all
    try:
        print("\n2️⃣ Probando GET /api/products/search_all/")
        response = requests.get(f"{BASE_URL}products/search_all/")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Tipo de respuesta: {type(data)}")
            if isinstance(data, list):
                print(f"Lista con {len(data)} productos")
                if data:
                    for i, product in enumerate(data[:3], 1):
                        print(f"  {i}. {product.get('name', 'N/A')} (ID: {product.get('id', 'N/A')}, SKU: {product.get('sku', 'N/A')})")
            else:
                print(f"Respuesta inesperada: {data}")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Error en petición: {e}")

if __name__ == "__main__":
    test_products_endpoint()
