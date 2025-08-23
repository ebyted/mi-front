# Script para crear ProductVariant para cada producto sin variante
# Ubica este archivo en tu proyecto Django y ejecútalo con: python manage.py shell < create_missing_variants.py

from django.db import transaction
from core.models import Product, ProductVariant

import random
import string

def generate_sku(product):
    base = product.name[:8].upper().replace(' ', '')
    rand = ''.join(random.choices(string.digits, k=4))
    return f"{base}-{rand}"

created = 0
with transaction.atomic():
    for product in Product.objects.filter(is_active=True):
        if not ProductVariant.objects.filter(product=product).exists():
            sku = generate_sku(product)
            variant = ProductVariant.objects.create(
                product=product,
                name=product.name,
                sku=sku,
                price=0,
                min_stock=0,
                is_active=True
            )
            print(f"✅ Variante creada para producto: {product.name} (SKU: {sku})")
            created += 1
        else:
            print(f"➡️ Producto ya tiene variante: {product.name}")
print(f"Total variantes creadas: {created}")
