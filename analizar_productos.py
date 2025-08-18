import csv
import requests
import json
from difflib import SequenceMatcher

def similarity(a, b):
    """Calcular similitud entre dos strings"""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def normalize_product_name(name):
    """Normalizar nombres de productos para comparación"""
    name = name.upper()
    # Eliminar caracteres especiales comunes
    replacements = {
        '(': '',
        ')': '',
        '/': ' ',
        '-': ' ',
        '_': ' ',
        '.': '',
        ',': ' ',
        '  ': ' '
    }
    for old, new in replacements.items():
        name = name.replace(old, new)
    return name.strip()

# Leer productos del CSV
csv_products = []
with open('mov_inv.csv', 'r', encoding='utf-8') as file:
    reader = csv.DictReader(file, delimiter='|')
    for row in reader:
        product_name = row['Producto'].strip()
        if product_name and product_name not in [p['name'] for p in csv_products]:
            csv_products.append({
                'name': product_name,
                'normalized': normalize_product_name(product_name)
            })

print(f"📦 Productos únicos encontrados en CSV: {len(csv_products)}")

# Obtener productos de la API
try:
    response = requests.get('http://localhost:8030/api/products/')
    if response.status_code == 200:
        api_products = response.json()
        print(f"🗄️ Productos en base de datos: {len(api_products)}")
    else:
        print(f"❌ Error al obtener productos de la API: {response.status_code}")
        exit(1)
except Exception as e:
    print(f"❌ Error de conexión: {e}")
    exit(1)

# Normalizar nombres de productos de la API
api_normalized = []
for product in api_products:
    api_normalized.append({
        'id': product['id'],
        'name': product['name'],
        'normalized': normalize_product_name(product['name'])
    })

print("\n🔍 ANÁLISIS DE PRODUCTOS:")
print("=" * 80)

# Encontrar productos no encontrados
not_found = []
found = []
partial_matches = []

for csv_product in csv_products:
    exact_match = None
    best_match = None
    best_similarity = 0
    
    # Buscar coincidencia exacta
    for api_product in api_normalized:
        if csv_product['normalized'] == api_product['normalized']:
            exact_match = api_product
            break
        
        # Calcular similitud para posibles coincidencias parciales
        sim = similarity(csv_product['normalized'], api_product['normalized'])
        if sim > best_similarity:
            best_similarity = sim
            best_match = api_product
    
    if exact_match:
        found.append({
            'csv_name': csv_product['name'],
            'api_name': exact_match['name'],
            'api_id': exact_match['id'],
            'match_type': 'EXACTO'
        })
    elif best_similarity >= 0.8:  # 80% de similitud
        partial_matches.append({
            'csv_name': csv_product['name'],
            'api_name': best_match['name'],
            'api_id': best_match['id'],
            'similarity': best_similarity,
            'match_type': 'SIMILAR'
        })
    else:
        not_found.append({
            'csv_name': csv_product['name'],
            'best_match': best_match['name'] if best_match else 'N/A',
            'best_similarity': best_similarity,
            'match_type': 'NO_ENCONTRADO'
        })

# Mostrar resultados
print(f"✅ PRODUCTOS ENCONTRADOS (coincidencia exacta): {len(found)}")
for item in found:
    print(f"   • {item['csv_name']} → ID: {item['api_id']}")

print(f"\n🟡 PRODUCTOS CON COINCIDENCIA SIMILAR (≥80%): {len(partial_matches)}")
for item in partial_matches:
    print(f"   • CSV: {item['csv_name']}")
    print(f"     API: {item['api_name']} (ID: {item['api_id']}) - Similitud: {item['similarity']:.2%}")

print(f"\n❌ PRODUCTOS NO ENCONTRADOS: {len(not_found)}")
for item in not_found:
    print(f"   • {item['csv_name']}")
    if item['best_similarity'] > 0.5:
        print(f"     Mejor coincidencia: {item['best_match']} ({item['best_similarity']:.2%})")

print(f"\n📊 RESUMEN:")
print(f"   Productos en CSV: {len(csv_products)}")
print(f"   Encontrados exactos: {len(found)}")
print(f"   Similares (≥80%): {len(partial_matches)}")
print(f"   No encontrados: {len(not_found)}")
print(f"   Cobertura total: {((len(found) + len(partial_matches)) / len(csv_products) * 100):.1f}%")

# Guardar resultados en archivo
with open('productos_analisis.json', 'w', encoding='utf-8') as f:
    json.dump({
        'found': found,
        'partial_matches': partial_matches,
        'not_found': not_found,
        'summary': {
            'csv_total': len(csv_products),
            'found_exact': len(found),
            'found_similar': len(partial_matches),
            'not_found': len(not_found),
            'coverage_percentage': ((len(found) + len(partial_matches)) / len(csv_products) * 100)
        }
    }, f, ensure_ascii=False, indent=2)

print(f"\n💾 Resultados guardados en 'productos_analisis.json'")
