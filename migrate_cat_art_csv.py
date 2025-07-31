# Script para migrar datos de cat_art.csv a la tabla products
# El campo "Numero de producto" se guarda en el campo group de la base de datos
# Ajusta los nombres de columnas según el archivo CSV real

import csv
import os
import sys
BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()
from core.models import Product, Category, Brand

def get_csv_path():
    if len(sys.argv) > 1:
        return os.path.abspath(sys.argv[1])
    return os.path.join(os.path.dirname(__file__), 'cat_art.csv')

# Mapea los nombres de columnas del CSV a los campos del modelo Product
CSV_TO_DB = {
    'PRODUCTO': 'name',
    'Descripción': 'description',
    'SKU': 'sku',
    'Código de barras': 'barcode',
    'Unidad base': 'base_unit_id',  # Debes mapear el nombre a un ID válido si es necesario
    'Stock mínimo': 'minimum_stock',
    'Stock máximo': 'maximum_stock',
    'Activo': 'is_active',
    'group': 'group',
    # Agrega más campos si es necesario
}

def parse_bool(val):
    if isinstance(val, str):
        return val.strip().lower() in ['1', 'true', 'si', 'sí', 'yes', 'activo']
    return bool(val)


def migrate_cat_art_csv():
    # Borra todos los productos antes de migrar
    Product.objects.all().delete()
    print("Todos los productos han sido eliminados antes de la migración.")
    csv_path = get_csv_path()
    if not os.path.exists(csv_path):
        print(f"No se encontró el archivo CSV: {csv_path}")
        return
    with open(csv_path, encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter=';')
        count = 0
        skipped = 0
        auto_sku_counter = 1
        for row in reader:
            product_data = {}
            # Buscar el campo de nombre ignorando BOM y espacios
            name_field = None
            for k in row.keys():
                if 'PRODUCTO' in k.upper():
                    name_field = k
                    break
            product_name = row.get(name_field) if name_field else None
            for csv_col, db_col in CSV_TO_DB.items():
                value = row.get(csv_col)
                if db_col == 'name':
                    value = product_name
                if db_col == 'description':
                    value = value if value is not None else ""
                if db_col == 'barcode':
                    value = value if value is not None else ""
                if db_col == 'is_active':
                    value = parse_bool(value)
                elif db_col == 'minimum_stock':
                    value = float(value) if value else 0
                elif db_col == 'maximum_stock':
                    value = float(value) if value else 0
                elif db_col == 'group':
                    value = int(value) if value and value.strip() else 0
                product_data[db_col] = value
            # Validar nombre obligatorio
            if not product_data.get('name'):
                print(f"Fila omitida por falta de Nombre: {row}")
                skipped += 1
                continue
            # Si no hay SKU, asignar uno automático con formato SKU000001
            if not product_data.get('sku'):
                product_data['sku'] = f"SKU{auto_sku_counter:06d}"
                auto_sku_counter += 1
            # Evitar duplicados por SKU
            if Product.objects.filter(sku=product_data['sku']).exists():
                print(f"SKU ya existe, omitido: {product_data['sku']}")
                skipped += 1
                continue
            # Buscar o crear categoría por nombre
            cat_name = row.get('CATEGORIA') or row.get('Categoria')
            if cat_name:
                category, created = Category.objects.get_or_create(name=cat_name, defaults={"business_id": product_data.get('business_id', 1), "is_active": True})
                if created:
                    print(f"Categoría creada: {cat_name}")
                product_data['category'] = category
            # Buscar o crear marca por nombre
            brand_name = row.get('Marca')
            if brand_name:
                brand, created = Brand.objects.get_or_create(name=brand_name, defaults={"business_id": product_data.get('business_id', 1), "is_active": True})
                if created:
                    print(f"Marca creada: {brand_name}")
                product_data['brand'] = brand
            # Ajusta los siguientes valores por defecto según tu modelo
            product_data.setdefault('business_id', 1)
            try:
                product = Product(**product_data)
                product.save()
                count += 1
            except Exception as e:
                print(f"Error al crear producto {product_data.get('sku')}: {e}")
                skipped += 1
        print(f"Productos migrados: {count}")
        print(f"Filas omitidas: {skipped}")

if __name__ == "__main__":
    migrate_cat_art_csv()
