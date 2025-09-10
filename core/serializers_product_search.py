from rest_framework import serializers
from .models import Product, ProductVariant, ProductWarehouseStock
import logging

logger = logging.getLogger(__name__)

class ProductWithMainVariantSerializer(serializers.ModelSerializer):
    product_variant_id = serializers.SerializerMethodField()
    variants = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    brand_name = serializers.SerializerMethodField()
    def get_category_name(self, obj):
        try:
            return obj.category.name if obj.category else None
        except Exception:
            return None

    def get_brand_name(self, obj):
        try:
            return obj.brand.name if obj.brand else None
        except Exception:
            return None

    class Meta:
        model = Product
        fields = '__all__'

    def get_product_variant_id(self, obj):
        try:
            variant = ProductVariant.objects.filter(product=obj).first()
            return variant.id if variant else None
        except Exception as e:
            logger.error(f"Error obteniendo product_variant_id para producto {getattr(obj, 'id', None)}: {e}")
            return None

    def get_variants(self, obj):
        try:
            variants = ProductVariant.objects.filter(product=obj)
            print(f'[DEBUG ProductSearch] Producto {obj.id} tiene {variants.count()} variantes')
            result = []
            for v in variants:
                stocks = ProductWarehouseStock.objects.filter(product_variant=v)
                warehouses_stock = [
                    {
                        'id': s.warehouse.id,
                        'name': s.warehouse.name,
                        'stock': s.quantity or 0
                    }
                    for s in stocks
                ]
                result.append({
                    'id': v.id,
                    'name': v.name,
                    'sku': v.sku,
                    'price': v.sale_price,
                    'warehouses': warehouses_stock,
                })
            return result
        except Exception as e:
            logger.error(f"Error obteniendo variantes para producto {getattr(obj, 'id', None)}: {e}")
            return []
