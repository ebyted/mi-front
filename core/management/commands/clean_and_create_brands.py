from django.core.management.base import BaseCommand
from core.models import Brand, Business

class Command(BaseCommand):
    help = 'Limpia y crea las marcas faltantes del CSV en PostgreSQL'

    def handle(self, *args, **options):
        try:
            # Obtener el business principal
            business = Business.objects.first()
            if not business:
                self.stdout.write(self.style.ERROR('❌ No se encontró ningún business'))
                return

            self.stdout.write('=' * 60)
            self.stdout.write('🧹 LIMPIEZA COMPLETA DE MARCAS')
            self.stdout.write('=' * 60)

            # PASO 1: Mapeo de correcciones para errores de ortografía y duplicados
            correcciones = {
                'BOEHRINGER INGELHEM': 'BOEHRINGER INGELHEIM',
                'GENOMMALAB': 'GENOMMA LAB',
                'BRISTOL MYERS SQUIBB': 'BRISTOL-MYERS SQUIBB',
                'BRISTOL-MYERS': 'BRISTOL-MYERS SQUIBB',
                'SANOFI AVENTS': 'SANOFI AVENTIS',
                'FARMA HISP': 'FARMA HISPANO',
                'COYOACAN QUIMICA': 'COYOACAN QUIMICAS',  # Unificar variaciones
                'DEGORTS CHEMICAL': 'DEGORTS',
                'DEGORTS/CHEMICAL': 'DEGORTS',
                'GEL PHARMA': 'GELPHARMA',
                'GELpharma': 'GELPHARMA',
                'GLAXO SMITH KLINE': 'GSK',
                'L LOPEZ': 'LAB LOPEZ',
                'LABS LOPEZ': 'LAB LOPEZ',
                'ARMSTRON': 'ARMSTRONG',
                'ATANTLIS': 'ATLANTIS',
                'AZTRA ZENECA': 'ASTRAZENECA',
                'SOPHIA GENERICO': 'SOPHIA',
                'URANIA': 'URANIA',  # Mantener solo una
            }

            # PASO 2: Lista de marcas limpias a crear (después de correcciones)
            marcas_nuevas = [
                'ACCORD',
                'ADAMS', 
                'ALCON',
                'ALMIRALL',
                'ALPRIMA',
                'ALTIA',
                'ANAHUAC',
                'ANCALMO',
                'ARANDA',
                'ARMSTRONG',  # Corregido
                'ASOFARMA',
                'ASTRAZENECA',  # Corregido
                'ATLANTIS',  # Corregido
                'AVITUS',
                'BAJAMED',
                'BEKA',
                'BEST',
                'BIOKEMICAL',
                'BIOMIRAL',
                'BIOSEARCH',
                'BOEHRINGER INGELHEIM',  # Corregido
                'BQM',
                'BREMER',
                'BRESALTEC',
                'BRISTOL-MYERS SQUIBB',  # Unificado
                'BUSTILLOS',
                'CARNOT LABORATORIOS',
                'CB LA PIEDAD',
                'CHEMICAL',
                'CHIAPAS',
                'CMD',
                'CODIFARMA',
                'COLUMBIA',
                'COYOACAN QUIMICAS',  # Unificado
                'DEGORTS',  # Unificado
                'DIALICELS',
                'DINA',
                'DR MONTFORT',
                'EDERKA',
                'EKO',
                'ENER GREEN',
                'EVOLUTION',
                'FARMA HISPANO',  # Unificado
                'FARNAT',
                'GELPHARMA',  # Unificado
                'GENETICA',
                'GENOMA',
                'GENOMMA',
                'GENOMMA LAB',  # Corregido
                'GISEL',
                'GN+VIDA',
                'GRIN',
                'GRISI',
                'GSK',  # Unificado
                'HALEON',
                'HOMEOPATICOS MILENIUM',
                'INV FARMACEUTICAS',
                'JALOMA',
                'JANSSEN',
                'L HIGIA',
                'LAB LOPEZ',  # Unificado
                'L. SERRAL',
                'MEDICA NATURAL',
                'MERCK',
                'ORDONEZ',
                'SANOFI AVENTIS',  # Corregido
                'SOPHIA',  # Unificado
                'STREGER',
                'UCB DE MEXICO',
                'URANIA'
            ]

            # PASO 3: Obtener marcas existentes
            marcas_existentes = set(Brand.objects.values_list('name', flat=True))
            
            # Filtrar marcas auto-generadas
            marcas_existentes_limpia = {marca for marca in marcas_existentes if not marca.startswith('Brand ')}

            self.stdout.write(f'🗄️ Marcas existentes (limpias): {len(marcas_existentes_limpia)}')
            self.stdout.write(f'📝 Marcas nuevas a crear: {len(marcas_nuevas)}')

            # PASO 4: Crear marcas nuevas
            creadas = 0
            existentes = 0
            
            for marca in sorted(marcas_nuevas):
                if marca not in marcas_existentes_limpia:
                    Brand.objects.create(
                        business=business,
                        name=marca
                    )
                    self.stdout.write(f'✅ Creada: {marca}')
                    creadas += 1
                else:
                    self.stdout.write(f'⚪ Ya existe: {marca}')
                    existentes += 1

            # PASO 5: Mostrar resumen final
            total_final = Brand.objects.filter(business=business).count()
            
            self.stdout.write('\n' + '=' * 60)
            self.stdout.write('📊 RESUMEN FINAL')
            self.stdout.write('=' * 60)
            self.stdout.write(f'✅ Marcas nuevas creadas: {creadas}')
            self.stdout.write(f'⚪ Marcas que ya existían: {existentes}')
            self.stdout.write(f'📈 Total de marcas final: {total_final}')

            # PASO 6: Mostrar correcciones aplicadas
            if correcciones:
                self.stdout.write('\n🔧 CORRECCIONES APLICADAS:')
                self.stdout.write('-' * 40)
                for incorrecto, correcto in correcciones.items():
                    self.stdout.write(f'• {incorrecto} → {correcto}')

            # PASO 7: Mostrar algunas marcas para verificación
            self.stdout.write('\n📋 ÚLTIMAS MARCAS CREADAS:')
            ultimas_marcas = Brand.objects.filter(business=business).order_by('-id')[:10]
            for marca in ultimas_marcas:
                self.stdout.write(f'• ID: {marca.id} | {marca.name}')

            self.stdout.write('\n🎉 ¡Proceso completado exitosamente!')

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error: {e}'))
