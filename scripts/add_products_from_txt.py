import os
import sys
import django
import re
import unicodedata

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.models import Product, Brand

input_file = 'products_not_found.txt'


def slugify(value):
    value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode('ascii')
    value = re.sub(r'[^a-zA-Z0-9]+', '-', value)
    return value.lower().strip('-')[:50]


with open(input_file, encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        # Extract brand from parentheses
        match = re.search(r'\(([^)]+)\)', line)
        brand = match.group(1).strip() if match else ''
        # Remove brand from name
        name = re.sub(r'\s*\([^)]*\)', '', line).strip()
        # Generate SKU (slugified name, max 50 chars)
        sku = slugify(name)
        # Get or create Brand instance, always set business_id=1
        if brand:
            brand_obj, _ = Brand.objects.get_or_create(name=brand, defaults={'business_id': 1})
        else:
            brand_obj = None
        prod, created = Product.objects.get_or_create(
            name=name,
            defaults={'brand': brand_obj, 'business_id': 1, 'sku': sku}
        )
        if created:
            print(f"Created: {name} (Brand: {brand}, SKU: {sku})")
        else:
            print(f"Already exists: {name}")
print("Done.")
