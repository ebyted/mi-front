from core.models import Supplier, ProductVariant, Business

print(f"Negocios: {Business.objects.count()}")
print(f"Proveedores: {Supplier.objects.count()}")
print(f"Variantes de productos: {ProductVariant.objects.count()}")

print("\n--- Proveedores ---")
for supplier in Supplier.objects.all()[:5]:
    print(f"- {supplier.name} ({supplier.company_name}) - {supplier.email}")

print("\n--- Variantes de productos ---")
for variant in ProductVariant.objects.all()[:5]:
    print(f"- {variant.name} ({variant.sku})")
