#!/usr/bin/env python
"""
Script para limpiar todos los movimientos de almacén y reiniciar stocks
"""
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dbackf.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.db import connection, transaction
from core.models import (
    Product, InventoryMovement, InventoryMovementDetail, 
    Warehouse, Business
)

def limpiar_movimientos_almacen():
    """
    Limpia todos los movimientos de almacén y reinicia stocks
    """
    try:
        with transaction.atomic():
            print("🗄️ Iniciando limpieza de movimientos de almacén...")
            
            # 1. Contar registros antes de la limpieza
            movimientos_count = InventoryMovement.objects.count()
            detalles_count = InventoryMovementDetail.objects.count()
            
            print(f"📊 Registros encontrados:")
            print(f"   - Movimientos de inventario: {movimientos_count}")
            print(f"   - Detalles de movimientos: {detalles_count}")
            
            # 2. Eliminar todos los detalles de movimientos
            print("🗑️ Eliminando detalles de movimientos...")
            InventoryMovementDetail.objects.all().delete()
            
            # 3. Eliminar todos los movimientos de inventario
            print("🗑️ Eliminando movimientos de inventario...")
            InventoryMovement.objects.all().delete()
            
            # 4. Reiniciar stocks de productos a 0
            print("📦 Reiniciando stocks de productos a 0...")
            productos_actualizados = Product.objects.update(current_stock=0.0)
            print(f"   - Productos actualizados: {productos_actualizados}")
            
            # 5. Reiniciar secuencias de IDs
            print("🔄 Reiniciando secuencias de IDs...")
            with connection.cursor() as cursor:
                # Reiniciar secuencia de InventoryMovement
                cursor.execute("SELECT setval(pg_get_serial_sequence('core_inventorymovement', 'id'), 1, false);")
                
                # Reiniciar secuencia de InventoryMovementDetail
                cursor.execute("SELECT setval(pg_get_serial_sequence('core_inventorymovementdetail', 'id'), 1, false);")
            
            print("✅ Limpieza completada exitosamente!")
            print("📋 Resumen:")
            print(f"   - Movimientos eliminados: {movimientos_count}")
            print(f"   - Detalles eliminados: {detalles_count}")
            print(f"   - Productos con stock reiniciado: {productos_actualizados}")
            print("   - Secuencias de IDs reiniciadas")
            
    except Exception as e:
        print(f"❌ Error durante la limpieza: {str(e)}")
        raise

def verificar_limpieza():
    """
    Verifica que la limpieza se haya realizado correctamente
    """
    print("\n🔍 Verificando limpieza...")
    
    movimientos_restantes = InventoryMovement.objects.count()
    detalles_restantes = InventoryMovementDetail.objects.count()
    productos_con_stock = Product.objects.filter(current_stock__gt=0).count()
    total_productos = Product.objects.count()
    
    print(f"📊 Estado después de la limpieza:")
    print(f"   - Movimientos restantes: {movimientos_restantes}")
    print(f"   - Detalles restantes: {detalles_restantes}")
    print(f"   - Productos con stock > 0: {productos_con_stock}")
    print(f"   - Total de productos: {total_productos}")
    
    if movimientos_restantes == 0 and detalles_restantes == 0 and productos_con_stock == 0:
        print("✅ Limpieza verificada correctamente!")
        return True
    else:
        print("⚠️ La limpieza no se completó correctamente")
        return False

if __name__ == "__main__":
    print("🚀 Iniciando script de limpieza de movimientos de almacén")
    print("=" * 60)
    
    # Confirmar antes de proceder
    respuesta = input("¿Estás seguro de que quieres eliminar TODOS los movimientos de almacén y reiniciar stocks? (escriba 'SI' para confirmar): ")
    
    if respuesta.upper() == 'SI':
        limpiar_movimientos_almacen()
        verificar_limpieza()
    else:
        print("❌ Operación cancelada por el usuario")
        
    print("\n🏁 Script finalizado")
