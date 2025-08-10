import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.serializers import ProductWarehouseStockSerializer
from core.models import ProductWarehouseStock

print('=== VERIFICANDO SERIALIZER ACTUALIZADO ===')
stocks = ProductWarehouseStock.objects.all()[:3]

for stock in stocks:
    print(f'\n--- Stock ID: {stock.id} ---')
    serializer = ProductWarehouseStockSerializer(stock)
    data = serializer.data
    
    print(f'warehouse_name: {data.get("warehouse_name")}')
    print(f'product_name: {data.get("product_name")}')
    print(f'product_code: {data.get("product_code")}')
    print(f'category_name: {data.get("category_name")}')
    print(f'brand_name: {data.get("brand_name")}')
    print(f'quantity: {data.get("quantity")}')

print('\n=== VERIFICANDO RELACIONES ===')
stock = stocks[0] if stocks else None
if stock:
    print(f'Stock: {stock}')
    print(f'ProductVariant: {stock.product_variant}')
    print(f'Product: {stock.product_variant.product if stock.product_variant else None}')
    if stock.product_variant and stock.product_variant.product:
        product = stock.product_variant.product
        print(f'Product Category: {product.category}')
        print(f'Product Brand: {product.brand}')
