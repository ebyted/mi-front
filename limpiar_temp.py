import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dbackf.settings')
django.setup()

from django.db import connection, transaction
from core.models import Product, InventoryMovement, InventoryMovementDetail

def limpiar():
    print('🗄️ Iniciando limpieza de movimientos de almacén...')
    
    # Contar registros antes
    movimientos_count = InventoryMovement.objects.count()
    detalles_count = InventoryMovementDetail.objects.count()
    productos_con_stock = Product.objects.filter(current_stock__gt=0).count()
    
    print(f'📊 Estado actual:')
    print(f'   - Movimientos: {movimientos_count}')
    print(f'   - Detalles: {detalles_count}')
    print(f'   - Productos con stock > 0: {productos_con_stock}')
    
    respuesta = input('¿Confirmar eliminación completa? (escriba SI): ')
    if respuesta.upper() != 'SI':
        print('❌ Operación cancelada')
        return
    
    with transaction.atomic():
        print('🗑️ Eliminando detalles de movimientos...')
        InventoryMovementDetail.objects.all().delete()
        
        print('🗑️ Eliminando movimientos de inventario...')
        InventoryMovement.objects.all().delete()
        
        print('📦 Reiniciando stocks de productos a 0...')
        productos_actualizados = Product.objects.update(current_stock=0.0)
        
        print('🔄 Reiniciando secuencias de IDs...')
        with connection.cursor() as cursor:
            # Reiniciar secuencias para PostgreSQL
            try:
                cursor.execute("SELECT setval(pg_get_serial_sequence('core_inventorymovement', 'id'), 1, false);")
                cursor.execute("SELECT setval(pg_get_serial_sequence('core_inventorymovementdetail', 'id'), 1, false);")
                print('   - Secuencias reiniciadas (PostgreSQL)')
            except:
                # Si es SQLite u otra BD
                print('   - Secuencias no disponibles para esta base de datos')
        
        print('✅ Limpieza completada exitosamente!')
        print(f'📋 Resumen:')
        print(f'   - Movimientos eliminados: {movimientos_count}')
        print(f'   - Detalles eliminados: {detalles_count}')
        print(f'   - Productos con stock reiniciado: {productos_actualizados}')
    
    # Verificar limpieza
    print('\n🔍 Verificando limpieza...')
    mov_restantes = InventoryMovement.objects.count()
    det_restantes = InventoryMovementDetail.objects.count()
    prod_con_stock = Product.objects.filter(current_stock__gt=0).count()
    
    print(f'📊 Estado después de limpieza:')
    print(f'   - Movimientos restantes: {mov_restantes}')
    print(f'   - Detalles restantes: {det_restantes}')
    print(f'   - Productos con stock > 0: {prod_con_stock}')
    
    if mov_restantes == 0 and det_restantes == 0 and prod_con_stock == 0:
        print('✅ Limpieza verificada correctamente!')
    else:
        print('⚠️ La limpieza no se completó correctamente')

if __name__ == "__main__":
    limpiar()
