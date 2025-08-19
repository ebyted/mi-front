#!/usr/bin/env python
"""
Script simple para debuggear el error 400 del Customer
"""

import os
import sys
import django

# Configurar Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.models import Business, CustomerType, Customer

def simple_test():
    """Prueba simple directa con el modelo"""
    print("=== Prueba Simple de Customer ===")
    
    # Obtener business y customer_type
    business = Business.objects.first()
    customer_type = CustomerType.objects.first()
    
    print(f"Business disponible: {business}")
    print(f"CustomerType disponible: {customer_type}")
    
    if not business:
        print("❌ No hay Business disponible")
        return
        
    if not customer_type:
        print("❌ No hay CustomerType disponible")
        return
    
    # Intentar crear customer directamente
    test_data = {
        'business': business,
        'name': 'Test Customer API',
        'code': 'TESTAPI001',
        'email': 'testapi@example.com',
        'phone': '123-456-7890',
        'address': 'Test Address API',
        'is_active': True,
        'customer_type': customer_type,
        'has_credit': False,
        'credit_limit': 0,
        'credit_days': 0,
        'current_balance': 0
    }
    
    try:
        customer = Customer.objects.create(**test_data)
        print(f"✅ Customer creado exitosamente: {customer.name} (ID: {customer.id})")
        
        # Eliminar el customer de prueba
        customer.delete()
        print("🗑️  Customer de prueba eliminado")
        
    except Exception as e:
        print(f"❌ Error al crear customer: {e}")
        
        # Verificar constraints únicos
        existing_code = Customer.objects.filter(code='TESTAPI001').exists()
        existing_email = Customer.objects.filter(email='testapi@example.com').exists()
        
        print(f"¿Código ya existe? {existing_code}")
        print(f"¿Email ya existe? {existing_email}")

def check_serializer():
    """Probar el serializer directamente"""
    print("\n=== Prueba del CustomerSerializer ===")
    
    from core.serializers import CustomerSerializer
    
    test_data = {
        'name': 'Test Customer Serializer',
        'code': 'TESTSER001',
        'email': 'testser@example.com',
        'phone': '123-456-7890',
        'address': 'Test Address Serializer',
        'customer_type': 1,  # ID del customer_type
        'has_credit': False
    }
    
    # Simular request con usuario
    from django.test import RequestFactory
    from django.contrib.auth.models import User
    
    factory = RequestFactory()
    request = factory.post('/api/customers/', test_data)
    
    try:
        user = User.objects.first()
        if user:
            request.user = user
        else:
            print("⚠️  No hay usuarios disponibles")
    except:
        pass
    
    serializer = CustomerSerializer(data=test_data, context={'request': request})
    
    if serializer.is_valid():
        print("✅ Serializer válido")
        try:
            customer = serializer.save()
            print(f"✅ Customer guardado: {customer.name}")
            customer.delete()
            print("🗑️  Customer de prueba eliminado")
        except Exception as e:
            print(f"❌ Error al guardar: {e}")
    else:
        print("❌ Errores del serializer:")
        for field, errors in serializer.errors.items():
            print(f"  - {field}: {errors}")

if __name__ == "__main__":
    simple_test()
    check_serializer()
