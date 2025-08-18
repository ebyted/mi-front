from .models import AuditLog
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import (
    User, Business, Category, Brand, Unit, Product, ProductVariant, Warehouse, ProductWarehouseStock,
    Supplier, SupplierProduct, PurchaseOrder, PurchaseOrderItem, PurchaseOrderReceipt, PurchaseOrderReceiptItem,
    InventoryMovement, ExchangeRate, CustomerType, Customer, SalesOrder, SalesOrderItem, Quotation, QuotationItem,
    Role, MenuOption, InventoryMovementDetail, CustomerProductDiscount, PurchaseOrderPayment, Sale, SalePayment
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
    fields = ['id', 'email', 'first_name', 'last_name', 'role', 'is_active', 'is_staff']
        
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
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = Product
        fields = ['id', 'business', 'category', 'brand', 'name', 'description', 'sku', 
                 'barcode', 'base_unit', 'minimum_stock', 'maximum_stock', 'image_url', 
                 'image', 'is_active', 'group', 'cantidad_corrugado', 'status', 
                 'created_at', 'updated_at', 'price', 'current_stock', 'brand_name', 'category_name']
    
    def validate_cantidad_corrugado(self, value):
        if value < 0:
            raise serializers.ValidationError("La cantidad de corrugado no puede ser negativa")
        return value
    
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

# === NUEVOS SERIALIZERS DE MOVIMIENTOS DE INVENTARIO - IMPLEMENTACIÓN LIMPIA ===

class InventoryMovementDetailSerializer(serializers.ModelSerializer):
    # Campos de lectura para mostrar información del producto
    product_variant_name = serializers.CharField(source='product_variant.name', read_only=True)
    product_name = serializers.CharField(source='product_variant.product.name', read_only=True)
    product_code = serializers.CharField(source='product_variant.sku', read_only=True)
    
    # Campo para recibir product_id del frontend y convertirlo a product_variant
    product_id = serializers.IntegerField(write_only=True, required=False)
    
    class Meta:
        model = InventoryMovementDetail
        fields = ['id', 'movement', 'product_variant', 'product_variant_name', 'product_name', 
                 'product_code', 'product_id', 'quantity', 'price', 'total', 'lote', 
                 'expiration_date', 'notes']
        extra_kwargs = {
            'movement': {'required': False},
            'product_variant': {'required': False}
        }
    
    def create(self, validated_data):
        # Si viene product_id, buscar o crear el product_variant correspondiente
        product_id = validated_data.pop('product_id', None)
        if product_id and not validated_data.get('product_variant'):
            try:
                product = Product.objects.get(id=product_id)
                # Buscar ProductVariant existente o crear uno por defecto
                product_variant = ProductVariant.objects.filter(product=product).first()
                if not product_variant:
                    # Crear ProductVariant por defecto si no existe
                    product_variant = ProductVariant.objects.create(
                        product=product,
                        name=product.name,
                        sku=product.sku or f"VAR-{product.id}",
                        sale_price=0.00,
                        cost_price=0.00,
                        is_default=True
                    )
                validated_data['product_variant'] = product_variant
            except Product.DoesNotExist:
                raise serializers.ValidationError(f"Product with id {product_id} does not exist")
        
        # Asegurar que price y total tengan valores por defecto
        if 'price' not in validated_data or validated_data['price'] is None:
            validated_data['price'] = 0.00
        
        # Calcular total si no viene especificado
        if 'total' not in validated_data or validated_data['total'] is None:
            validated_data['total'] = validated_data['price'] * validated_data.get('quantity', 0)
        
        return super().create(validated_data)
        
class InventoryMovementSerializer(serializers.ModelSerializer):
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    details = InventoryMovementDetailSerializer(many=True, read_only=True)
    
    # Campo para enviar el ID del almacén en el POST
    warehouse_id = serializers.IntegerField(write_only=True, required=False)
    
    # Campo type para compatibilidad con frontend
    type = serializers.CharField(write_only=True, required=False)
    
    # Campos de autorización
    created_by_email = serializers.SerializerMethodField()
    authorized_by_email = serializers.SerializerMethodField()
    cancelled_by_email = serializers.SerializerMethodField()
    can_authorize = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()
    
    class Meta:
        model = InventoryMovement
        fields = ['id', 'warehouse', 'warehouse_name', 'warehouse_id', 
                 'movement_type', 'type', 'reference_document', 'notes', 
                 'user', 'user_email', 'created_at', 
                 'authorized', 'authorized_by', 'authorized_at', 'is_cancelled', 
                 'cancelled_at', 'cancellation_reason', 'details',
                 'created_by_email', 'authorized_by_email', 'cancelled_by_email',
                 'can_authorize', 'can_delete', 'can_cancel']
        read_only_fields = ['user', 'authorized_by', 'authorized_at', 'cancelled_by', 'cancelled_at']
        extra_kwargs = {
            'warehouse': {'required': False},
            'movement_type': {'required': False}
        }
    
    def get_created_by_email(self, obj):
        return obj.user.email if obj.user else ''
    
    def get_authorized_by_email(self, obj):
        return obj.authorized_by.email if obj.authorized_by else ''
    
    def get_cancelled_by_email(self, obj):
        return obj.cancelled_by.email if obj.cancelled_by else ''
    
    def get_can_authorize(self, obj):
        request = self.context.get('request')
        if not request or not request.user:
            return False
        # Puede autorizar si: no está autorizado, no está cancelado, y no es el creador
        return (not obj.authorized and not obj.is_cancelled and 
                obj.user != request.user)
    
    def get_can_delete(self, obj):
        request = self.context.get('request')
        if not request or not request.user:
            return False
        # Puede eliminar si: no está autorizado y es el creador o admin
        return (not obj.authorized and 
                (obj.user == request.user or request.user.is_staff))
    
    def get_can_cancel(self, obj):
        request = self.context.get('request')
        if not request or not request.user:
            return False
        # Puede cancelar si: está autorizado y no está cancelado
        return (obj.authorized and not obj.is_cancelled)
    
    def create(self, validated_data):
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"🔧 InventoryMovementSerializer.create - validated_data inicial: {validated_data}")
        
        # Manejar warehouse_id
        warehouse_id = validated_data.pop('warehouse_id', None)
        logger.info(f"🔧 warehouse_id extraído: {warehouse_id}")
        
        if warehouse_id:
            try:
                warehouse = Warehouse.objects.get(id=warehouse_id)
                validated_data['warehouse'] = warehouse
                logger.info(f"🔧 Warehouse asignado: {warehouse.name}")
            except Warehouse.DoesNotExist:
                raise serializers.ValidationError(f"Warehouse with id {warehouse_id} does not exist")
        
        # Manejar type -> movement_type
        movement_type = validated_data.pop('type', None)
        logger.info(f"🔧 movement_type extraído: {movement_type}")
        
        if movement_type:
            validated_data['movement_type'] = movement_type
            logger.info(f"🔧 movement_type asignado: {movement_type}")
        
        logger.info(f"🔧 validated_data final: {validated_data}")
        
        return super().create(validated_data)

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

