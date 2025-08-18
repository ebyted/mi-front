# Script para limpiar movimientos desde Django shell
from django.db import connection, transaction
from core.models import Product, InventoryMovement, InventoryMovementDetail

def limpiar_movimientos():
    print('🗄️ Iniciando limpieza de movimientos de almacén...')
    
    # Mostrar estado actual
    movimientos = InventoryMovement.objects.count()
    detalles = InventoryMovementDetail.objects.count()
    productos_stock = Product.objects.filter(current_stock__gt=0).count()
    total_productos = Product.objects.count()
    
    print(f'📊 Estado actual:')
    print(f'   Movimientos: {movimientos}')
    print(f'   Detalles: {detalles}')
    print(f'   Productos con stock > 0: {productos_stock}/{total_productos}')
    
    # Ejecutar limpieza
    with transaction.atomic():
        print('🗑️ Eliminando detalles...')
        InventoryMovementDetail.objects.all().delete()
        
        print('🗑️ Eliminando movimientos...')
        InventoryMovement.objects.all().delete()
        
        print('📦 Reiniciando stocks...')
        productos_actualizados = Product.objects.update(current_stock=0.0)
        
        print('✅ Limpieza completada!')
        print(f'   Productos actualizados: {productos_actualizados}')
    
    # Verificar
    mov_final = InventoryMovement.objects.count()
    det_final = InventoryMovementDetail.objects.count()
    stock_final = Product.objects.filter(current_stock__gt=0).count()
    
    print(f'🔍 Verificación final:')
    print(f'   Movimientos: {mov_final}')
    print(f'   Detalles: {det_final}')
    print(f'   Productos con stock: {stock_final}')
    
    return mov_final == 0 and det_final == 0 and stock_final == 0

# Para usar: exec(open('limpiar_script.py').read())
# Luego: limpiar_movimientos()
