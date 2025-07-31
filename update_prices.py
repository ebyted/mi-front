import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.models import ProductVariant
from decimal import Decimal

print("=== ACTUALIZANDO PRECIOS DE PRODUCT VARIANTS ===")

# Obtener todos los ProductVariants
variants = ProductVariant.objects.all()
print(f"Total ProductVariants encontrados: {variants.count()}")

# Precios ejemplo para productos farmacéuticos
sample_prices = [150.50, 85.75, 220.00, 95.25, 340.90, 180.45, 75.80, 125.30, 290.60, 165.75]

for i, variant in enumerate(variants):
    # Asignar un precio de la lista de ejemplos (reutilizar si hay más variants que precios)
    price = Decimal(str(sample_prices[i % len(sample_prices)]))
    
    # Actualizar precios
    variant.sale_price = price
    variant.cost_price = price * Decimal('0.6')  # 40% de margen
    variant.purchase_price = price * Decimal('0.5')  # 50% del precio de venta
    variant.save()
    
    print(f"Actualizado: {variant.name} - SKU: {variant.sku} - Precio: ${price}")

print("=== PRECIOS ACTUALIZADOS ===")

# Verificar que se actualizaron correctamente
print("\n=== VERIFICACIÓN FINAL ===")
from core.serializers import ProductSerializer
from core.models import Product

products = Product.objects.all()[:3]
for product in products:
    serializer = ProductSerializer(product)
    price = serializer.data.get('price', 0)
    print(f"Producto: {product.name} - Precio serializer: ${price}")
