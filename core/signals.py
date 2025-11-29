from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db import transaction
from django.core.cache import cache
from decimal import Decimal
import logging
import random
import string

from .models import (
    Product,
    ProductVariant,
    InventoryMovementDetail,
    ProductWarehouseStock,
    Warehouse
)

logger = logging.getLogger(__name__)


def generate_sku(product):
    """Genera un SKU único para un producto"""
    base = product.name[:8].upper().replace(' ', '')
    rand = ''.join(random.choices(string.digits, k=4))
    return f"{base}-{rand}"


def calculate_variant_stock(variant, warehouse):
    """
    Calcula el stock real de una variante en un almacén
    basándose en TODOS los movimientos de inventario
    """
    from django.db.models import Sum
    
    # Movimientos de entrada (suman al stock)
    ingresos = InventoryMovementDetail.objects.filter(
        product_variant=variant,
        inventory_movement__warehouse=warehouse,
        inventory_movement__movement_type__in=['purchase', 'adjustment', 'return']
    ).aggregate(total=Sum('quantity'))['total'] or Decimal('0')
    
    # Movimientos de salida (restan al stock)
    salidas = InventoryMovementDetail.objects.filter(
        product_variant=variant,
        inventory_movement__warehouse=warehouse,
        inventory_movement__movement_type__in=['sale', 'transfer', 'damage']
    ).aggregate(total=Sum('quantity'))['total'] or Decimal('0')
    
    stock_final = ingresos - salidas
    return max(stock_final, Decimal('0'))  # El stock nunca puede ser negativo


@receiver(post_save, sender=Product)
def create_product_variant(sender, instance, created, **kwargs):
    """Crea una variante por defecto cuando se crea un nuevo producto"""
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


@receiver(post_save, sender=InventoryMovementDetail)
def update_warehouse_stock_on_movement(sender, instance, created, **kwargs):
    """
    Señal mejorada que actualiza ProductWarehouseStock cuando:
    - Se crea un nuevo movimiento de inventario
    - Se modifica un movimiento existente
    
    Mejoras implementadas:
    - Lock de cache para evitar race conditions
    - Transaction atómica
    - Invalidación de cache
    - Logging detallado
    - Retry asíncrono en caso de error (requiere Celery)
    """
    # Solo procesar si es un movimiento válido
    if not instance.pk:
        return
    
    movement = instance.inventory_movement
    variant = instance.product_variant
    warehouse = movement.warehouse
    
    # Lock key único por variante y almacén
    lock_key = f"stock_update_{variant.id}_{warehouse.id}"
    
    try:
        # Intentar obtener un lock (timeout de 30 segundos)
        lock = cache.lock(lock_key, timeout=30)
        acquired = lock.acquire(blocking=True, timeout=30)
        
        if not acquired:
            logger.warning(
                f"⏳ No se pudo obtener lock para {variant.product.name} "
                f"en {warehouse.name}. Otro proceso está actualizando."
            )
            return
        
        try:
            with transaction.atomic():
                # Usar select_for_update para lock a nivel de base de datos
                stock_obj, was_created = ProductWarehouseStock.objects.select_for_update().get_or_create(
                    product_variant=variant,
                    warehouse=warehouse,
                    defaults={
                        'quantity': Decimal('0'),
                        'min_stock': variant.min_stock or Decimal('0'),
                        'location': warehouse.name,
                        'purchase_price': variant.purchase_price or Decimal('0.00'),
                        'sale_price': variant.price or Decimal('0.00'),
                    }
                )
                
                # Calcular el stock real basándose en movimientos
                new_quantity = calculate_variant_stock(variant, warehouse)
                old_quantity = stock_obj.quantity
                
                # Solo actualizar si cambió
                if old_quantity != new_quantity:
                    stock_obj.quantity = new_quantity
                    stock_obj.purchase_price = variant.purchase_price or Decimal('0.00')
                    stock_obj.sale_price = variant.price or Decimal('0.00')
                    stock_obj.updated_at = movement.date
                    stock_obj.save()
                    
                    # Log del cambio
                    action = "creado" if was_created else "actualizado"
                    logger.info(
                        f"✅ Stock {action}: {variant.product.name} "
                        f"[SKU: {variant.sku}] en {warehouse.name}: "
                        f"{old_quantity} → {new_quantity} "
                        f"(Movimiento: {movement.movement_type})"
                    )
                    
                    # Invalidar cache del frontend
                    cache_keys_to_delete = [
                        f"products_warehouse_{warehouse.id}",
                        f"stock_product_{variant.product.id}",
                        f"warehouse_stock_{warehouse.id}",
                        "all_products_stock"
                    ]
                    cache.delete_many(cache_keys_to_delete)
                    
                    # Verificar si el stock está bajo el mínimo
                    if new_quantity <= stock_obj.min_stock and stock_obj.min_stock > 0:
                        logger.warning(
                            f"⚠️ STOCK BAJO: {variant.product.name} "
                            f"en {warehouse.name}: {new_quantity} "
                            f"(Mínimo: {stock_obj.min_stock})"
                        )
                        
                        # Opcional: Enviar alerta (requiere Celery)
                        try:
                            from core.tasks import send_low_stock_alert
                            send_low_stock_alert.delay(warehouse.id, variant.id)
                        except (ImportError, AttributeError):
                            pass  # Celery no está configurado
                
                elif was_created:
                    logger.info(
                        f"✅ Stock creado: {variant.product.name} "
                        f"[SKU: {variant.sku}] en {warehouse.name}: {new_quantity}"
                    )
        finally:
            lock.release()
    
    except Exception as e:
        # Log del error
        logger.error(
            f"❌ Error actualizando stock para {variant.product.name} "
            f"en {warehouse.name}: {str(e)}",
            exc_info=True
        )
        
        # Intentar de nuevo de forma asíncrona (si Celery está disponible)
        try:
            from core.tasks import sync_warehouse_stock_async
            sync_warehouse_stock_async.apply_async(
                args=[warehouse.id, variant.id],
                countdown=10  # Reintentar en 10 segundos
            )
            logger.info(
                f"🔄 Reintento programado para {variant.product.name} "
                f"en {warehouse.name} en 10 segundos"
            )
        except (ImportError, AttributeError):
            # Si Celery no está disponible, simplemente logear
            logger.error(
                f"⚠️ No se pudo programar reintento automático. "
                f"Celery no está configurado."
            )


