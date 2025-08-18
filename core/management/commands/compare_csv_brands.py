import pandas as pd
from django.core.management.base import BaseCommand
from core.models import Brand
import os

class Command(BaseCommand):
    help = 'Compara las marcas del CSV con las que existen en PostgreSQL'

    def handle(self, *args, **options):
        try:
            # Leer archivo CSV
            csv_path = 'cat_art.csv'
            if not os.path.exists(csv_path):
                self.stdout.write(self.style.ERROR(f'❌ Archivo {csv_path} no encontrado'))
                return

            # Leer CSV
            df = pd.read_csv(csv_path, sep=';', encoding='utf-8')
            
            # Obtener marcas del CSV
            marcas_csv = set()
            if 'Marca' in df.columns:
                marcas_temp = df['Marca'].dropna()
                marcas_temp = marcas_temp[marcas_temp != '']
                marcas_csv = set(marcas_temp.unique())
            
            # Obtener marcas de PostgreSQL
            marcas_bd = set(Brand.objects.values_list('name', flat=True))
            
            # Filtrar marcas auto-generadas (Brand + número)
            marcas_bd_limpia = {marca for marca in marcas_bd if not marca.startswith('Brand ')}
            
            # Encontrar marcas que están en CSV pero no en BD
            marcas_faltantes = marcas_csv - marcas_bd_limpia
            
            # Encontrar duplicados y errores comunes
            errores_detectados = []
            duplicados_detectados = []
            
            # Buscar errores de ortografía comunes
            for marca in marcas_csv:
                # Detectar variaciones conocidas
                if 'BRISTOL-MYERS' in marca and 'SQUIBB' in marca:
                    if marca != 'BRISTOL-MYERS SQUIBB':
                        errores_detectados.append((marca, 'BRISTOL-MYERS SQUIBB'))
                elif 'GENOMMA' in marca and 'LAB' in marca:
                    if marca != 'GENOMMA LAB':
                        errores_detectados.append((marca, 'GENOMMA LAB'))
                elif 'BOEHRINGER' in marca:
                    if marca != 'BOEHRINGER INGELHEIM':
                        errores_detectados.append((marca, 'BOEHRINGER INGELHEIM'))
                elif 'SANOFI' in marca and 'AVENTIS' in marca:
                    if marca != 'SANOFI AVENTIS':
                        errores_detectados.append((marca, 'SANOFI AVENTIS'))
            
            # Mostrar resultados
            self.stdout.write('=' * 60)
            self.stdout.write('🏷️ COMPARACIÓN DE MARCAS CSV vs POSTGRESQL')
            self.stdout.write('=' * 60)
            
            self.stdout.write(f'📁 Marcas en CSV: {len(marcas_csv)}')
            self.stdout.write(f'🗄️ Marcas en PostgreSQL (limpias): {len(marcas_bd_limpia)}')
            self.stdout.write(f'❌ Marcas faltantes: {len(marcas_faltantes)}')
            
            if errores_detectados:
                self.stdout.write(f'\n🔧 ERRORES DE ORTOGRAFÍA DETECTADOS ({len(errores_detectados)}):')
                self.stdout.write('-' * 50)
                for i, (incorrecto, correcto) in enumerate(errores_detectados, 1):
                    self.stdout.write(f'{i:3d}. {incorrecto} → {correcto}')
            
            if marcas_faltantes:
                self.stdout.write(f'\n🔍 MARCAS QUE NO EXISTEN EN POSTGRESQL:')
                self.stdout.write('-' * 50)
                for i, marca in enumerate(sorted(marcas_faltantes), 1):
                    print(f'{i:3d}. {marca}')
                
                # Crear archivo con marcas faltantes
                with open('marcas_faltantes.txt', 'w', encoding='utf-8') as f:
                    f.write('MARCAS FALTANTES EN POSTGRESQL\n')
                    f.write('=' * 40 + '\n')
                    for marca in sorted(marcas_faltantes):
                        f.write(f'{marca}\n')
                
                self.stdout.write(f'\n📝 Lista guardada en: marcas_faltantes.txt')
            else:
                self.stdout.write('\n✅ Todas las marcas del CSV ya existen en PostgreSQL')
            
            # Mostrar algunas marcas existentes para referencia
            marcas_existentes = marcas_csv & marcas_bd_limpia
            if marcas_existentes:
                self.stdout.write(f'\n✅ MARCAS QUE YA EXISTEN ({len(marcas_existentes)}):')
                self.stdout.write('-' * 50)
                for i, marca in enumerate(sorted(list(marcas_existentes)[:10]), 1):
                    self.stdout.write(f'{i:3d}. {marca}')
                if len(marcas_existentes) > 10:
                    self.stdout.write(f'... y {len(marcas_existentes) - 10} más')

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error: {e}'))
