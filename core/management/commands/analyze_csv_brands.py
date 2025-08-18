import re
import csv
from django.core.management.base import BaseCommand
from core.models import Brand, Business

class Command(BaseCommand):
    help = 'Analiza el archivo cat_art.csv y crea las marcas faltantes'

    def handle(self, *args, **options):
        # Leer el archivo CSV
        brands_to_create = set()
        
        with open('cat_art.csv', 'r', encoding='utf-8') as file:
            reader = csv.reader(file, delimiter=';')
            next(reader)  # Skip header
            
            for row in reader:
                if len(row) >= 3:
                    producto = row[0].strip()
                    marca_columna = row[2].strip() if row[2] else ""
                    
                    # Buscar marcas entre paréntesis en la descripción
                    matches = re.findall(r'\(([^)]+)\)', producto)
                    for match in matches:
                        brand = match.strip()
                        # Filtrar números solos y marcas muy cortas
                        if not brand.isdigit() and len(brand) > 1 and not brand.startswith(';'):
                            # Limpiar marcas comunes
                            brand_clean = brand.replace("'", "").replace('"', '').strip()
                            if brand_clean and not brand_clean.isdigit():
                                brands_to_create.add(brand_clean)

        # Obtener marcas existentes
        existing_brands = set(Brand.objects.values_list('name', flat=True))
        
        # Encontrar marcas faltantes
        missing_brands = brands_to_create - existing_brands
        
        print(f'📊 ANÁLISIS DE MARCAS:')
        print(f'   • Marcas extraídas del CSV: {len(brands_to_create)}')
        print(f'   • Marcas existentes en BD: {len(existing_brands)}')
        print(f'   • Marcas faltantes: {len(missing_brands)}')
        
        if missing_brands:
            print(f'\n🔍 MARCAS QUE FALTAN POR CREAR:')
            for i, brand in enumerate(sorted(missing_brands), 1):
                print(f'   {i:3d}. {brand}')
            
            # Confirmar creación
            confirm = input(f'\n¿Crear las {len(missing_brands)} marcas faltantes? (s/N): ')
            if confirm.lower() in ['s', 'si', 'yes', 'y']:
                business = Business.objects.first()
                created_count = 0
                
                for brand_name in sorted(missing_brands):
                    try:
                        Brand.objects.create(
                            name=brand_name,
                            business=business,
                            is_active=True
                        )
                        created_count += 1
                        print(f'   ✅ Creada: {brand_name}')
                    except Exception as e:
                        print(f'   ❌ Error creando {brand_name}: {e}')
                
                print(f'\n🎉 COMPLETADO: {created_count} marcas creadas exitosamente!')
            else:
                print('❌ Operación cancelada.')
        else:
            print('\n✅ Todas las marcas del CSV ya existen en la base de datos.')
