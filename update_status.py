from core.models import Product

# Actualizar productos existentes de NORMAL a REGULAR
updated = Product.objects.filter(status='NORMAL').update(status='REGULAR')
print(f'Productos actualizados de NORMAL a REGULAR: {updated}')

# Mostrar conteo total por estado
estados = Product.objects.values('status').distinct()
for estado in estados:
    count = Product.objects.filter(status=estado['status']).count()
    print(f"Estado {estado['status']}: {count} productos")
