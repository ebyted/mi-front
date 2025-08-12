from .models import AuditLog
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import (
    User, Business, Category, Brand, Unit, Product, ProductVariant, Warehouse, ProductWarehouseStock,
    Supplier, SupplierProduct, PurchaseOrder, PurchaseOrderItem, PurchaseOrderReceipt, PurchaseOrderReceiptItem,
    InventoryMovement, ExchangeRate, CustomerType, Customer, SalesOrder, SalesOrderItem, Quotation, QuotationItem,
    Role, MenuOption, InventoryMovementDetail
)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Agregar información adicional al token
        token['email'] = user.email
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        return token

class AuditLogSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()
    class Meta:
        model = AuditLog
        fields = '__all__'

class MenuOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuOption
        fields = ['id', 'name', 'label']

class RoleSerializer(serializers.ModelSerializer):
    menu_options = MenuOptionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Role
        fields = ['id', 'name', 'menu_options']

class UserSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'role', 'is_active', 'is_staff']
        
class UserMenuOptionsSerializer(serializers.ModelSerializer):
    """Serializer específico para obtener las opciones de menú del usuario"""
    menu_options = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role', 'menu_options']
    
    def get_menu_options(self, obj):
        if obj.role:
            return MenuOptionSerializer(obj.role.menu_options.all(), many=True).data
        return []

class BusinessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = '__all__'

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = '__all__'

class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    price = serializers.SerializerMethodField(read_only=True)
    current_stock = serializers.SerializerMethodField(read_only=True)
    image = serializers.CharField(source='image_url', read_only=True)  # Alias para compatibilidad con frontend
    category = CategorySerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    
    class Meta:
        model = Product
        fields = ['id', 'business', 'category', 'brand', 'name', 'description', 'sku', 
                 'barcode', 'base_unit', 'minimum_stock', 'maximum_stock', 'image_url', 
                 'image', 'is_active', 'group', 'created_at', 'updated_at', 'price', 'current_stock']
    
    def get_price(self, obj):
        """Obtener el precio del primer ProductVariant asociado"""
        try:
            # Buscar el primer ProductVariant asociado a este Product
            product_variant = ProductVariant.objects.filter(product=obj).first()
            if product_variant and product_variant.sale_price:
                return float(product_variant.sale_price)
            return 0.0
        except Exception as e:
            return 0.0
    
    def get_current_stock(self, obj):
        """Calcular el stock total disponible sumando todos los almacenes"""
        try:
            from django.db.models import Sum
            # Obtener todas las variantes del producto
            product_variants = ProductVariant.objects.filter(product=obj)
            
            total_stock = 0
            for variant in product_variants:
                # Sumar el stock de todos los almacenes para esta variante
                stock_sum = ProductWarehouseStock.objects.filter(
                    product_variant=variant
                ).aggregate(total=Sum('quantity'))['total'] or 0
                total_stock += stock_sum
            
            return max(0, total_stock)  # No devolver stock negativo
        except Exception as e:
            return 0

class ProductVariantSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    
    class Meta:
        model = ProductVariant
        fields = '__all__'

class WarehouseSerializer(serializers.ModelSerializer):
    business = serializers.PrimaryKeyRelatedField(queryset=Business.objects.all(), required=False, allow_null=True)
    
    class Meta:
        model = Warehouse
        fields = '__all__'
    
    def create(self, validated_data):
        # Si no se proporciona business, usar el primero disponible o crear uno
        if 'business' not in validated_data or not validated_data['business']:
            first_business = Business.objects.first()
            if not first_business:
                # Crear un business por defecto si no existe ninguno
                first_business = Business.objects.create(
                    name="Empresa Principal",
                    code="EMP001",
                    description="Empresa creada automáticamente"
                )
            validated_data['business'] = first_business
        
        return super().create(validated_data)

