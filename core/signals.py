from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Product, ProductVariant
import random
import string

def generate_sku(product):
    base = product.name[:8].upper().replace(' ', '')
    rand = ''.join(random.choices(string.digits, k=4))
    return f"{base}-{rand}"

@receiver(post_save, sender=Product)
def create_product_variant(sender, instance, created, **kwargs):
    if created:
        if not ProductVariant.objects.filter(product=instance).exists():
            sku = generate_sku(instance)
            ProductVariant.objects.create(
                product=instance,
                name=instance.name,
                sku=sku,
                cost_price=0,
                sale_price=0,
                purchase_price=0,
                barcode=instance.barcode or '',
                unit=instance.base_unit,
                low_stock_threshold=0,
                is_active=instance.is_active
            )

# Crear variantes para productos existentes sin variante al cargar el módulo
def create_missing_variants_for_existing_products():
    for product in Product.objects.filter(is_active=True):
        if not ProductVariant.objects.filter(product=product).exists():
            sku = generate_sku(product)
            ProductVariant.objects.create(
                product=product,
                name=product.name,
                sku=sku,
                cost_price=0,
                sale_price=0,
                purchase_price=0,
                barcode=product.barcode or '',
                unit=product.base_unit,
                low_stock_threshold=0,
                is_active=product.is_active
            )

    # Ya no se ejecuta automáticamente al importar el módulo. Ejecutar manualmente si se requiere.
