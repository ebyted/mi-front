#!/usr/bin/env python
"""
Analizador de CSV de movimientos de inventario
Genera scripts SQL de PostgreSQL para insertar movimientos y detalles
"""

import csv
import requests
from datetime import datetime
from decimal import Decimal
import json

def normalize_product_name(name):
    """Normaliza nombre de producto para búsqueda"""
    if not name or name == '-':
        return ''
    return str(name).strip().upper()

def parse_date(date_str):
    """Convierte fecha DD/MM/YYYY a formato SQL YYYY-MM-DD"""
    if not date_str or date_str == '-':
        return None
    try:
        # Formato DD/MM/YYYY
        day, month, year = date_str.split('/')
        return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
    except:
        return None

def parse_price(price_str):
    """Convierte precio a decimal"""
    if not price_str or price_str == '-' or price_str == '0':
        return Decimal('0.00')
    try:
        return Decimal(str(price_str))
    except:
        return Decimal('0.00')

def parse_quantity(quantity_str):
    """Convierte cantidad a float"""
    if not quantity_str or quantity_str == '-':
        return 0.0
    try:
        return float(quantity_str)
    except:
        return 0.0

def get_products_from_api():
    """Obtiene productos de la API"""
    try:
        response = requests.get('http://localhost:8030/api/products/')
        if response.status_code == 200:
            return response.json()
        return []
    except Exception as e:
        print(f"Error al obtener productos de API: {e}")
        return []

def find_product_match(product_name, api_products):
    """Encuentra coincidencia de producto en la API"""
    normalized_search = normalize_product_name(product_name)
    
    if not normalized_search:
        return None
    
    # Búsqueda exacta
    for product in api_products:
        if normalize_product_name(product['name']) == normalized_search:
            return product
    
    # Búsqueda por similitud
    from difflib import SequenceMatcher
    best_match = None
    best_similarity = 0.8  # Umbral mínimo
    
    for product in api_products:
        similarity = SequenceMatcher(None, 
                                   normalized_search, 
                                   normalize_product_name(product['name'])).ratio()
        if similarity > best_similarity:
            best_similarity = similarity
            best_match = product
    
    return best_match

def analyze_csv_and_generate_sql():
    """Analiza el CSV y genera scripts SQL"""
    
    # Leer productos de API
    print("Obteniendo productos de la API...")
    api_products = get_products_from_api()
    print(f"Productos obtenidos: {len(api_products)}")
    
    movements = []
    details = []
    movement_id = 1
    detail_id = 1
    
    # Leer CSV
    with open('mov_inv.csv', 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file, delimiter='|')
        
        # Agrupar por fecha y tipo de movimiento
        movements_by_date = {}
        
        for row in reader:
            product_name = row['Producto']
            price = parse_price(row['Precio'])
            quantity = parse_quantity(row['Cantidad'])
            movement_type = row['Tipo de Movimiento']
            date = parse_date(row['Fecha'])
            
            # Buscar producto
            product_match = find_product_match(product_name, api_products)
            
            if not product_match:
                print(f"⚠️  Producto no encontrado: {product_name}")
                continue
            
            # Crear clave única para movimiento
            movement_key = f"{date}_{movement_type}"
            
            if movement_key not in movements_by_date:
                movements_by_date[movement_key] = {
                    'id': movement_id,
                    'date': date,
                    'type': movement_type,
                    'details': []
                }
                movement_id += 1
            
            # Agregar detalle
            detail = {
                'id': detail_id,
                'movement_id': movements_by_date[movement_key]['id'],
                'product_id': product_match['id'],
                'product_name': product_name,
                'quantity': abs(quantity),  # Usar valor absoluto
                'price': price,
                'total': price * Decimal(str(abs(quantity))) if price > 0 else Decimal('0.00'),
                'movement_type_detail': 'IN' if movement_type == 'INGRESO' else 'OUT'
            }
            
            movements_by_date[movement_key]['details'].append(detail)
            details.append(detail)
            detail_id += 1
    
    # Generar movimientos únicos
    for movement_data in movements_by_date.values():
        movements.append(movement_data)
    
    # Estadísticas
    print(f"\n📊 ANÁLISIS COMPLETADO:")
    print(f"   • Total movimientos únicos: {len(movements)}")
    print(f"   • Total detalles: {len(details)}")
    print(f"   • Ingresos: {len([m for m in movements if m['type'] == 'INGRESO'])}")
    print(f"   • Egresos: {len([m for m in movements if m['type'] == 'EGRESO'])}")
    
    # Generar SQL
    generate_sql_scripts(movements, details)
    
    return movements, details

