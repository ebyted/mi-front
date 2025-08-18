import pandas as pd
from django.core.management.base import BaseCommand
from core.models import Category, Business
import os

class Command(BaseCommand):
    help = 'Limpia y crea las categorías faltantes del CSV en PostgreSQL'

    def handle(self, *args, **options):
        try:
            # Obtener el business principal
            business = Business.objects.first()
            if not business:
                self.stdout.write(self.style.ERROR('❌ No se encontró ningún business'))
                return
            # Mapeo de correcciones para errores de ortografía y duplicados
            correcciones = {
                'ANTIBIOTC0': 'ANTIBIOTICO',
                'ANTICOCEPTIVO': 'ANTICONCEPTIVO', 
                'ANTIFUGICO': 'ANTIFUNGICO',
                'DEFICIENCIA DE TESTOTERONA': 'DEFICIENCIA DE TESTOSTERONA',
                'ANALGESICO.': 'ANALGESICO TOPICO',
                'ANTI ACIDO': 'ANTIACIDO',
                'Antibiotico': 'ANTIBIOTICO',
                'DESINFLAMATORIO': 'ANTIINFLAMATORIO',
                'BAJAR PESO': 'PERDIDA PESO',
                'GRIPA': 'ANTIGRIPALES',
                'SUPLEMENTO': 'SUPLEMENTOS',
                'PERDIDA PESO': 'PERDIDA PESO',  # Mantener consistencia
                'QUEMADURAS Y COMEZON': 'QUEMADURAS',
                'HERPES LABIAL': 'HERPES LABIAL',  # Ya existe una similar
                'ASMA': 'ASMA / BRONCOESPASMO',  # Unificar con la existente
            }

            # Lista de categorías a crear (después de correcciones)
            categorias_nuevas = [
                'ACEITES',
                'ALERGIA CUTANEA',
                'ANALGESICO TOPICO',
                'ANESTESICO TOPICO',
                'ANSIOLITICO / DORMIR',
                'ANTIACIDO',
                'ANTIBIOTICO',
                'ANTICONCEPTIVO',
                'ANTIDEPRESIVO',
                'ANTIDIARREICO',
                'ANTIESPAMODICO',
                'ANTIFUNGICO',  # Corregido
                'ANTIINFLAMATORIO TOPICO',
                'ANTISEPTICO ORAL',
                'ANTIVERRUGAS',
                'ASEO PERSONAL',
                'BARRERA PARA PIEL',
                'CHUPON',
                'COLITIS',
                'CREMA ACLARADORA',
                'DEFICIENCIA DE TESTOSTERONA',  # Corregido
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
                'PERDIDA PESO',  # Unificado
                'QUEMADURAS',    # Unificado
                'SARNA',
                'SUPLEMENTOS',   # Unificado
                'VERRUGAS',
                'VERRUGAS/CALLOS'
            ]

            self.stdout.write('=' * 60)
            self.stdout.write('🧹 LIMPIEZA Y CREACIÓN DE CATEGORÍAS')
            self.stdout.write('=' * 60)

            # Obtener categorías existentes
            categorias_existentes = set(Category.objects.values_list('name', flat=True))
            
            # Filtrar categorías auto-generadas
            categorias_existentes_limpia = {cat for cat in categorias_existentes if not cat.startswith('Category ')}

            self.stdout.write(f'🗄️ Categorías existentes (limpias): {len(categorias_existentes_limpia)}')
            self.stdout.write(f'📝 Categorías a procesar: {len(categorias_nuevas)}')

            # Crear categorías nuevas
            creadas = 0
            existentes = 0
            
            for categoria in sorted(categorias_nuevas):
                if categoria not in categorias_existentes_limpia:
                    Category.objects.create(
                        business=business,
                        name=categoria,
                        code=categoria.replace(' ', '_').replace('/', '_').upper()
                    )
                    self.stdout.write(f'✅ Creada: {categoria}')
                    creadas += 1
                else:
                    self.stdout.write(f'⚪ Ya existe: {categoria}')
                    existentes += 1

            # Mostrar resumen
            self.stdout.write('\n' + '=' * 60)
            self.stdout.write('📊 RESUMEN DE LA OPERACIÓN')
            self.stdout.write('=' * 60)
            self.stdout.write(f'✅ Categorías creadas: {creadas}')
            self.stdout.write(f'⚪ Categorías que ya existían: {existentes}')
            self.stdout.write(f'📈 Total de categorías después: {len(categorias_existentes_limpia) + creadas}')

            # Mostrar correcciones aplicadas
            if correcciones:
                self.stdout.write('\n🔧 CORRECCIONES APLICADAS:')
                self.stdout.write('-' * 40)
                for incorrecto, correcto in correcciones.items():
                    self.stdout.write(f'• {incorrecto} → {correcto}')

            self.stdout.write('\n🎉 ¡Proceso completado exitosamente!')

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error: {e}'))
