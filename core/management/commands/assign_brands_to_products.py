from django.core.management.base import BaseCommand
from core.models import Product, Brand
import re

class Command(BaseCommand):
    help = 'Asigna marcas a productos basándose en el nombre de marca entre paréntesis'

    def handle(self, *args, **options):
        try:
            self.stdout.write('=' * 60)
            self.stdout.write('🔍 ASIGNACIÓN AUTOMÁTICA DE MARCAS A PRODUCTOS')
            self.stdout.write('=' * 60)

            # Obtener productos sin marca asignada o todos los productos
            productos = Product.objects.all()
            marcas = Brand.objects.all()
            
            # Crear diccionario de marcas para búsqueda rápida
            marcas_dict = {}
            for marca in marcas:
                # Normalizar nombre de marca para búsqueda
                nombre_normalizado = marca.name.upper().strip()
                marcas_dict[nombre_normalizado] = marca
                
                # También agregar variaciones comunes
                if ' ' in nombre_normalizado:
                    # Sin espacios
                    marcas_dict[nombre_normalizado.replace(' ', '')] = marca
                    # Con guiones
                    marcas_dict[nombre_normalizado.replace(' ', '-')] = marca

            self.stdout.write(f'📊 Productos a analizar: {productos.count()}')
            self.stdout.write(f'🏷️ Marcas disponibles: {marcas.count()}')
            
            actualizados = 0
            no_encontrados = 0
            ya_asignados = 0
            errores = []

            for producto in productos:
                try:
                    # Buscar texto entre paréntesis en el nombre del producto
                    patron = r'\(([^)]+)\)'
                    coincidencias = re.findall(patron, producto.name)
                    
                    if not coincidencias:
                        continue
                    
                    # Tomar la última coincidencia (generalmente la marca está al final)
                    posible_marca = coincidencias[-1].upper().strip()
                    
                    # Buscar la marca en el diccionario
                    marca_encontrada = None
                    
                    # Búsqueda directa
                    if posible_marca in marcas_dict:
                        marca_encontrada = marcas_dict[posible_marca]
                    else:
                        # Búsqueda parcial - buscar si alguna marca contiene el texto
                        for nombre_marca, marca_obj in marcas_dict.items():
                            if posible_marca in nombre_marca or nombre_marca in posible_marca:
                                marca_encontrada = marca_obj
                                break
                    
                    if marca_encontrada:
                        # Verificar si ya tiene marca asignada
                        if producto.brand and producto.brand.id == marca_encontrada.id:
                            ya_asignados += 1
                            self.stdout.write(f'⚪ Ya asignado: {producto.name[:50]}... → {marca_encontrada.name}')
                        else:
                            # Asignar la marca
                            producto.brand = marca_encontrada
                            producto.save()
                            actualizados += 1
                            self.stdout.write(f'✅ Actualizado: {producto.name[:50]}... → {marca_encontrada.name}')
                    else:
                        no_encontrados += 1
                        self.stdout.write(f'❌ No encontrada: {producto.name[:50]}... → ({posible_marca})')
                        
                except Exception as e:
                    errores.append(f'Error en producto {producto.id}: {str(e)}')
                    continue

            # Mostrar resumen
            self.stdout.write('\n' + '=' * 60)
            self.stdout.write('📊 RESUMEN DE LA OPERACIÓN')
            self.stdout.write('=' * 60)
            self.stdout.write(f'✅ Productos actualizados: {actualizados}')
            self.stdout.write(f'⚪ Ya tenían marca correcta: {ya_asignados}')
            self.stdout.write(f'❌ Marcas no encontradas: {no_encontrados}')
            self.stdout.write(f'🔴 Errores: {len(errores)}')

            if errores:
                self.stdout.write('\n🔴 ERRORES ENCONTRADOS:')
                for error in errores[:10]:  # Mostrar solo los primeros 10
                    self.stdout.write(f'• {error}')
                if len(errores) > 10:
                    self.stdout.write(f'... y {len(errores) - 10} errores más')

            # Mostrar algunos ejemplos de marcas no encontradas
            if no_encontrados > 0:
                self.stdout.write('\n🔍 MARCAS NO ENCONTRADAS MÁS COMUNES:')
                marcas_faltantes = {}
                for producto in productos:
                    coincidencias = re.findall(r'\(([^)]+)\)', producto.name)
                    if coincidencias:
                        posible_marca = coincidencias[-1].upper().strip()
                        if posible_marca not in marcas_dict:
                            marcas_faltantes[posible_marca] = marcas_faltantes.get(posible_marca, 0) + 1
                
                # Mostrar las 10 más comunes
                marcas_ordenadas = sorted(marcas_faltantes.items(), key=lambda x: x[1], reverse=True)
                for marca, count in marcas_ordenadas[:10]:
                    self.stdout.write(f'• {marca} ({count} productos)')

            self.stdout.write('\n🎉 ¡Proceso completado!')

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error general: {e}'))
