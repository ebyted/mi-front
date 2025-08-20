from core.models import Product
from core.serializers import ProductSerializer
from django.db.models import Q

# Verificar productos en la base de datos
products = Product.objects.all()
print(f"Total productos: {products.count()}")

# Mostrar los primeros 5
for p in products[:5]:
    print(f"ID: {p.id}, Nombre: {p.name}, SKU: {p.sku}")

# Serializar algunos productos
serializer = ProductSerializer(products[:3], many=True)
print("Datos serializados:")
for data in serializer.data:
    print(f"  - {data['name']} (ID: {data['id']})")
