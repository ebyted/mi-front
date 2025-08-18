#!/usr/bin/env python3
"""
Script de prueba DIRECTA del serializer
"""

import os
import sys
import django

# Configurar Django
project_path = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.models import User, Product, Warehouse, InventoryMovement
from core.serializers import InventoryMovementSerializer, InventoryMovementDetailSerializer

def test_serializer_directly():
    """Probar el serializer directamente"""
    print("🧪 Probando InventoryMovementSerializer directamente")
    print("=" * 50)
    
    # Datos de prueba
    movement_data = {
        "warehouse_id": 1,
        "type": "IN", 
        "notes": "Movimiento de prueba del serializer",
    }
    
    print(f"📦 Datos de entrada: {movement_data}")
    
    # Crear el serializer
    serializer = InventoryMovementSerializer(data=movement_data)
    
    print(f"🔍 ¿Es válido? {serializer.is_valid()}")
    
    if not serializer.is_valid():
        print(f"❌ Errores de validación: {serializer.errors}")
        return None
    
    print(f"✅ Datos validados: {serializer.validated_data}")
    
    # Obtener un usuario para la prueba
    user = User.objects.filter(is_active=True).first()
    
    try:
        # Intentar crear el movimiento
        movement = serializer.save(user=user)
        print(f"✅ Movimiento creado exitosamente: ID {movement.id}")
        print(f"   - Almacén: {movement.warehouse.name}")
        print(f"   - Tipo: {movement.movement_type}")
        print(f"   - Usuario: {movement.user.email}")
        return movement
    except Exception as e:
        print(f"❌ Error creando movimiento: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_detail_serializer():
    """Probar el detalle del serializer"""
    print("\n🧪 Probando InventoryMovementDetailSerializer")
    print("=" * 50)
    
    # Crear un movimiento primero
    movement = test_serializer_directly()
    if not movement:
        print("❌ No se pudo crear el movimiento, saltando test de detalle")
        return
    
    # Datos de detalle
    detail_data = {
        "product_id": 501,
        "quantity": 10,
        "expiration_date": "2025-12-31",
        "notes": "Detalle de prueba"
    }
    
    print(f"📦 Datos de detalle: {detail_data}")
    
    # Crear el serializer de detalle
    detail_serializer = InventoryMovementDetailSerializer(data=detail_data)
    
    print(f"🔍 ¿Es válido? {detail_serializer.is_valid()}")
    
    if not detail_serializer.is_valid():
        print(f"❌ Errores de validación: {detail_serializer.errors}")
        return None
    
    print(f"✅ Datos validados: {detail_serializer.validated_data}")
    
    try:
        # Intentar crear el detalle
        detail = detail_serializer.save(movement=movement)
        print(f"✅ Detalle creado exitosamente: ID {detail.id}")
        print(f"   - Producto: {detail.product_variant.name}")
        print(f"   - Cantidad: {detail.quantity}")
        return detail
    except Exception as e:
        print(f"❌ Error creando detalle: {e}")
        import traceback
        traceback.print_exc()
        return None

def main():
    print("🚀 Test directo de serializers")
    print("Verificando datos disponibles...")
    
    products = Product.objects.all()[:3]
    warehouses = Warehouse.objects.all()
    users = User.objects.filter(is_active=True)[:3]
    
    print(f"📦 Productos: {products.count()}")
    for p in products:
        print(f"  - {p.id}: {p.name}")
    
    print(f"🏪 Almacenes: {warehouses.count()}")
    for w in warehouses:
        print(f"  - {w.id}: {w.name}")
        
    print(f"👥 Usuarios: {users.count()}")
    for u in users:
        print(f"  - {u.email}")
    
    print("\n" + "="*60)
    
    # Test completo
    test_detail_serializer()

if __name__ == "__main__":
    main()
