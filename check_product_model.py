from productos.models import Product
from django.conf import settings

print("=== VERIFICACIÓN DEL MODELO PRODUCT ===")
print(f"DEBUG: {settings.DEBUG}")
print("\nCampos del modelo Product:")
for field in Product._meta.fields:
    print(f"  {field.name}: {field.__class__.__name__}")

print("\n=== VERIFICANDO SERIALIZER ===")
try:
    from productos.serializers import ProductSerializer
    serializer = ProductSerializer()
    print("Campos del serializer:")
    for field_name, field in serializer.fields.items():
        print(f"  {field_name}: {field.__class__.__name__}")
except ImportError as e:
    print(f"Error importando serializer: {e}")

print("\n=== VERIFICANDO VISTA ===")
try:
    from productos.views import ProductViewSet
    print("ProductViewSet encontrado")
except ImportError as e:
    print(f"Error importando vista: {e}")
