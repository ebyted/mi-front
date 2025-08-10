import requests
import json

# URL del backend
BASE_URL = "http://168.231.67.221:8001/api"

def check_inventory_data():
    print("=== VERIFICANDO DATOS DE INVENTARIO ===")
    
    try:
        # Endpoint principal que usa el frontend
        response = requests.get(f"{BASE_URL}/product-warehouse-stocks/")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Total records: {len(data)}")
            
            if data:
                print("\n=== PRIMER REGISTRO ===")
                first_item = data[0]
                print(json.dumps(first_item, indent=2))
                
                # Verificar campos específicos
                print(f"\n=== ANÁLISIS DEL PRIMER REGISTRO ===")
                print(f"product_variant keys: {list(first_item.get('product_variant', {}).keys()) if first_item.get('product_variant') else 'None'}")
                print(f"warehouse keys: {list(first_item.get('warehouse', {}).keys()) if first_item.get('warehouse') else 'None'}")
                
                # Buscar campos de categoría y marca
                pv = first_item.get('product_variant', {})
                if pv:
                    print(f"\nProductVariant fields:")
                    print(f"  - category: {pv.get('category')}")
                    print(f"  - brand: {pv.get('brand')}")
                    print(f"  - category_name: {pv.get('category_name')}")
                    print(f"  - brand_name: {pv.get('brand_name')}")
                    
                    product = pv.get('product', {})
                    if product:
                        print(f"\nProduct fields:")
                        print(f"  - category: {product.get('category')}")
                        print(f"  - brand: {product.get('brand')}")
                        print(f"  - category_name: {product.get('category_name')}")
                        print(f"  - brand_name: {product.get('brand_name')}")
                
                print(f"\n=== ANÁLISIS DE VARIOS REGISTROS ===")
                for i, item in enumerate(data[:5]):
                    pv = item.get('product_variant', {})
                    print(f"Registro {i+1}:")
                    print(f"  - SKU: {pv.get('sku', 'N/A')}")
                    print(f"  - Name: {pv.get('name', 'N/A')}")
                    print(f"  - Category: {pv.get('category', 'N/A')}")
                    print(f"  - Brand: {pv.get('brand', 'N/A')}")
                    if pv.get('product'):
                        p = pv['product']
                        print(f"  - Product Category: {p.get('category', 'N/A')}")
                        print(f"  - Product Brand: {p.get('brand', 'N/A')}")
                    print()
        
    except Exception as e:
        print(f"Error: {e}")

    # También verificar endpoints de categorías y marcas
    print("\n=== VERIFICANDO CATEGORÍAS ===")
    try:
        response = requests.get(f"{BASE_URL}/categories/")
        if response.status_code == 200:
            categories = response.json()
            print(f"Total categorías: {len(categories)}")
            for cat in categories[:5]:
                print(f"  - {cat.get('id')}: {cat.get('name')}")
        else:
            print(f"Error categories: {response.status_code}")
    except Exception as e:
        print(f"Error categories: {e}")

    print("\n=== VERIFICANDO MARCAS ===")
    try:
        response = requests.get(f"{BASE_URL}/brands/")
        if response.status_code == 200:
            brands = response.json()
            print(f"Total marcas: {len(brands)}")
            for brand in brands[:5]:
                print(f"  - {brand.get('id')}: {brand.get('name')}")
        else:
            print(f"Error brands: {response.status_code}")
    except Exception as e:
        print(f"Error brands: {e}")

if __name__ == "__main__":
    check_inventory_data()
