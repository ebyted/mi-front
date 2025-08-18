import pandas as pd
from django.core.management.base import BaseCommand
from core.models import Category
import os

class Command(BaseCommand):
    help = 'Compara las categorías del CSV con las que existen en PostgreSQL'

    def handle(self, *args, **options):
        try:
            # Leer archivo CSV
            csv_path = 'cat_art.csv'
            if not os.path.exists(csv_path):
                self.stdout.write(self.style.ERROR(f'❌ Archivo {csv_path} no encontrado'))
                return

            # Leer CSV
            df = pd.read_csv(csv_path, sep=';', encoding='utf-8')
            
            # Obtener categorías del CSV
            categorias_csv = set()
            if 'CATEGORIA' in df.columns:
                categorias_temp = df['CATEGORIA'].dropna()
                categorias_temp = categorias_temp[categorias_temp != '']
                categorias_csv = set(categorias_temp.unique())
            
            # Obtener categorías de PostgreSQL
            categorias_bd = set(Category.objects.values_list('name', flat=True))
            
            # Filtrar categorías auto-generadas (Category + número)
            categorias_bd_limpia = {cat for cat in categorias_bd if not cat.startswith('Category ')}
            
            # Encontrar categorías que están en CSV pero no en BD
            categorias_faltantes = categorias_csv - categorias_bd_limpia
            
            # Mostrar resultados
            self.stdout.write('=' * 60)
            self.stdout.write('📊 COMPARACIÓN DE CATEGORÍAS CSV vs POSTGRESQL')
            self.stdout.write('=' * 60)
            
            self.stdout.write(f'📁 Categorías en CSV: {len(categorias_csv)}')
            self.stdout.write(f'🗄️ Categorías en PostgreSQL (limpias): {len(categorias_bd_limpia)}')
            self.stdout.write(f'❌ Categorías faltantes: {len(categorias_faltantes)}')
            
            if categorias_faltantes:
                self.stdout.write('\n🔍 CATEGORÍAS QUE NO EXISTEN EN POSTGRESQL:')
                self.stdout.write('-' * 50)
                for i, categoria in enumerate(sorted(categorias_faltantes), 1):
                    self.stdout.write(f'{i:3d}. {categoria}')
                
                # Crear archivo con categorías faltantes
                with open('categorias_faltantes.txt', 'w', encoding='utf-8') as f:
                    f.write('CATEGORÍAS FALTANTES EN POSTGRESQL\n')
                    f.write('=' * 40 + '\n')
                    for categoria in sorted(categorias_faltantes):
                        f.write(f'{categoria}\n')
                
                self.stdout.write(f'\n📝 Lista guardada en: categorias_faltantes.txt')
            else:
                self.stdout.write('\n✅ Todas las categorías del CSV ya existen en PostgreSQL')
            
            # Mostrar algunas categorías existentes para referencia
            categorias_existentes = categorias_csv & categorias_bd_limpia
            if categorias_existentes:
                self.stdout.write(f'\n✅ CATEGORÍAS QUE YA EXISTEN ({len(categorias_existentes)}):')
                self.stdout.write('-' * 50)
                for i, categoria in enumerate(sorted(list(categorias_existentes)[:10]), 1):
                    self.stdout.write(f'{i:3d}. {categoria}')
                if len(categorias_existentes) > 10:
                    self.stdout.write(f'... y {len(categorias_existentes) - 10} más')

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error: {e}'))
