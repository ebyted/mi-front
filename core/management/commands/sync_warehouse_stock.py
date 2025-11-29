from django.core.management.base import BaseCommand
from django.db.models import Q
from core.models import ProductWarehouseStock, ProductVariant, Warehouse
from decimal import Decimal
import sys


class Command(BaseCommand):
    help = 'Sincroniza el stock de productos con almacenes'

    def add_arguments(self, parser):
        parser.add_argument(
            '--warehouse',
            type=str,
            help='Nombre específico del almacén (ej: TIJUANA)'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Forzar actualización de todos los registros'
        )
        parser.add_argument(
            '--fix-discrepancies',
            action='store_true',
            help='Solo corregir discrepancias detectadas'
        )

    def handle(self, *args, **options):
        from core.signals import calculate_variant_stock
        
        warehouse_filter = options.get('warehouse')
        force = options['force']
        fix_only = options['fix_discrepancies']

        self.stdout.write(self.style.SUCCESS('='*80))
        self.stdout.write(self.style.SUCCESS('🔄 SINCRONIZACIÓN DE STOCK DE ALMACENES'))
        self.stdout.write(self.style.SUCCESS('='*80))

        # Obtener almacenes a procesar
        if warehouse_filter:
            warehouses = Warehouse.objects.filter(
                Q(name__icontains=warehouse_filter) |
                Q(code__icontains=warehouse_filter)
            )
            if not warehouses.exists():
                self.stdout.write(self.style.ERROR(f'❌ No se encontró almacén con nombre/código: {warehouse_filter}'))
                return
        else:
            warehouses = Warehouse.objects.filter(is_active=True)

        self.stdout.write(f'\n📦 Procesando {warehouses.count()} almacén(es):')
        for w in warehouses:
            self.stdout.write(f'   - {w.name} (ID: {w.id})')

        total_created = 0
        total_updated = 0
        total_fixed = 0
        total_skipped = 0

        for warehouse in warehouses:
            self.stdout.write(f'\n🏢 Procesando: {warehouse.name}')
            
            variants = ProductVariant.objects.filter(
                product__is_active=True
            ).select_related('product', 'product__brand', 'product__category')
            
            self.stdout.write(f'   Total de variantes activas: {variants.count()}')
            
            progress = 0
            for variant in variants:
                progress += 1
                
                # Mostrar progreso cada 100 productos
                if progress % 100 == 0:
                    self.stdout.write(f'   Procesados: {progress}/{variants.count()}', ending='\r')
                    sys.stdout.flush()
                
                try:
                    # Calcular stock real
                    real_stock = calculate_variant_stock(variant, warehouse)
                    
                    # Obtener o crear registro
                    stock_obj, created = ProductWarehouseStock.objects.get_or_create(
                        product_variant=variant,
                        warehouse=warehouse,
                        defaults={
                            'quantity': real_stock,
                            'min_stock': 0,
                            'location': ''
                        }
                    )

                    if created:
                        total_created += 1
                        if progress <= 10 or created:  # Mostrar primeros 10 o todos los creados
                            self.stdout.write(
                                self.style.SUCCESS(
                                    f'   ✅ Creado: {variant.product.name[:40]} (Stock: {real_stock})'
                                )
                            )
                    elif force or stock_obj.quantity != real_stock:
                        # Actualizar si hay discrepancia o se fuerza
                        if stock_obj.quantity != real_stock:
                            old_qty = stock_obj.quantity
                            stock_obj.quantity = real_stock
                            stock_obj.save()
                            
                            total_fixed += 1
                            if fix_only or total_fixed <= 20:  # Mostrar primeras 20 correcciones
                                self.stdout.write(
                                    self.style.WARNING(
                                        f'   ⚠️ Corregido: {variant.product.name[:40]} '
                                        f'({old_qty} → {real_stock})'
                                    )
                                )
                        else:
                            total_updated += 1
                    else:
                        total_skipped += 1

                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f'   ❌ Error: {variant.product.name[:40]} - {str(e)}'
                        )
                    )

            self.stdout.write(f'\n   ✅ Almacén {warehouse.name} completado')

        # Resumen final
        self.stdout.write('\n' + '='*80)
        self.stdout.write(self.style.SUCCESS('✅ SINCRONIZACIÓN COMPLETADA'))
        self.stdout.write(self.style.SUCCESS(f'   ➕ Registros creados: {total_created}'))
        if total_fixed > 0:
            self.stdout.write(self.style.WARNING(f'   ⚠️ Discrepancias corregidas: {total_fixed}'))
        self.stdout.write(f'   🔄 Registros actualizados: {total_updated}')
        self.stdout.write(f'   ⏭️  Sin cambios: {total_skipped}')
        self.stdout.write(f'   📊 Total procesado: {total_created + total_updated + total_fixed + total_skipped}')
        self.stdout.write('='*80)
        
        # Verificación final
        total_stocks = ProductWarehouseStock.objects.count()
        self.stdout.write(f'\n📈 Total de registros en ProductWarehouseStock: {total_stocks}')