class ProductWarehouseStockSerializer(serializers.ModelSerializer):
    product_variant = ProductVariantSerializer(read_only=True)
    warehouse = WarehouseSerializer(read_only=True)
    
    # Campos adicionales para facilitar el frontend
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    product_name = serializers.CharField(source='product_variant.name', read_only=True)
    product_code = serializers.CharField(source='product_variant.sku', read_only=True)
    product_price = serializers.DecimalField(source='product_variant.sale_price', max_digits=12, decimal_places=2, read_only=True)
    
    # Campos de categoría y marca desde Product
    category_name = serializers.CharField(source='product_variant.product.category.name', read_only=True)
    brand_name = serializers.CharField(source='product_variant.product.brand.name', read_only=True)
    
    # Campos de stock mínimo y máximo
    min_stock_variant = serializers.IntegerField(source='product_variant.low_stock_threshold', read_only=True)
    min_stock_product = serializers.FloatField(source='product_variant.product.minimum_stock', read_only=True)
    max_stock_product = serializers.FloatField(source='product_variant.product.maximum_stock', read_only=True)
    
    class Meta:
        model = ProductWarehouseStock
        fields = '__all__'

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'

class SupplierProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierProduct
        fields = '__all__'

class PurchaseOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrder
        fields = '__all__'

class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrderItem
        fields = '__all__'

class PurchaseOrderReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrderReceipt
        fields = '__all__'

class PurchaseOrderReceiptItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrderReceiptItem
        fields = '__all__'

class InventoryMovementDetailSerializer(serializers.ModelSerializer):
    product_variant = ProductVariantSerializer(read_only=True)
    
    class Meta:
        model = InventoryMovementDetail
        fields = ['id', 'product_variant', 'quantity', 'price', 'total', 'lote', 'expiration_date']

class InventoryMovementSerializer(serializers.ModelSerializer):
    warehouse = WarehouseSerializer(read_only=True)
    warehouse_id = serializers.PrimaryKeyRelatedField(queryset=Warehouse.objects.all(), source='warehouse', write_only=True)
    details = InventoryMovementDetailSerializer(many=True, read_only=True)
    details_ids = serializers.PrimaryKeyRelatedField(queryset=InventoryMovementDetail.objects.all(), source='details', many=True, write_only=True, required=False)
    user = UserSerializer(read_only=True)

    class Meta:
        model = InventoryMovement
        fields = '__all__'
        extra_fields = ['warehouse_id', 'details_ids']

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        # warehouse como objeto anidado
        rep['warehouse'] = WarehouseSerializer(instance.warehouse).data if instance.warehouse else None
        # details como lista de objetos
        details_qs = instance.details.all() if hasattr(instance, 'details') else []
        rep['details'] = InventoryMovementDetailSerializer(details_qs, many=True).data
        # usuario creador como objeto anidado
        rep['user'] = UserSerializer(instance.user).data if instance.user else None
        # cantidad total sumada
        rep['total_quantity'] = sum([float(d.quantity) for d in details_qs if d.quantity is not None]) if details_qs else 0
        return rep

class ExchangeRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExchangeRate
        fields = '__all__'

class CustomerTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerType
        fields = '__all__'

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'