# SERIALIZERS DESDE CERO - COTIZACIONES
class QuotationItemSerializer(serializers.ModelSerializer):
    """Serializer para items de cotización - completamente limpio"""
    product_name = serializers.ReadOnlyField(source='product.name')
    product_id = serializers.IntegerField(write_only=True)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, source='price')
    total_price = serializers.ReadOnlyField()
    
    class Meta:
        model = QuotationItem
        fields = ['id', 'product', 'product_id', 'product_name', 'quantity', 'unit_price', 'total_price', 'notes']
        extra_kwargs = {
            'product': {'read_only': True}
        }
    
    def validate_product_id(self, value):
        """Validar que el producto existe"""
        try:
            Product.objects.get(id=value)
            return value
        except Product.DoesNotExist:
            raise serializers.ValidationError("El producto especificado no existe")
    
    def validate_quantity(self, value):
        """Validar cantidad positiva"""
        if value <= 0:
            raise serializers.ValidationError("La cantidad debe ser mayor a 0")
        return value
    
    def validate_unit_price(self, value):
        """Validar precio no negativo"""
        if value < 0:
            raise serializers.ValidationError("El precio no puede ser negativo")
        return value

class QuotationSerializer(serializers.ModelSerializer):
    """Serializer principal para cotizaciones - completamente limpio"""
    details = QuotationItemSerializer(many=True)
    customer_name = serializers.CharField(source='customer_id')
    
    class Meta:
        model = Quotation
        fields = ['id', 'business', 'customer_name', 'quote_date', 'status', 
                 'total_amount', 'notes', 'exchange', 'created_at', 'updated_at', 'details']
        extra_kwargs = {
            'business': {'required': False},
            'total_amount': {'read_only': True}
        }
    
    def validate_customer_name(self, value):
        """Validar nombre del cliente"""
        if not value or not value.strip():
            raise serializers.ValidationError("El nombre del cliente es requerido")
        return value.strip()
    
    def validate_details(self, value):
        """Validar que hay al menos un item"""
        if not value or len(value) == 0:
            raise serializers.ValidationError("Debe incluir al menos un producto")
        return value
    
    def create(self, validated_data):
        """Crear cotización con items"""
        details_data = validated_data.pop('details', [])
        
        # customer_name ya viene mapeado a customer_id por el source='customer_id'
        # No necesitamos hacer nada adicional aquí
        
        # Asignar business por defecto
        if not validated_data.get('business'):
            try:
                default_business = Business.objects.first()
                if default_business:
                    validated_data['business'] = default_business
            except Business.DoesNotExist:
                raise serializers.ValidationError("No hay un business configurado")
        
        # Crear la cotización
        quotation = Quotation.objects.create(**validated_data)
        
        # Crear los items y calcular total
        total_amount = 0
        for detail_data in details_data:
            # Obtener el producto
            product_id = detail_data.pop('product_id')
            product = Product.objects.get(id=product_id)
            detail_data['product'] = product
            
            # Manejar unit_price -> price
            if 'unit_price' in detail_data:
                detail_data['price'] = detail_data.pop('unit_price')
            
            detail_data['quotation'] = quotation
            item = QuotationItem.objects.create(**detail_data)
            total_amount += item.total_price
        
        # Actualizar el total
        quotation.total_amount = total_amount
        quotation.save()
        
        return quotation
    
    def update(self, instance, validated_data):
        """Actualizar cotización con items"""
        details_data = validated_data.pop('details', [])
        
        # customer_name ya viene mapeado a customer_id por el source='customer_id'
        
        # Actualizar campos de la cotización
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Eliminar items existentes
        instance.details.all().delete()
        
        # Crear nuevos items y calcular total
        total_amount = 0
        for detail_data in details_data:
            # Obtener el producto
            product_id = detail_data.pop('product_id')
            product = Product.objects.get(id=product_id)
            detail_data['product'] = product
            
            # Manejar unit_price -> price
            if 'unit_price' in detail_data:
                detail_data['price'] = detail_data.pop('unit_price')
            
            detail_data['quotation'] = instance
            item = QuotationItem.objects.create(**detail_data)
            total_amount += item.total_price
        
        # Actualizar el total
        instance.total_amount = total_amount
        instance.save()
        
        return instance

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