def generate_sql_scripts(movements, details):
    """Genera scripts SQL para PostgreSQL"""
    
    # Script de movimientos
    movements_sql = """-- SCRIPT DE MOVIMIENTOS DE INVENTARIO
-- Generado automáticamente desde mov_inv.csv
-- Fecha de generación: """ + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + """

-- Limpiar tablas (opcional - descomenta si quieres resetear)
-- DELETE FROM core_inventorymovementdetail;
-- DELETE FROM core_inventorymovement;
-- ALTER SEQUENCE core_inventorymovement_id_seq RESTART WITH 1;
-- ALTER SEQUENCE core_inventorymovementdetail_id_seq RESTART WITH 1;

-- Insertar movimientos principales
INSERT INTO core_inventorymovement (
    id, warehouse_id, user_id, movement_type, reference_document, 
    notes, created_at, authorized, authorized_by_id, authorized_at
) VALUES
"""
    
    movement_values = []
    for mov in movements:
        notes = f"Movimiento {mov['type']} - Importado desde CSV"
        movement_values.append(
            f"({mov['id']}, 1, 1, '{mov['type']}', 'CSV-IMPORT-{mov['id']}', "
            f"'{notes}', '{mov['date']} 12:00:00', true, 1, '{mov['date']} 12:00:00')"
        )
    
    movements_sql += ',\n'.join(movement_values) + ';\n\n'
    
    # Script de detalles
    details_sql = """-- Insertar detalles de movimientos
INSERT INTO core_inventorymovementdetail (
    id, movement_id, product_variant_id, quantity, price, total, 
    lote, expiration_date, notes, aux1
) VALUES
"""
    
    detail_values = []
    for detail in details:
        lote = f"LOTE-{detail['movement_id']}-{detail['id']}"
        notes = f"Producto: {detail['product_name'][:50]}..."
        detail_values.append(
            f"({detail['id']}, {detail['movement_id']}, {detail['product_id']}, "
            f"{detail['quantity']}, {detail['price']}, {detail['total']}, "
            f"'{lote}', NULL, '{notes}', '{detail['movement_type_detail']}')"
        )
    
    details_sql += ',\n'.join(detail_values) + ';\n\n'
    
    # Script completo
    full_sql = movements_sql + details_sql + """
-- Actualizar secuencias
SELECT setval('core_inventorymovement_id_seq', (SELECT MAX(id) FROM core_inventorymovement));
SELECT setval('core_inventorymovementdetail_id_seq', (SELECT MAX(id) FROM core_inventorymovementdetail));

-- Verificación
SELECT 
    'Movimientos insertados:' as tipo,
    COUNT(*) as cantidad
FROM core_inventorymovement
WHERE reference_document LIKE 'CSV-IMPORT-%'
UNION ALL
SELECT 
    'Detalles insertados:' as tipo,
    COUNT(*) as cantidad
FROM core_inventorymovementdetail 
WHERE movement_id IN (
    SELECT id FROM core_inventorymovement 
    WHERE reference_document LIKE 'CSV-IMPORT-%'
);
"""
    
    # Guardar script completo
    with open('movimientos_inventario.sql', 'w', encoding='utf-8') as f:
        f.write(full_sql)
    
    # Guardar script de movimientos separado
    with open('movimientos_principales.sql', 'w', encoding='utf-8') as f:
        f.write(movements_sql)
    
    # Guardar script de detalles separado
    with open('movimientos_detalles.sql', 'w', encoding='utf-8') as f:
        f.write(details_sql)
    
    print(f"\n✅ SCRIPTS SQL GENERADOS:")
    print(f"   • movimientos_inventario.sql (completo)")
    print(f"   • movimientos_principales.sql (solo movimientos)")
    print(f"   • movimientos_detalles.sql (solo detalles)")

def generate_analysis_report(movements, details):
    """Genera reporte de análisis"""
    report = {
        'total_movements': len(movements),
        'total_details': len(details),
        'movements_by_type': {},
        'movements_by_date': {},
        'products_summary': {}
    }
    
    # Resumen por tipo
    for mov in movements:
        mov_type = mov['type']
        if mov_type not in report['movements_by_type']:
            report['movements_by_type'][mov_type] = 0
        report['movements_by_type'][mov_type] += 1
    
    # Resumen por fecha
    for mov in movements:
        date = mov['date']
        if date not in report['movements_by_date']:
            report['movements_by_date'][date] = 0
        report['movements_by_date'][date] += 1
    
    # Resumen de productos
    for detail in details:
        product = detail['product_name']
        if product not in report['products_summary']:
            report['products_summary'][product] = {
                'total_quantity': 0,
                'total_value': 0,
                'movements_count': 0
            }
        report['products_summary'][product]['total_quantity'] += detail['quantity']
        report['products_summary'][product]['total_value'] += float(detail['total'])
        report['products_summary'][product]['movements_count'] += 1
    
    # Guardar reporte
    with open('reporte_movimientos_analisis.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False, default=str)
    
    print(f"\n📋 REPORTE DE ANÁLISIS GENERADO:")
    print(f"   • reporte_movimientos_analisis.json")

if __name__ == "__main__":
    print("🔄 INICIANDO ANÁLISIS DE MOVIMIENTOS CSV...")
    
    try:
        movements, details = analyze_csv_and_generate_sql()
        generate_analysis_report(movements, details)
        
        print(f"\n✅ PROCESO COMPLETADO EXITOSAMENTE")
        print(f"   Revisa los archivos generados para los scripts SQL")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