class SalesOrderSerializer(serializers.ModelSerializer):
    items = serializers.ListField(write_only=True, required=False)
    items_detail = serializers.SerializerMethodField(read_only=True)
    business = serializers.PrimaryKeyRelatedField(queryset=Business.objects.all(), required=False, allow_null=True)
    customer = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.all(), required=True)
    
    class Meta:
        model = SalesOrder
        fields = ['id', 'business', 'customer', 'order_date', 'status', 'total_amount', 'notes', 
                 'created_at', 'exchange', 'items', 'items_detail']
        extra_kwargs = {
            'order_date': {'required': False},
            'status': {'required': False},
        }
    
    def get_items_detail(self, obj):
        """Obtener los items de la orden con detalles del producto"""
        try:
            items = []
            # Verificar si el objeto tiene la relación de items
            if hasattr(obj, 'items'):
                for order_item in obj.items.all():
                    try:
                        # Manejar casos donde product_variant puede ser None
                        product = None
                        if order_item.product_variant and hasattr(order_item.product_variant, 'product'):
                            product = order_item.product_variant.product
                        
                        items.append({
                            'id': order_item.id,
                            'product': {
                                'id': product.id if product else None,
                                'name': product.name if product else 'Producto desconocido',
                                'code': product.code if product else ''
                            },
                            'quantity': float(order_item.quantity),
                            'price': float(order_item.unit_price),
                            'total': float(order_item.total_price)
                        })
                    except Exception as e:
                        # Si hay error con un item específico, continuar con los demás
                        continue
            return items
        except Exception as e:
            # Si hay cualquier error, retornar array vacío
            return []
    
    def create(self, validated_data):
        from django.utils import timezone
        import logging
        logger = logging.getLogger(__name__)
        
        # Extraer items del validated_data si existen
        items_data = validated_data.pop('items', [])
        logger.info(f"📦 SalesOrder CREATE - Items recibidos: {len(items_data)}")
        logger.info(f"📦 Items data: {items_data}")
        
        # Si no se proporciona business, usar el primero disponible o crear uno
        if 'business' not in validated_data or not validated_data['business']:
            first_business = Business.objects.first()
            if not first_business:
                # Crear un business por defecto si no existe ninguno
                first_business = Business.objects.create(
                    name="Empresa Principal",
                    code="EMP001",
                    description="Empresa creada automáticamente"
                )
            validated_data['business'] = first_business
        
        # Establecer valores por defecto si no se proporcionan
        if 'order_date' not in validated_data:
            validated_data['order_date'] = timezone.now()
        
        if 'status' not in validated_data:
            validated_data['status'] = 'pending'
        
        # Crear la orden de venta
        sales_order = SalesOrder.objects.create(**validated_data)
        logger.info(f"📦 SalesOrder creada con ID: {sales_order.id}")
        
        # Crear los items de la orden si se proporcionaron
        created_items = 0
        for item_data in items_data:
            logger.info(f"📦 Procesando item: {item_data}")
            product_variant_id = item_data.get('product_variant')
            product_id = item_data.get('product')
            product_variant = None
            if product_variant_id:
                try:
                    product_variant = ProductVariant.objects.get(id=product_variant_id)
                except ProductVariant.DoesNotExist:
                    logger.warning(f"📦 ProductVariant no encontrado con ID: {product_variant_id}")
                    continue
            elif product_id:
                try:
                    product = Product.objects.get(id=product_id)
                    product_variant = ProductVariant.objects.filter(product=product).first()
                    if not product_variant:
                        logger.warning(f"📦 No se encontró ProductVariant para Product ID: {product_id}")
                        continue
                except Product.DoesNotExist:
                    logger.error(f"📦 Product no encontrado con ID: {product_id}")
                    continue
            else:
                logger.warning(f"📦 Item sin product_id ni product_variant: {item_data}")
                continue

            try:
                unit_price = float(item_data.get('price', 0))
                quantity = float(item_data.get('quantity', 1))
                total_price = unit_price * quantity
                order_item = SalesOrderItem.objects.create(
                    sales_order=sales_order,
                    product_variant=product_variant,
                    quantity=quantity,
                    unit_price=unit_price,
                    total_price=total_price
                )
                created_items += 1
                logger.info(f"📦 Item creado: {order_item.id} - {product_variant.product.name if product_variant else 'N/A'} - Precio: {unit_price}")
            except Exception as e:
                logger.error(f"📦 Error creando SalesOrderItem: {e}")
                continue
        
        logger.info(f"📦 Total items creados: {created_items}")
        return sales_order

class SalesOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesOrderItem
        fields = '__all__'

class QuotationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quotation
        fields = '__all__'


class QuotationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuotationItem
        fields = '__all__'

# Serializers para Role y MenuOption

class MenuOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuOption
        fields = ['id', 'name', 'label']

class RoleSerializer(serializers.ModelSerializer):
    menu_options = MenuOptionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Role
        fields = ['id', 'name', 'menu_options']
