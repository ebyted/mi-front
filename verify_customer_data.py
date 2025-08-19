#!/usr/bin/env python
"""
Script para verificar y crear datos necesarios para el modelo Customer
"""

import os
import sys
import django

# Configurar Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.models import Business, CustomerType, Customer

def verificar_customer_types():
    """Verificar si existen CustomerTypes y crearlos si no existen"""
    print("=== Verificando CustomerTypes ===")
    
    customer_types = CustomerType.objects.all()
    print(f"CustomerTypes existentes: {customer_types.count()}")
    
    for ct in customer_types:
        print(f"- Level {ct.level}: {ct.discount_percentage}% descuento")
    
    if customer_types.count() == 0:
        print("Creando CustomerTypes por defecto...")
        
        default_types = [
            {'level': 1, 'discount_percentage': 0.00},
            {'level': 2, 'discount_percentage': 5.00},
            {'level': 3, 'discount_percentage': 10.00},
            {'level': 4, 'discount_percentage': 15.00},
        ]
        
        for type_data in default_types:
            ct = CustomerType.objects.create(**type_data)
            print(f"✅ Creado CustomerType Level {ct.level} con {ct.discount_percentage}% descuento")

def verificar_business():
    """Verificar si existe al menos un Business"""
    print("\n=== Verificando Business ===")
    
    businesses = Business.objects.all()
    print(f"Business existentes: {businesses.count()}")
    
    for business in businesses:
        print(f"- {business.name} (ID: {business.id})")
    
    if businesses.count() == 0:
        print("⚠️  No hay Business creados. Creando uno por defecto...")
        business = Business.objects.create(
            name="Sancho Distribuidora",
            nit="123456789-0",
            address="Dirección por defecto",
            phone="123-456-7890",
            email="info@sanchodistribuidora.com"
        )
        print(f"✅ Creado Business: {business.name}")

def verificar_customers():
    """Verificar customers existentes"""
    print("\n=== Verificando Customers ===")
    
    customers = Customer.objects.all()
    print(f"Customers existentes: {customers.count()}")
    
    for customer in customers[:5]:  # Mostrar solo los primeros 5
        print(f"- {customer.name} ({customer.code}) - {customer.email}")

def main():
    print("🔍 Verificando datos necesarios para Customer...")
    
    try:
        verificar_business()
        verificar_customer_types()
        verificar_customers()
        
        print("\n✅ Verificación completada!")
        print("\nAhora puedes probar crear un customer con estos datos mínimos:")
        print("POST /api/customers/")
        print("""{
    "name": "Cliente Test",
    "code": "CLI001",
    "email": "cliente@test.com",
    "phone": "123-456-7890",
    "address": "Dirección del cliente",
    "customer_type": 1,
    "has_credit": false
}""")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
