#!/usr/bin/env python3
"""
Script simple para importar proveedores desde PostgreSQL
"""
import os
import sys
import django
import subprocess

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maestro_inventario_backend.settings')
django.setup()

from core.models import Supplier, Business

def run_postgres_query(query):
    try:
        cmd = [
            'docker', 'exec', '-i', 'sancho_db_v2',
            'psql', '-U', 'maestro', '-d', 'maestro', 
            '-t', '-A', '-F', '|', '-c', query
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', check=True)
        if result.stdout:
            return result.stdout.strip().split('\n')
        return []
    except Exception as e:
        print(f'❌ Error: {e}')
        return []

def import_suppliers():
    print("🚚 Importando proveedores desde PostgreSQL...")
    
    business = Business.objects.first()
    suppliers_query = "SELECT name, contact_person, email, phone, address FROM core_supplier;"
    suppliers_data = run_postgres_query(suppliers_query)

    suppliers_imported = 0
    for row in suppliers_data:
        if row and '|' in row:
            parts = row.split('|')
            if len(parts) >= 1 and parts[0]:
                name = parts[0]
                contact_person = parts[1] if len(parts) > 1 and parts[1] else ''
                email = parts[2] if len(parts) > 2 and parts[2] else ''
                phone = parts[3] if len(parts) > 3 and parts[3] else ''
                address = parts[4] if len(parts) > 4 and parts[4] else ''
                
                supplier, created = Supplier.objects.get_or_create(
                    name=name,
                    defaults={
                        'business': business,
                        'contact_person': contact_person,
                        'email': email,
                        'phone': phone,
                        'address': address,
                        'is_active': True
                    }
                )
                if created:
                    suppliers_imported += 1

    print(f"✅ Proveedores importados: {suppliers_imported}")
    print(f"🚚 Total proveedores: {Supplier.objects.count()}")

if __name__ == '__main__':
    import_suppliers()
