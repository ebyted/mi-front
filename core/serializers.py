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
    variants = serializers.SerializerMethodField(read_only=True)
    current_stock = serializers.SerializerMethodField(read_only=True)
    image = serializers.CharField(source='image_url', read_only=True)  # Alias para compatibilidad con frontend
    category = CategorySerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    brand_name = serializers.SerializerMethodField(read_only=True)
    category_name = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Product
        fields = ['id', 'business', 'category', 'brand', 'name', 'description', 'sku', 
                 'barcode', 'base_unit', 'minimum_stock', 'maximum_stock', 'image_url', 
                 'image', 'is_active', 'group', 'cantidad_corrugado', 'status', 
                 'created_at', 'updated_at', 'price', 'current_stock', 'brand_name', 'category_name', 'variants']
    def get_brand_name(self, obj):
        try:
            return obj.brand.name if obj.brand and hasattr(obj.brand, 'name') else ''
        except Exception:
            return ''

    def get_category_name(self, obj):
        try:
            return obj.category.name if obj.category and hasattr(obj.category, 'name') else ''
        except Exception:
            return ''

    def get_variants(self, obj):
        try:
            variants = ProductVariant.objects.filter(product=obj)
            return ProductVariantSerializer(variants, many=True).data
        except Exception:
            return []

    def get_price(self, obj):
        try:
            product_variant = ProductVariant.objects.filter(product=obj).first()
            if product_variant and hasattr(product_variant, 'sale_price') and product_variant.sale_price is not None:
                return float(product_variant.sale_price)
            return 0.0
        except Exception:
            return 0.0

    def get_current_stock(self, obj):
        try:
            from django.db.models import Sum
            product_variants = ProductVariant.objects.filter(product=obj)
            total_stock = 0
            for variant in product_variants:
                if hasattr(variant, 'stock') and variant.stock is not None:
                    total_stock += float(variant.stock)
            return max(0, total_stock)
        except Exception:
            return 0

class ProductVariantSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(source='product.id', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    
    class Meta:
        model = ProductVariant
        fields = ['id', 'name', 'sku', 'is_main', 'price', 'stock', 'product_id', 'product_name', 'product_sku']

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

class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    product_variant_detail = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = PurchaseOrderItem
        fields = ['id', 'product_variant', 'quantity', 'unit_price', 'total_price', 'product_variant_detail']
    
    def get_product_variant_detail(self, obj):
        if obj.product_variant:
            return {
                'id': obj.product_variant.id,
                'name': obj.product_variant.name,
                'sku': obj.product_variant.sku,
                'product_name': obj.product_variant.product.name if obj.product_variant.product else '',
            }
        return None

class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True, read_only=True, source='purchaseorderitem_set')
    items_data = serializers.ListField(write_only=True, required=False)
    supplier_detail = serializers.SerializerMethodField(read_only=True)
    business = serializers.PrimaryKeyRelatedField(read_only=True)
    
    class Meta:
        model = PurchaseOrder
        fields = ['id', 'business', 'supplier', 'supplier_detail', 'order_date', 'expected_delivery_date', 
                 'status', 'total_amount', 'notes', 'created_at', 'updated_at', 'items', 'items_data']
        extra_kwargs = {
            'order_date': {'required': False},
            'status': {'required': False},
        }
    
    def get_supplier_detail(self, obj):
        if obj.supplier:
            return {
                'id': obj.supplier.id,
                'name': obj.supplier.name,
                'company_name': obj.supplier.company_name,
                'email': obj.supplier.email,
                'phone': obj.supplier.phone,
            }
        return None
    
    def create(self, validated_data):
        items_data = validated_data.pop('items_data', [])
        
        # Asignar business automáticamente
        request = self.context.get('request')
        if request and hasattr(request.user, 'business'):
            validated_data['business'] = request.user.business
        elif request and hasattr(request.user, 'userprofile') and request.user.userprofile.business:
            validated_data['business'] = request.user.userprofile.business
        else:
            from .models import Business
            first_business = Business.objects.first()
            if first_business:
                validated_data['business'] = first_business
        
        # Establecer valores por defecto
        if 'status' not in validated_data:
            validated_data['status'] = 'DRAFT'
        
        # Calcular total si no se proporciona
        total_calculated = 0
        for item in items_data:
            quantity = float(item.get('quantity', 0))
            unit_price = float(item.get('unit_price', 0))
            total_calculated += quantity * unit_price
        
        if not validated_data.get('total_amount'):
            validated_data['total_amount'] = total_calculated
        
        purchase_order = PurchaseOrder.objects.create(**validated_data)
        
        # Crear items
        for item_data in items_data:
            item_data['purchase_order'] = purchase_order
            item_data['total_price'] = float(item_data['quantity']) * float(item_data['unit_price'])
            PurchaseOrderItem.objects.create(**item_data)
        
        return purchase_order

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
    product_variant_id = serializers.IntegerField(write_only=True, required=False)
    product_variant_name = serializers.CharField(source='product_variant.name', read_only=True)
    product_name = serializers.CharField(source='product_variant.product.name', read_only=True)
    product_code = serializers.CharField(source='product_variant.sku', read_only=True)
    # Campo para recibir product_id del frontend y convertirlo a product_variant
    product_id = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = InventoryMovementDetail
        fields = ['id', 'movement', 'product_variant_id', 'product_variant_name', 'product_name', 
                 'product_code', 'product_id', 'quantity', 'price', 'total', 'lote', 
                 'expiration_date', 'notes']
        extra_kwargs = {
            'movement': {'required': False},
            'product_variant_id': {'required': False},
            'product_variant': {'required': False}
        }
    def get_product_id(self, obj):
        # Devuelve el id del producto asociado a la variante
        if obj.product_variant and obj.product_variant.product:
            return obj.product_variant.product.id
        return None
    
    def create(self, validated_data):
        # Si viene product_variant_id, buscar la instancia
        product_variant_id = validated_data.pop('product_variant_id', None)
        if product_variant_id:
            try:
                product_variant = ProductVariant.objects.get(id=product_variant_id)
                validated_data['product_variant'] = product_variant
            except ProductVariant.DoesNotExist:
                raise serializers.ValidationError({'product_variant_id': f'No existe ProductVariant con id {product_variant_id}'})
        # Si viene product_id, buscar o crear el product_variant correspondiente
        product_id = validated_data.pop('product_id', None)
        if product_id and not validated_data.get('product_variant'):
            try:
                product = Product.objects.get(id=product_id)
                product_variant = ProductVariant.objects.filter(product=product).first()
                if not product_variant:
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
        # Validar que siempre venga product_variant
        if not validated_data.get('product_variant'):
            raise serializers.ValidationError({
                'product_variant': 'Debes especificar la variante de producto (product_variant_id) para movimientos de inventario.'
            })
        # Asegurar que price y total tengan valores por defecto
        if 'price' not in validated_data or validated_data['price'] is None:
            validated_data['price'] = 0.00
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
        # Puede autorizar si: no está autorizado, no está cancelado, y es staff o no es el creador
        return (not obj.authorized and not obj.is_cancelled and (
            request.user.is_staff or obj.user != request.user))
    
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
        # Extraer detalles si vienen anidados
        details_data = self.initial_data.get('details', [])
        # Manejar warehouse_id
        warehouse_id = validated_data.pop('warehouse_id', None)
        if warehouse_id:
            warehouse = Warehouse.objects.get(id=warehouse_id)
            validated_data['warehouse'] = warehouse
        # Manejar type -> movement_type
        movement_type = validated_data.pop('type', None)
        if movement_type:
            validated_data['movement_type'] = movement_type
        # Evitar pasar 'user' dos veces
        validated_data.pop('user', None)
        # Crear el movimiento principal
        movement = InventoryMovement.objects.create(
            **validated_data,
            user=self.context['request'].user if 'request' in self.context else None
        )
        # Crear los detalles
        for detail in details_data:
            product_variant_id = detail.get('product_variant_id')
            product_id = detail.get('product_id')
            # Si no viene product_variant_id, intentar buscar por product_id
            if not product_variant_id and product_id:
                from core.models import ProductVariant, Product
                try:
                    product = Product.objects.get(id=product_id)
                    product_variant = ProductVariant.objects.filter(product=product).first()
                    if not product_variant:
                        raise Exception(f"No existe variante para el producto {product_id}")
                    product_variant_id = product_variant.id
                except Exception as e:
                    raise serializers.ValidationError({
                        'product_variant_id': f'No se pudo determinar la variante para el producto {product_id}: {str(e)}'
                    })
            if not product_variant_id:
                raise serializers.ValidationError({
                    'product_variant_id': 'Debes especificar la variante de producto (product_variant_id) para movimientos de inventario.'
                })
            InventoryMovementDetail.objects.create(
                movement=movement,
                product_variant_id=product_variant_id,
                quantity=detail.get('quantity'),
                lote=detail.get('lote', ''),
                expiration_date=detail.get('expiration_date'),
                notes=detail.get('notes', '')
            )
        return movement

class ExchangeRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExchangeRate
        fields = '__all__'

class CustomerTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerType
        fields = '__all__'

class CustomerSerializer(serializers.ModelSerializer):
    business = serializers.PrimaryKeyRelatedField(read_only=True)
    
    class Meta:
        model = Customer
        fields = ['id', 'business', 'name', 'code', 'email', 'phone', 'address', 
                 'is_active', 'customer_type', 'has_credit', 'credit_limit', 
                 'credit_days', 'current_balance']
        extra_kwargs = {
            'code': {
                'required': True,
                'error_messages': {
                    'unique': 'Ya existe un cliente con este código. Por favor, use un código diferente.',
                    'required': 'El código del cliente es obligatorio.',
                    'blank': 'El código del cliente no puede estar vacío.'
                }
            },
            'email': {
                'required': True,
                'error_messages': {
                    'unique': 'Ya existe un cliente con este email. Por favor, use un email diferente.',
                    'required': 'El email del cliente es obligatorio.',
                    'invalid': 'Por favor, ingrese un email válido.'
                }
            },
            'customer_type': {
                'required': True,
                'error_messages': {
                    'required': 'El tipo de cliente es obligatorio.',
                    'does_not_exist': 'El tipo de cliente seleccionado no existe.'
                }
            },
            'name': {
                'required': True,
                'error_messages': {
                    'required': 'El nombre del cliente es obligatorio.',
                    'blank': 'El nombre del cliente no puede estar vacío.'
                }
            }
        }
    
    def validate_code(self, value):
        """Validación adicional para el código"""
        if not value or not value.strip():
            raise serializers.ValidationError("El código del cliente no puede estar vacío.")
        
        # Verificar si ya existe (solo en creación)
        if not self.instance:  # Solo en creación, no en actualización
            if Customer.objects.filter(code=value.strip().upper()).exists():
                raise serializers.ValidationError("Ya existe un cliente con este código. Por favor, use un código diferente.")
        
        return value.strip().upper()
    
    def validate_email(self, value):
        """Validación adicional para el email"""
        if not value or not value.strip():
            raise serializers.ValidationError("El email del cliente es obligatorio.")
        
        # Verificar si ya existe (solo en creación)
        if not self.instance:  # Solo en creación, no en actualización
            if Customer.objects.filter(email=value.strip().lower()).exists():
                raise serializers.ValidationError("Ya existe un cliente con este email. Por favor, use un email diferente.")
        
        return value.strip().lower()
    
    def validate_customer_type(self, value):
        """Validación para customer_type"""
        if not value:
            raise serializers.ValidationError("El tipo de cliente es obligatorio.")
        return value
    
    def create(self, validated_data):
        # Asignar automáticamente el business del usuario actual
        request = self.context.get('request')
        if request and hasattr(request.user, 'business'):
            validated_data['business'] = request.user.business
        elif request and hasattr(request.user, 'userprofile') and request.user.userprofile.business:
            validated_data['business'] = request.user.userprofile.business
        else:
            # Si no hay business asociado, usar el primer business disponible
            from .models import Business
            first_business = Business.objects.first()
            if first_business:
                validated_data['business'] = first_business
            else:
                raise serializers.ValidationError("No se encontró un business para el usuario. Contacte al administrador.")
        
        return super().create(validated_data)

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
