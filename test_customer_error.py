#!/usr/bin/env python
"""
Script para probar la creación de customers localmente y debuggear el error 400
"""

import os
import sys
import django
import json

# Configurar Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth.models import User
from core.models import Business, CustomerType, Customer
from core.serializers import CustomerSerializer
from core.views_clean import CustomerViewSet

def test_customer_creation():
    """Probar la creación de customer como si fuera desde la API"""
    print("=== Testing Customer Creation ===")
    
    # Datos de prueba que pueden estar causando el error 400
    test_cases = [
        {
            "name": "Test Customer 1",
            "code": "TEST001",
            "email": "test1@example.com",
            "phone": "123-456-7890",
            "address": "Test Address",
            "customer_type": 1,
            "has_credit": False
        },
        {
            "name": "Test Customer 2", 
            "code": "TEST002",
            "email": "test2@example.com",
            "customer_type": 1
            # Sin phone, address - campos opcionales
        },
        {
            "name": "Test Customer Duplicate Code",
            "code": "TIJUANA",  # Código duplicado que ya existe
            "email": "duplicate@example.com",
            "customer_type": 1
        },
        {
            "name": "Test Customer Duplicate Email",
            "code": "TEST003",
            "email": "ebyted@gmail.com",  # Email duplicado que ya existe
            "customer_type": 1
        },
        {
            "name": "Test Customer No Customer Type",
            "code": "TEST004",
            "email": "test4@example.com"
            # Sin customer_type - campo obligatorio
        }
    ]
    
    factory = RequestFactory()
    
    # Obtener un usuario para simular la request
    try:
        user = User.objects.first()
        if not user:
            print("⚠️  No hay usuarios. Creando uno de prueba...")
            user = User.objects.create_user('testuser', 'test@test.com', 'testpass')
    except Exception as e:
        print(f"Error obteniendo usuario: {e}")
        return
    
    for i, data in enumerate(test_cases, 1):
        print(f"\n--- Test Case {i}: {data.get('name', 'Sin nombre')} ---")
        print(f"Datos: {json.dumps(data, indent=2)}")
        
        # Crear request simulada
        request = factory.post('/api/customers/', data, content_type='application/json')
        request.user = user
        
        # Probar con el serializer directamente
        serializer = CustomerSerializer(data=data, context={'request': request})
        
        if serializer.is_valid():
            try:
                customer = serializer.save()
                print(f"✅ Customer creado exitosamente: {customer.name} (ID: {customer.id})")
            except Exception as e:
                print(f"❌ Error al guardar: {e}")
        else:
            print(f"❌ Errores de validación:")
            for field, errors in serializer.errors.items():
                print(f"  - {field}: {errors}")

def check_unique_constraints():
    """Verificar constraints únicos que pueden causar errores"""
    print("\n=== Checking Unique Constraints ===")
    
    customers = Customer.objects.all()
    codes = [c.code for c in customers]
    emails = [c.email for c in customers]
    
    print(f"Codes existentes: {codes}")
    print(f"Emails existentes: {emails}")
    
    # Verificar duplicados
    duplicate_codes = [x for x in codes if codes.count(x) > 1]
    duplicate_emails = [x for x in emails if emails.count(x) > 1]
    
    if duplicate_codes:
        print(f"⚠️  Códigos duplicados encontrados: {duplicate_codes}")
    if duplicate_emails:
        print(f"⚠️  Emails duplicados encontrados: {duplicate_emails}")

def main():
    print("🧪 Testing Customer API Error 400...")
    
    try:
        check_unique_constraints()
        test_customer_creation()
        
        print("\n📝 Resumen de posibles causas del error 400:")
        print("1. Código duplicado (code debe ser único)")
        print("2. Email duplicado (email debe ser único)")
        print("3. customer_type faltante o inválido")
        print("4. business no asignado correctamente")
        print("5. Campos obligatorios faltantes (name, code, email)")
        
    except Exception as e:
        print(f"❌ Error durante las pruebas: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
