from django.core.management.base import BaseCommand
from core.models import Product, ProductVariant
from django.db import transaction

class Command(BaseCommand):
    help = 'Create a default variant for every product missing variants.'

    def handle(self, *args, **options):
        products_without_variants = Product.objects.filter(variants__isnull=True)
        count = 0
        with transaction.atomic():
            for product in products_without_variants:
                variant = ProductVariant.objects.create(
                    product=product,
                    name=f"Variante de {product.name}",
                    sku=product.sku or product.code or f"VAR-{product.id}",
                    is_default=True,
                    price=product.price if hasattr(product, 'price') else 0,
                    stock=0
                )
                self.stdout.write(self.style.SUCCESS(f"Creada variante para producto {product.id}: {product.name}"))
                count += 1
        self.stdout.write(self.style.SUCCESS(f"Total variantes creadas: {count}"))
