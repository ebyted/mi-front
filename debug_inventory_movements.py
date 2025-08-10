#!/usr/bin/env python
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

def test_inventory_movements():
    print("🔍 Diagnosticando problema con InventoryMovement...")
    
    try:
        # Test 1: Importar modelos
        print("📦 Importando modelos...")
        from core.models import InventoryMovement, InventoryMovementDetail, User, Warehouse, ProductVariant
        print("✅ Modelos importados correctamente")
        
        # Test 2: Importar serializers
        print("📄 Importando serializers...")
        from core.serializers import InventoryMovementSerializer
        print("✅ Serializers importados correctamente")
        
        # Test 3: Contar movimientos
        print("📊 Contando movimientos...")
        total_movements = InventoryMovement.objects.count()
        print(f"✅ Total de movimientos: {total_movements}")
        
        if total_movements == 0:
            print("⚠️ No hay movimientos en la base de datos")
            return
        
        # Test 4: Obtener primeros movimientos (básico)
        print("🔍 Obteniendo primeros movimientos (query básico)...")
        movements_basic = list(InventoryMovement.objects.all()[:5])
        print(f"✅ Query básico exitoso: {len(movements_basic)} movimientos")
        
        # Test 5: Obtener movimientos con select_related
        print("🔗 Obteniendo movimientos con select_related...")
        movements_related = list(InventoryMovement.objects.select_related('warehouse', 'user', 'authorized_by')[:5])
        print(f"✅ Query con select_related exitoso: {len(movements_related)} movimientos")
        
        # Test 6: Obtener movimientos con prefetch_related
        print("🔗 Obteniendo movimientos con prefetch_related...")
        movements_prefetch = list(InventoryMovement.objects.prefetch_related('details')[:5])
        print(f"✅ Query con prefetch_related exitoso: {len(movements_prefetch)} movimientos")
        
        # Test 7: Serializar un movimiento
        print("📄 Probando serialización...")
        if movements_basic:
            movement = movements_basic[0]
            print(f"🔍 Serializando movimiento ID: {movement.id}")
            
            serializer = InventoryMovementSerializer(movement)
            data = serializer.data
            print(f"✅ Serialización exitosa para movimiento {movement.id}")
            print(f"   - Tipo: {data.get('movement_type')}")
            print(f"   - Almacén: {data.get('warehouse', {}).get('name', 'N/A')}")
            print(f"   - Usuario: {data.get('user', {}).get('email', 'N/A')}")
            print(f"   - Detalles: {len(data.get('details', []))}")
            print(f"   - Total quantity: {data.get('total_quantity', 0)}")
        
        # Test 8: Probar problemas específicos con detalles
        print("🔍 Verificando detalles de movimientos...")
        movements_with_details = InventoryMovement.objects.filter(details__isnull=False).distinct()[:3]
        print(f"✅ Movimientos con detalles: {movements_with_details.count()}")
        
        for movement in movements_with_details:
            details_count = movement.details.count()
            print(f"   - Movimiento {movement.id}: {details_count} detalles")
            
            # Verificar si hay problemas con los detalles
            for detail in movement.details.all()[:2]:  # Solo primeros 2 para no sobrecargar
                try:
                    pv = detail.product_variant
                    print(f"     ✅ Detalle {detail.id}: Producto {pv.name if pv else 'None'}")
                except Exception as e:
                    print(f"     ❌ Error en detalle {detail.id}: {e}")
        
        # Test 9: Probar el ViewSet completo
        print("🎯 Probando ViewSet...")
        from core.views import InventoryMovementViewSet
        viewset = InventoryMovementViewSet()
        queryset = viewset.get_queryset()
        print(f"✅ ViewSet queryset: {queryset.count()} elementos")
        
        # Test 10: Probar serialización de lista completa (pequeña)
        print("📋 Probando serialización de lista...")
        movements_sample = queryset[:3]
        serializer = InventoryMovementSerializer(movements_sample, many=True)
        data_list = serializer.data
        print(f"✅ Serialización de lista exitosa: {len(data_list)} elementos")
        
        print("\n🎉 ¡Todos los tests pasaron! El problema podría estar en otro lugar.")
        
    except Exception as e:
        print(f"\n❌ Error encontrado: {e}")
        import traceback
        print("\n📋 Traceback completo:")
        traceback.print_exc()
        
        # Información adicional de debugging
        print(f"\n🔍 Tipo de error: {type(e).__name__}")
        print(f"🔍 Mensaje: {str(e)}")

if __name__ == "__main__":
    test_inventory_movements()
