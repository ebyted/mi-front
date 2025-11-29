"""
Comando para probar la sincronización de stock
Uso: python manage.py test_sync
"""
from django.core.management.base import BaseCommand
from django.db.models import Count
from core.models import (
    ProductWarehouseStock, 
    InventoryMovementDetail,
    Warehouse,
    ProductVariant
)
from core.signals import calculate_variant_stock
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Prueba la sincronización de stock y muestra estadísticas'

    def add_arguments(self, parser):
        parser.add_argument(
            '--warehouse-id',
            type=int,
            help='ID del almacén a sincronizar (opcional, por defecto todos)'
        )
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Corregir discrepancias encontradas'
        )

    def handle(self, *args, **options):
        warehouse_id = options.get('warehouse_id')
        fix_discrepancies = options.get('fix')

        self.stdout.write(self.style.SUCCESS('\n🔍 Iniciando verificación de sincronización de stock...\n'))

        # Obtener almacenes
        warehouses = Warehouse.objects.filter(id=warehouse_id) if warehouse_id else Warehouse.objects.all()
        
        if not warehouses.exists():
            self.stdout.write(self.style.ERROR('❌ No se encontraron almacenes'))
            return

        total_checked = 0
        total_discrepancies = 0
        total_fixed = 0

        for warehouse in warehouses:
            self.stdout.write(f'\n📦 Almacén: {warehouse.name} (ID: {warehouse.id})')
            self.stdout.write('=' * 60)

            # Obtener todos los stocks registrados
            stocks = ProductWarehouseStock.objects.filter(
                warehouse=warehouse
            ).select_related('product_variant__product')

            discrepancies = []

            for stock in stocks:
                total_checked += 1
                variant = stock.product_variant
                
                # Calcular stock real
                real_stock = calculate_variant_stock(variant, warehouse)
                
                if stock.quantity != real_stock:
                    diff = real_stock - stock.quantity
                    total_discrepancies += 1
                    
                    discrepancies.append({
                        'product': variant.product.name,
                        'sku': variant.sku,
                        'registered': stock.quantity,
                        'real': real_stock,
                        'diff': diff
                    })

                    # Mostrar discrepancia
                    color = self.style.WARNING if abs(diff) < 10 else self.style.ERROR
                    self.stdout.write(
                        color(
                            f'  ⚠️  {variant.product.name} [{variant.sku}]\n'
                            f'      Registrado: {stock.quantity} | Real: {real_stock} | Diferencia: {diff:+.2f}'
                        )
                    )

                    # Corregir si se solicitó
                    if fix_discrepancies:
                        stock.quantity = real_stock
                        stock.save()
                        total_fixed += 1
                        self.stdout.write(
                            self.style.SUCCESS(f'      ✅ Corregido: {stock.quantity}')
                        )

            # Resumen por almacén
            if discrepancies:
                self.stdout.write(
                    self.style.WARNING(
                        f'\n  📊 Resumen: {len(discrepancies)} discrepancias de {stocks.count()} productos'
                    )
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'\n  ✅ Sin discrepancias: {stocks.count()} productos verificados'
                    )
                )

            # Verificar productos sin movimientos pero con stock registrado
            stocks_with_quantity = stocks.filter(quantity__gt=0)
            for stock in stocks_with_quantity:
                movements = InventoryMovementDetail.objects.filter(
                    product_variant=stock.product_variant,
                    inventory_movement__warehouse=warehouse
                )
                
                if not movements.exists():
                    self.stdout.write(
                        self.style.WARNING(
                            f'  ⚠️  Stock sin movimientos: {stock.product_variant.product.name} '
                            f'[{stock.product_variant.sku}] - Cantidad: {stock.quantity}'
                        )
                    )

        # Resumen global
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS('\n📊 RESUMEN GLOBAL\n'))
        self.stdout.write(f'  Total productos verificados: {total_checked}')
        self.stdout.write(f'  Discrepancias encontradas: {total_discrepancies}')
        
        if fix_discrepancies:
            self.stdout.write(self.style.SUCCESS(f'  ✅ Productos corregidos: {total_fixed}'))
        
        sync_percentage = ((total_checked - total_discrepancies) / total_checked * 100) if total_checked > 0 else 100
        
        if sync_percentage >= 95:
            style = self.style.SUCCESS
        elif sync_percentage >= 80:
            style = self.style.WARNING
        else:
            style = self.style.ERROR
        
        self.stdout.write(style(f'  Sincronización: {sync_percentage:.2f}%'))

        # Estadísticas de movimientos
        self.stdout.write('\n📈 ESTADÍSTICAS DE MOVIMIENTOS\n')
        movement_stats = InventoryMovementDetail.objects.values(
            'inventory_movement__movement_type'
        ).annotate(
            count=Count('id')
        ).order_by('-count')

        for stat in movement_stats:
            movement_type = stat['inventory_movement__movement_type']
            count = stat['count']
            self.stdout.write(f'  {movement_type}: {count} movimientos')

        self.stdout.write('\n' + '=' * 60)
        
        if not fix_discrepancies and total_discrepancies > 0:
            self.stdout.write(
                self.style.WARNING(
                    '\n💡 Tip: Usa --fix para corregir las discrepancias automáticamente'
                )
            )
        
        self.stdout.write(self.style.SUCCESS('\n✅ Verificación completada\n'))
