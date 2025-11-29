from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Product, ProductVariant
import random
import string

def generate_sku(product):
    base = product.name[:8].upper().replace(' ', '')
    rand = ''.join(random.choices(string.digits, k=4))
    return f"{base}-{rand}"

@receiver(post_save, sender=Product)
def create_product_variant(sender, instance, created, **kwargs):
    if created:
        if not ProductVariant.objects.filter(product=instance).exists():
            sku = generate_sku(instance)
            ProductVariant.objects.create(
                product=instance,
                name=instance.name,
                sku=sku,
                cost_price=0,
                sale_price=0,
                purchase_price=0,
                barcode=instance.barcode or '',
                unit=instance.base_unit,
                low_stock_threshold=0,
                is_active=instance.is_active
            )

# Crear variantes para productos existentes sin variante al cargar el módulo
def create_missing_variants_for_existing_products():
    for product in Product.objects.filter(is_active=True):
        if not ProductVariant.objects.filter(product=product).exists():
            sku = generate_sku(product)
            ProductVariant.objects.create(
                product=product,
                name=product.name,
                sku=sku,
                cost_price=0,
                sale_price=0,
                purchase_price=0,
                barcode=product.barcode or '',
                unit=product.base_unit,
                low_stock_threshold=0,
                is_active=product.is_active
            )

    # Ya no se ejecuta automáticamente al importar el módulo. Ejecutar manualmente si se requiere.


# ============================================
# SEÑALES PARA SINCRONIZACIÓN DE STOCK
# ============================================
from django.db.models.signals import post_delete, pre_delete
from django.db.models import Sum
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


def calculate_variant_stock(variant, warehouse):
    """
    Calcula el stock real de una variante en un almacén específico
    basándose en TODOS los movimientos de inventario
    """
    from .models import InventoryMovementDetail
    
    # Movimientos de INGRESO (+)
    ingresos = InventoryMovementDetail.objects.filter(
        product_variant=variant,
        inventory_movement__warehouse=warehouse,
        inventory_movement__movement_type__in=['purchase', 'return']
    ).aggregate(total=Sum('quantity'))['total'] or Decimal('0')
    
    # Ajustes positivos
    ajustes_positivos = InventoryMovementDetail.objects.filter(
        product_variant=variant,
        inventory_movement__warehouse=warehouse,
        inventory_movement__movement_type='adjustment',
        quantity__gt=0
    ).aggregate(total=Sum('quantity'))['total'] or Decimal('0')
    
    # Movimientos de SALIDA (-)
    salidas = InventoryMovementDetail.objects.filter(
        product_variant=variant,
        inventory_movement__warehouse=warehouse,
        inventory_movement__movement_type__in=['sale', 'transfer', 'damage']
    ).aggregate(total=Sum('quantity'))['total'] or Decimal('0')
    
    # Ajustes negativos
    ajustes_negativos = InventoryMovementDetail.objects.filter(
        product_variant=variant,
        inventory_movement__warehouse=warehouse,
        inventory_movement__movement_type='adjustment',
        quantity__lt=0
    ).aggregate(total=Sum('quantity'))['total'] or Decimal('0')
    
    # Calcular stock final
    stock_final = (ingresos + ajustes_positivos) - (salidas + abs(ajustes_negativos))
    
    return max(stock_final, Decimal('0'))


@receiver(post_save, sender='core.InventoryMovementDetail')
def update_warehouse_stock_on_movement(sender, instance, created, **kwargs):
    """
    Actualiza ProductWarehouseStock cuando hay un movimiento de inventario
    """
    try:
        from .models import ProductWarehouseStock
        
        movement = instance.inventory_movement
        variant = instance.product_variant
        warehouse = movement.warehouse
        
        logger.info(f"📊 Actualizando stock: {variant.product.name} en {warehouse.name}")
        
        # Obtener o crear registro de stock
        stock_obj, was_created = ProductWarehouseStock.objects.get_or_create(
            product_variant=variant,
            warehouse=warehouse,
            defaults={'quantity': Decimal('0')}
        )
        
        # Recalcular stock real
        new_quantity = calculate_variant_stock(variant, warehouse)
        
        if stock_obj.quantity != new_quantity or was_created:
            stock_obj.quantity = new_quantity
            stock_obj.save()
            logger.info(f"✅ Stock actualizado: {variant.product.name} = {new_quantity}")
        
    except Exception as e:
        logger.error(f"❌ Error actualizando stock: {str(e)}")


@receiver(post_delete, sender='core.InventoryMovementDetail')
def update_warehouse_stock_on_delete(sender, instance, **kwargs):
    """
    Recalcula stock cuando se elimina un movimiento
    """
    try:
        from .models import ProductWarehouseStock
        
        movement = instance.inventory_movement
        variant = instance.product_variant
        warehouse = movement.warehouse
        
        stock_obj = ProductWarehouseStock.objects.filter(
            product_variant=variant,
            warehouse=warehouse
        ).first()
        
        if stock_obj:
            new_quantity = calculate_variant_stock(variant, warehouse)
            stock_obj.quantity = new_quantity
            stock_obj.save()
            logger.info(f"✅ Stock recalculado tras eliminación: {variant.product.name} = {new_quantity}")
            
    except Exception as e:
        logger.error(f"❌ Error recalculando stock: {str(e)}")


@receiver(post_save, sender=ProductVariant)
def create_warehouse_stock_for_new_variant_sync(sender, instance, created, **kwargs):
    """
    Crea registros de stock en todos los almacenes cuando se crea una nueva variante
    """
    if created:
        try:
            from .models import ProductWarehouseStock, Warehouse
            
            warehouses = Warehouse.objects.filter(is_active=True)
            
            for warehouse in warehouses:
                ProductWarehouseStock.objects.get_or_create(
                    product_variant=instance,
                    warehouse=warehouse,
                    defaults={'quantity': Decimal('0')}
                )
            
            logger.info(f"✅ Stock inicial creado para {instance.product.name} en {warehouses.count()} almacenes")
            
        except Exception as e:
            logger.error(f"❌ Error creando stock inicial: {str(e)}")


@receiver(pre_delete, sender=ProductVariant)
def cleanup_warehouse_stock_on_variant_delete(sender, instance, **kwargs):
    """
    Limpia registros de stock cuando se elimina una variante
    """
    try:
        from .models import ProductWarehouseStock
        
        deleted_count = ProductWarehouseStock.objects.filter(
            product_variant=instance
        ).delete()[0]
        
        logger.info(f"✅ Eliminados {deleted_count} registros de stock para variante eliminada")
        
    except Exception as e:
        logger.error(f"❌ Error limpiando registros: {str(e)}")
