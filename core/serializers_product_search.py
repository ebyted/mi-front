from rest_framework import serializers
from .models import Product, ProductVariant
import logging

logger = logging.getLogger(__name__)

class ProductWithMainVariantSerializer(serializers.ModelSerializer):
    product_variant_id = serializers.SerializerMethodField()
    variants = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'

    def get_product_variant_id(self, obj):
        try:
            variant = ProductVariant.objects.filter(product=obj, is_main=True).first()
            if not variant:
                variant = ProductVariant.objects.filter(product=obj).first()
            return variant.id if variant else None
        except Exception as e:
            logger.error(f"Error obteniendo product_variant_id para producto {getattr(obj, 'id', None)}: {e}")
            return None

    def get_variants(self, obj):
        try:
            variants = ProductVariant.objects.filter(product=obj)
            return [
                {
                    'id': v.id,
                    'name': v.name,
                    'sku': v.sku,
                    'price': v.sale_price,
                    'stock': v.stock,
                }
                for v in variants
            ]
        except Exception as e:
            logger.error(f"Error obteniendo variantes para producto {getattr(obj, 'id', None)}: {e}")
            return []
