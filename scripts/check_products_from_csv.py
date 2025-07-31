import os
import sys
import django
import csv

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.models import Product

missing = []
existing = []

with open('scripts/inv_inicial30.csv', encoding='utf-8') as f:
    reader = csv.reader(f)
    rows = list(reader)
    names = [row[0].strip().strip('"') for row in rows if row and row[0].strip()]
    for name in names:
        prod = Product.objects.filter(name__iexact=name).first()
        if prod:
            existing.append(name)
        else:
            missing.append(name)

with open('products_found.txt', 'w', encoding='utf-8') as f:
    for name in existing:
        f.write(name + '\n')

with open('products_not_found.txt', 'w', encoding='utf-8') as f:
    for name in missing:
        f.write(name + '\n')

print(f"Found: {len(existing)} products written to products_found.txt")
print(f"Not found: {len(missing)} products written to products_not_found.txt")
