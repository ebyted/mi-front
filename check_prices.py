import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.models import Product, ProductVariant
from core.serializers import ProductSerializer

# Verificar productos y sus precios
print("=== VERIFICACIÓN DE PRECIOS ===")

products = Product.objects.all()[:3]
for product in products:
    print(f"\nProducto: {product.name}")
    
    # Verificar ProductVariants asociados
    variants = ProductVariant.objects.filter(product=product)
    print(f"  Variants: {variants.count()}")
    
    for variant in variants:
        print(f"    - SKU: {variant.sku}, Precio: {variant.sale_price}")
    
    # Probar el serializer
    serializer = ProductSerializer(product)
    price_from_serializer = serializer.data.get('price', 'No encontrado')
    print(f"  Precio del serializer: {price_from_serializer}")

print("\n=== FIN VERIFICACIÓN ===")
