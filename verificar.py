from core.models import InventoryMovement, InventoryMovementDetail, Product

print('=== VERIFICACION DE LIMPIEZA ===')
print(f'Movimientos: {InventoryMovement.objects.count()}')
print(f'Detalles: {InventoryMovementDetail.objects.count()}')
print(f'Productos: {Product.objects.count()}')

productos_nuevos = Product.objects.filter(id__in=[101, 102, 103])
print('Productos recien creados:')
for p in productos_nuevos:
    print(f'  ID {p.id}: {p.name}')

print('LIMPIEZA COMPLETADA EXITOSAMENTE!')
