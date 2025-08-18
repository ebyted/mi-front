import re
from django.core.management.base import BaseCommand
from core.models import Brand

class Command(BaseCommand):
    help = 'Elimina todas las marcas que empiecen con "Brand"'

    def handle(self, *args, **options):
        # Buscar marcas que empiecen con "Brand"
        brands_to_delete = Brand.objects.filter(name__startswith='Brand')
        
        print(f'🔍 MARCAS ENCONTRADAS CON PATRÓN "Brand + algo": {brands_to_delete.count()}')
        
        if brands_to_delete.count() > 0:
            print(f'\n📋 LISTA DE MARCAS A ELIMINAR:')
            for i, brand in enumerate(brands_to_delete.order_by('name'), 1):
                print(f'   {i:3d}. ID: {brand.id:3d} | Nombre: {brand.name}')
            
            # Confirmar eliminación
            confirm = input(f'\n❓ ¿Eliminar las {brands_to_delete.count()} marcas que empiecen con "Brand"? (s/N): ')
            if confirm.lower() in ['s', 'si', 'yes', 'y']:
                deleted_count = 0
                
                for brand in brands_to_delete:
                    try:
                        brand_name = brand.name
                        brand_id = brand.id
                        brand.delete()
                        deleted_count += 1
                        print(f'   ✅ Eliminada: ID {brand_id} - {brand_name}')
                    except Exception as e:
                        print(f'   ❌ Error eliminando ID {brand.id} - {brand.name}: {e}')
                
                print(f'\n🎉 COMPLETADO: {deleted_count} marcas eliminadas exitosamente!')
                
                # Mostrar estadística final
                remaining = Brand.objects.count()
                print(f'📊 MARCAS RESTANTES EN BD: {remaining}')
            else:
                print('❌ Operación cancelada.')
        else:
            print('\n✅ No se encontraron marcas con el patrón "Brand + algo".')
