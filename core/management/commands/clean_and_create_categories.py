from django.core.management.base import BaseCommand
from core.models import Category, Business

class Command(BaseCommand):
    help = 'Limpia categorías auto-generadas y crea las categorías faltantes del CSV'

    def handle(self, *args, **options):
        try:
            # Obtener el business principal
            business = Business.objects.first()
            if not business:
                self.stdout.write(self.style.ERROR('❌ No se encontró ningún business'))
                return

            self.stdout.write('=' * 60)
            self.stdout.write('🧹 LIMPIEZA COMPLETA DE CATEGORÍAS')
            self.stdout.write('=' * 60)

            # PASO 1: Eliminar categorías auto-generadas
            categorias_autogeneradas = Category.objects.filter(name__startswith='Category ')
            count_eliminadas = categorias_autogeneradas.count()
            
            if count_eliminadas > 0:
                self.stdout.write(f'🗑️ Eliminando {count_eliminadas} categorías auto-generadas...')
                categorias_autogeneradas.delete()
                self.stdout.write('✅ Categorías auto-generadas eliminadas')

            # PASO 2: Lista de categorías limpias a crear
            categorias_nuevas = [
                'ACEITES',
                'ALERGIA CUTANEA',
                'ANALGESICO TOPICO',
                'ANESTESICO TOPICO',
                'ANSIOLITICO / DORMIR',
                'ANTIACIDO',
                'ANTICONCEPTIVO',
                'ANTIDEPRESIVO',
                'ANTIDIARREICO',
                'ANTIESPAMODICO',
                'ANTIFUNGICO',
                'ANTIINFLAMATORIO TOPICO',
                'ANTISEPTICO ORAL',
                'ANTIVERRUGAS',
                'ASEO PERSONAL',
                'BARRERA PARA PIEL',
                'CHUPON',
                'COLITIS',
                'CREMA ACLARADORA',
                'DEFICIENCIA DE TESTOSTERONA',
                'DESCONGESTIVO',
                'DIABETES',
                'DISFUNCION ERECTIL',
                'DISLIPIDEMIA',
                'DOLOR',
                'DOLOR GARGANTA',
                'DOLOR MUSCULAR',
                'DULCE',
                'ESTEROIDE TOPICO',
                'ESTRENIMIENTO',
                'FUNGICIDA',
                'HEMORROIDE',
                'HERIDAS',
                'HERPES LABIAL',
                'HIGIENE PERSONAL',
                'HIPOTIROIDISMO',
                'INDIGESTION',
                'INSUMOS',
                'INSUMOS MEDICOS',
                'LAXANTE',
                'MALESTAR ESTOMACAL',
                'NAUSEAS/VOMITO/MAREO',
                'OFTALMICO',
                'OJO ROJO',
                'PERDIDA PESO',
                'QUEMADURAS',
                'SARNA',
                'VERRUGAS',
                'VERRUGAS/CALLOS'
            ]

            # PASO 3: Obtener categorías existentes (después de la limpieza)
            categorias_existentes = set(Category.objects.values_list('name', flat=True))
            
            self.stdout.write(f'🗄️ Categorías existentes después de limpieza: {len(categorias_existentes)}')
            self.stdout.write(f'📝 Categorías nuevas a crear: {len(categorias_nuevas)}')

            # PASO 4: Crear categorías nuevas
            creadas = 0
            existentes = 0
            
            for categoria in sorted(categorias_nuevas):
                if categoria not in categorias_existentes:
                    Category.objects.create(
                        business=business,
                        name=categoria,
                        code=categoria.replace(' ', '_').replace('/', '_').upper()[:50]  # Limitar a 50 chars
                    )
                    self.stdout.write(f'✅ Creada: {categoria}')
                    creadas += 1
                else:
                    self.stdout.write(f'⚪ Ya existe: {categoria}')
                    existentes += 1

            # PASO 5: Mostrar resumen final
            total_final = Category.objects.count()
            
            self.stdout.write('\n' + '=' * 60)
            self.stdout.write('📊 RESUMEN FINAL')
            self.stdout.write('=' * 60)
            self.stdout.write(f'🗑️ Categorías auto-generadas eliminadas: {count_eliminadas}')
            self.stdout.write(f'✅ Categorías nuevas creadas: {creadas}')
            self.stdout.write(f'⚪ Categorías que ya existían: {existentes}')
            self.stdout.write(f'📈 Total de categorías final: {total_final}')

            # PASO 6: Mostrar algunas categorías para verificación
            self.stdout.write('\n📋 ÚLTIMAS CATEGORÍAS CREADAS:')
            ultimas_categorias = Category.objects.order_by('-id')[:10]
            for cat in ultimas_categorias:
                self.stdout.write(f'• ID: {cat.id} | {cat.name}')

            self.stdout.write('\n🎉 ¡Proceso completado exitosamente!')

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error: {e}'))