@receiver(post_delete, sender=InventoryMovementDetail)
def update_warehouse_stock_on_delete(sender, instance, **kwargs):
    """
    Actualiza el stock cuando se elimina un movimiento de inventario
    """
    movement = instance.inventory_movement
    variant = instance.product_variant
    warehouse = movement.warehouse
    
    lock_key = f"stock_update_{variant.id}_{warehouse.id}"
    
    try:
        lock = cache.lock(lock_key, timeout=30)
        acquired = lock.acquire(blocking=True, timeout=30)
        
        if not acquired:
            logger.warning(
                f"⏳ No se pudo obtener lock para eliminar stock de {variant.product.name}"
            )
            return
        
        try:
            with transaction.atomic():
                try:
                    stock_obj = ProductWarehouseStock.objects.select_for_update().get(
                        product_variant=variant,
                        warehouse=warehouse
                    )
                    
                    # Recalcular stock
                    new_quantity = calculate_variant_stock(variant, warehouse)
                    old_quantity = stock_obj.quantity
                    
                    stock_obj.quantity = new_quantity
                    stock_obj.save()
                    
                    logger.info(
                        f"✅ Stock actualizado tras eliminación: {variant.product.name} "
                        f"en {warehouse.name}: {old_quantity} → {new_quantity}"
                    )
                    
                    # Invalidar cache
                    cache.delete_many([
                        f"products_warehouse_{warehouse.id}",
                        f"stock_product_{variant.product.id}",
                        f"warehouse_stock_{warehouse.id}",
                        "all_products_stock"
                    ])
                    
                except ProductWarehouseStock.DoesNotExist:
                    logger.warning(
                        f"⚠️ No existe registro de stock para {variant.product.name} "
                        f"en {warehouse.name} al eliminar movimiento"
                    )
        finally:
            lock.release()
    
    except Exception as e:
        logger.error(
            f"❌ Error actualizando stock tras eliminación: {str(e)}",
            exc_info=True
        )


@receiver(post_save, sender=Product)
def create_warehouse_stock_for_new_product(sender, instance, created, **kwargs):
    """
    Cuando se crea un nuevo producto, crear registros de stock en todos los almacenes
    """
    if not created:
        return
    
    try:
        # Obtener todas las variantes del producto
        variants = instance.variants.all()
        
        if not variants.exists():
            logger.warning(
                f"⚠️ Producto {instance.name} creado sin variantes. "
                f"No se crearon registros de stock."
            )
            return
        
        # Obtener todos los almacenes activos
        warehouses = Warehouse.objects.filter(is_active=True)
        
        with transaction.atomic():
            for variant in variants:
                for warehouse in warehouses:
                    ProductWarehouseStock.objects.get_or_create(
                        product_variant=variant,
                        warehouse=warehouse,
                        defaults={
                            'quantity': Decimal('0'),
                            'min_stock': variant.min_stock or Decimal('0'),
                            'location': warehouse.name,
                            'purchase_price': variant.purchase_price or Decimal('0.00'),
                            'sale_price': variant.price or Decimal('0.00'),
                        }
                    )
            
            logger.info(
                f"✅ Registros de stock creados para producto: {instance.name} "
                f"({variants.count()} variantes × {warehouses.count()} almacenes = "
                f"{variants.count() * warehouses.count()} registros)"
            )
            
            # Invalidar cache general
            cache.delete("all_products_stock")
    
    except Exception as e:
        logger.error(
            f"❌ Error creando registros de stock para producto {instance.name}: {str(e)}",
            exc_info=True
        )


@receiver(post_save, sender=ProductVariant)
def create_warehouse_stock_for_new_variant(sender, instance, created, **kwargs):
    """
    Cuando se crea una nueva variante, crear registros de stock en todos los almacenes
    """
    if not created:
        return
    
    try:
        warehouses = Warehouse.objects.filter(is_active=True)
        
        with transaction.atomic():
            for warehouse in warehouses:
                ProductWarehouseStock.objects.get_or_create(
                    product_variant=instance,
                    warehouse=warehouse,
                    defaults={
                        'quantity': Decimal('0'),
                        'min_stock': instance.min_stock or Decimal('0'),
                        'location': warehouse.name,
                        'purchase_price': instance.purchase_price or Decimal('0.00'),
                        'sale_price': instance.price or Decimal('0.00'),
                    }
                )
            
            logger.info(
                f"✅ Registros de stock creados para variante: {instance.product.name} "
                f"[SKU: {instance.sku}] en {warehouses.count()} almacenes"
            )
    
    except Exception as e:
        logger.error(
            f"❌ Error creando registros de stock para variante {instance.sku}: {str(e)}",
            exc_info=True
        )


# Crear variantes para productos existentes sin variante al cargar el módulo
def create_missing_variants_for_existing_products():
    """Función auxiliar para crear variantes faltantes en productos existentes"""
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
