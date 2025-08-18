from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator

class AuditLog(models.Model):
    ACTIONS = [
        ('create', 'Creación'),
        ('update', 'Actualización'),
        ('delete', 'Eliminación'),
        ('import', 'Importación'),
        ('authorize', 'Autorización'),
        ('RESET_PASSWORD', 'Restablecimiento de contraseña'),
    ]
    user = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=20, choices=ACTIONS)
    model = models.CharField(max_length=50)
    object_id = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.timestamp} - {self.user} - {self.action} - {self.model}"
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager, Group, Permission

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)

class Business(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    code = models.CharField(max_length=50, unique=True)
    tax_id = models.CharField(max_length=50, blank=True)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return self.name

# Role
class Role(models.Model):
    name = models.CharField(max_length=50, unique=True)
    business = models.ForeignKey(Business, on_delete=models.CASCADE)

# MenuOption
class MenuOption(models.Model):
    name = models.CharField(max_length=50, unique=True)
    label = models.CharField(max_length=100)
    roles = models.ManyToManyField(Role, related_name='menu_options')
    business = models.ForeignKey(Business, on_delete=models.CASCADE)

# User
class User(AbstractBaseUser, PermissionsMixin):
    USERNAME_FIELD = 'email'
    email = models.EmailField(unique=True, max_length=255)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    role = models.ForeignKey(Role, on_delete=models.PROTECT, null=True)
    business = models.ForeignKey(Business, on_delete=models.CASCADE, null=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    groups = models.ManyToManyField(Group, blank=True)
    user_permissions = models.ManyToManyField(Permission, blank=True)

    REQUIRED_FIELDS = ['first_name', 'last_name']
    USERNAME_FIELD = 'email'
    objects = UserManager()

    def __str__(self):
        return self.email


# Category
class Category(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    code = models.CharField(max_length=50)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return self.name

# Brand
class Brand(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    code = models.CharField(max_length=50)
    country = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return self.name

# Unit
class Unit(models.Model):
    name = models.CharField(max_length=50)
    symbol = models.CharField(max_length=10)
    unit_type = models.CharField(max_length=20)
    conversion_factor = models.FloatField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return self.name

# Product
class Product(models.Model):
    PRODUCT_STATUS_CHOICES = [
        ('REGULAR', 'Regular'),
        ('NUEVO', 'Nuevo'),
        ('OFERTA', 'Oferta'), 
        ('REMATE', 'Remate'),
    ]
    
    business = models.ForeignKey(Business, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True)
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    sku = models.CharField(max_length=100, unique=True)
    barcode = models.CharField(max_length=100, blank=True)
    base_unit = models.ForeignKey(Unit, on_delete=models.SET_NULL, null=True)
    minimum_stock = models.FloatField(default=0)
    maximum_stock = models.FloatField(default=0)
    image_url = models.URLField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    group = models.IntegerField(default=0)
    # NUEVOS CAMPOS AGREGADOS
    cantidad_corrugado = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Cantidad en corrugado"
    )
    status = models.CharField(
        max_length=10,
        choices=PRODUCT_STATUS_CHOICES,
        default='REGULAR',
        help_text="Estado del producto"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return self.name

# ProductVariant
class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    sku = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2)
    sale_price = models.DecimalField(max_digits=12, decimal_places=2)
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2)
    barcode = models.CharField(max_length=50, blank=True)
    unit = models.ForeignKey(Unit, on_delete=models.SET_NULL, null=True)
    low_stock_threshold = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return self.name

# Warehouse
class Warehouse(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    code = models.CharField(max_length=50)
    address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return self.name

# ProductWarehouseStock
class ProductWarehouseStock(models.Model):
    product_variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE)
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE)
    quantity = models.FloatField(default=0)
    min_stock = models.FloatField(default=0)
    location = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return f"{self.product_variant} in {self.warehouse}"

# Supplier
class Supplier(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    company_name = models.CharField(max_length=200, blank=True)
    tax_id = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    address = models.TextField(blank=True)
    payment_terms = models.CharField(max_length=50, blank=True)
    credit_limit = models.FloatField(default=0)
    discount_percentage = models.FloatField(default=0)
    contact_person = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    # NUEVOS CAMPOS PARA CRÉDITO MEJORADO
    has_credit = models.BooleanField(
        default=False, 
        help_text="¿El proveedor maneja crédito?"
    )
    credit_limit_decimal = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        default=0,
        help_text="Límite de crédito (nuevo campo decimal)"
    )
    credit_days = models.IntegerField(
        default=0,
        help_text="Días de crédito"
    )
    current_balance = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        default=0,
        help_text="Saldo actual"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    @property
    def available_credit(self):
        return self.credit_limit_decimal - self.current_balance
        
    @property
    def credit_usage_percentage(self):
        if self.credit_limit_decimal > 0:
            return (self.current_balance / self.credit_limit_decimal) * 100
        return 0
    def __str__(self):
        return self.name

# SupplierProduct
class SupplierProduct(models.Model):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    product_variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE)
    supplier_sku = models.CharField(max_length=100, blank=True)
    last_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    lead_time_days = models.IntegerField(default=0)
    is_preferred = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return f"{self.supplier} - {self.product_variant}"

# PurchaseOrder
class PurchaseOrder(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    order_date = models.DateTimeField()
    expected_delivery_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return f"PO {self.id}"

# PurchaseOrderItem
class PurchaseOrderItem(models.Model):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE)
    product_variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE)
    quantity = models.FloatField(default=0)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    def __str__(self):
        return f"{self.product_variant} x {self.quantity}"

# PurchaseOrderReceipt
class PurchaseOrderReceipt(models.Model):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE)
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    receipt_date = models.DateTimeField()
    notes = models.TextField(blank=True)
    def __str__(self):
        return f"Receipt {self.id}"

# PurchaseOrderReceiptItem
class PurchaseOrderReceiptItem(models.Model):
    receipt = models.ForeignKey(PurchaseOrderReceipt, on_delete=models.CASCADE)
    po_item = models.ForeignKey(PurchaseOrderItem, on_delete=models.CASCADE)
    quantity_received = models.FloatField(default=0)
    def __str__(self):
        return f"{self.po_item} received: {self.quantity_received}"

# InventoryMovement (Maestro)
class InventoryMovement(models.Model):
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='movements_created')
    movement_type = models.CharField(max_length=20)
    reference_document = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Autorización
    authorized = models.BooleanField(default=False)
    authorized_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='movements_authorized')
    authorized_at = models.DateTimeField(null=True, blank=True)
    
    # Sistema de Cancelación
    is_cancelled = models.BooleanField(default=False)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='movements_cancelled')
    cancellation_reason = models.TextField(blank=True)
    
    # Movimientos inversos/reversión
    is_reversal = models.BooleanField(default=False)  # Indica si es un movimiento inverso
    original_movement = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='reversal_movements')
    
    def __str__(self):
        return f"{self.movement_type} {self.created_at}"
    
    def can_be_cancelled(self):
        """Verifica si el movimiento puede ser cancelado"""
        return not self.is_cancelled and not self.is_reversal and self.authorized
    
    def cancel_movement(self, user, reason):
        """Cancela el movimiento creando un movimiento inverso"""
        if not self.can_be_cancelled():
            raise ValueError("Este movimiento no puede ser cancelado")
        
        # Marcar como cancelado
        self.is_cancelled = True
        self.cancelled_at = timezone.now()
        self.cancelled_by = user
        self.cancellation_reason = reason
        self.save()
        
        # Crear movimiento inverso
        reverse_movement = InventoryMovement.objects.create(
            warehouse=self.warehouse,
            user=user,
            movement_type=f"CANCELACION_{self.movement_type}",
            reference_document=f"CANCEL-{self.reference_document}",
            notes=f"Cancelación del movimiento #{self.id}: {reason}",
            authorized=True,  # Auto-autorizado
            authorized_by=user,
            authorized_at=timezone.now(),
            is_reversal=True,
            original_movement=self
        )
        
        # Crear movimientos de detalle inversos
        for detail in self.inventorymovementdetail_set.all():
            # Invertir tipo de movimiento
            reverse_type = 'IN' if detail.movement_type == 'OUT' else 'OUT'
            
            InventoryMovementDetail.objects.create(
                movement=reverse_movement,
                product_variant=detail.product_variant,
                quantity=detail.quantity,  # Misma cantidad
                movement_type=reverse_type,  # Tipo inverso
                unit_cost=detail.unit_cost,
                notes=f"Reverso de {detail.movement_type} del movimiento #{self.id}"
            )
        
        return reverse_movement

# InventoryMovementDetail (Detalle)
class InventoryMovementDetail(models.Model):
    movement = models.ForeignKey(InventoryMovement, on_delete=models.CASCADE, related_name='details')
    product_variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE)
    quantity = models.FloatField(default=0)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    lote = models.CharField(max_length=100, blank=True)
    expiration_date = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)  # Agregar campo notes explícitamente
    aux1 = models.CharField(max_length=255, blank=True)
    
    def save(self, *args, **kwargs):
        # Calcular total automáticamente si no se especifica
        if self.price and self.quantity and not self.total:
            self.total = self.price * self.quantity
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.product_variant} x {self.quantity}"

# CustomerType, ExchangeRate y Customer ya existen arriba

# SalesOrder
class SalesOrder(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE)
    customer = models.ForeignKey('Customer', on_delete=models.CASCADE)
    order_date = models.DateTimeField()
    status = models.CharField(max_length=20)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    exchange = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    def __str__(self):
        return f"Order {self.id}"

# SalesOrderItem
class SalesOrderItem(models.Model):
    sales_order = models.ForeignKey(SalesOrder, on_delete=models.CASCADE, related_name='items')
    product_variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE)
    quantity = models.FloatField(default=0)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    exchange = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    def __str__(self):
        return f"{self.product_variant} x {self.quantity}"

# Quotation - IMPLEMENTACIÓN LIMPIA DESDE CERO
class Quotation(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Borrador'),
        ('SENT', 'Enviada'),
        ('APPROVED', 'Aprobada'),
        ('REJECTED', 'Rechazada'),
        ('EXPIRED', 'Expirada'),
    ]
    
    business = models.ForeignKey(Business, on_delete=models.CASCADE)
    # Usar customer_id para ser compatible con DB actual, pero tratar como texto
    customer_id = models.CharField(max_length=255, help_text="Nombre del cliente como texto libre")
    quote_date = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    exchange = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)
    
    class Meta:
        db_table = 'core_quotation'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Cotización #{self.id} - {self.customer_id}"
    
    @property
    def customer_name(self):
        """Alias para compatibilidad con frontend"""
        return self.customer_id
    
    @customer_name.setter
    def customer_name(self, value):
        """Setter para compatibilidad con frontend"""
        self.customer_id = value

# QuotationItem - IMPLEMENTACIÓN LIMPIA DESDE CERO  
class QuotationItem(models.Model):
    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name='details')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.FloatField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Precio unitario")
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'core_quotationitem'
        
    def __str__(self):
        return f"{self.product.name} x {self.quantity}"
    
    def save(self, *args, **kwargs):
        # Asegurar valores mínimos
        if self.quantity <= 0:
            self.quantity = 1
        if self.price < 0:
            self.price = 0
        super().save(*args, **kwargs)
    
    @property
    def product_name(self):
        return self.product.name if self.product else "Producto no especificado"
    
    @property  
    def product_id(self):
        return self.product.id if self.product else None
    
    @property
    def unit_price(self):
        """Alias para compatibilidad con frontend"""
        return self.price
        
    @property
    def total_price(self):
        """Calcular total automáticamente"""
        return float(self.quantity) * float(self.price) if self.quantity and self.price else 0

# ExchangeRate
class ExchangeRate(models.Model):
    date = models.DateField(unique=True)
    rate = models.DecimalField(max_digits=10, decimal_places=4)
    def __str__(self):
        return f"{self.date}: {self.rate}"

# CustomerType
class CustomerType(models.Model):
    LEVEL_CHOICES = (
        (1, 'Level 1'),
        (2, 'Level 2'),
        (3, 'Level 3'),
        (4, 'Level 4'),
    )
    level = models.PositiveSmallIntegerField(choices=LEVEL_CHOICES, unique=True)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    def __str__(self):
        return f"Level {self.level} ({self.discount_percentage}%)"

# Customer
class Customer(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, unique=True)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=50, blank=True)
    address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    customer_type = models.ForeignKey(CustomerType, on_delete=models.PROTECT)
    # NUEVOS CAMPOS PARA CRÉDITO
    has_credit = models.BooleanField(
        default=False,
        help_text="¿El cliente tiene crédito?"
    )
    credit_limit = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        default=0
    )
    credit_days = models.IntegerField(
        default=0
    )
    current_balance = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        default=0
    )
    
    def get_discount(self):
        return self.customer_type.discount_percentage
    
    @property
    def available_credit(self):
        return self.credit_limit - self.current_balance
        
    @property
    def is_credit_overdue(self):
        # Lógica para determinar si tiene pagos vencidos
        return False  # Implementar según reglas de negocio
    def __str__(self):
        return self.name


# CustomerProductDiscount - Descuentos por cliente-producto
class CustomerProductDiscount(models.Model):
    customer = models.ForeignKey(
        'Customer', 
        on_delete=models.CASCADE,
        related_name='product_discounts'
    )
    product = models.ForeignKey(
        'Product', 
        on_delete=models.CASCADE,
        related_name='customer_discounts'
    )
    discount_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Porcentaje de descuento (0-100%)"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'User', 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='discounts_created'
    )
    
    class Meta:
        unique_together = ['customer', 'product']
        verbose_name = "Descuento Cliente-Producto"
        verbose_name_plural = "Descuentos Cliente-Producto"
        
    def __str__(self):
        return f"{self.customer.name} - {self.product.name} ({self.discount_percentage}%)"


# PurchaseOrderPayment - Pagos de órdenes de compra  
class PurchaseOrderPayment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('EFECTIVO', 'Efectivo'),
        ('TRANSFERENCIA', 'Transferencia Bancaria'),
        ('CHEQUE', 'Cheque'),
        ('TARJETA', 'Tarjeta'),
        ('DEPOSITO', 'Depósito Bancario'),
    ]
    
    purchase_order = models.ForeignKey(
        'PurchaseOrder', 
        on_delete=models.CASCADE, 
        related_name='payments'
    )
    payment_date = models.DateTimeField(auto_now_add=True)
    amount = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        validators=[MinValueValidator(0.01)]
    )
    payment_method = models.CharField(
        max_length=20, 
        choices=PAYMENT_METHOD_CHOICES,
        default='TRANSFERENCIA'
    )
    reference_number = models.CharField(
        max_length=100, 
        blank=True,
        help_text="Número de referencia, folio, etc."
    )
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        'User', 
        on_delete=models.SET_NULL, 
        null=True
    )
    
    class Meta:
        verbose_name = "Pago Orden de Compra"
        verbose_name_plural = "Pagos Órdenes de Compra"
        
    def __str__(self):
        return f"Pago {self.purchase_order.order_number} - ${self.amount}"


# Sale - Ventas
class Sale(models.Model):
    SALE_STATUS_CHOICES = [
        ('DRAFT', 'Borrador'),
        ('CONFIRMED', 'Confirmada'),
        ('PAID', 'Pagada'),
        ('CANCELLED', 'Cancelada'),
    ]
    
    customer = models.ForeignKey('Customer', on_delete=models.CASCADE)
    sale_number = models.CharField(max_length=20, unique=True)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    remaining_balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    sale_date = models.DateTimeField(auto_now_add=True)
    due_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=SALE_STATUS_CHOICES, default='DRAFT')
    is_paid = models.BooleanField(default=False)
    created_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True)
    
    class Meta:
        verbose_name = "Venta"
        verbose_name_plural = "Ventas"
        
    def save(self, *args, **kwargs):
        if not self.sale_number:
            self.sale_number = self.generate_sale_number()
        self.remaining_balance = self.total_amount - self.paid_amount
        self.is_paid = self.remaining_balance <= 0
        super().save(*args, **kwargs)
        
    def generate_sale_number(self):
        from datetime import datetime
        return f"VTA-{datetime.now().strftime('%Y%m%d')}-{self.pk or 1:04d}"
        
    def __str__(self):
        return f"Venta {self.sale_number} - {self.customer.name}"


# SalePayment - Pagos de ventas
class SalePayment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('EFECTIVO', 'Efectivo'),
        ('TRANSFERENCIA', 'Transferencia Bancaria'),
        ('CHEQUE', 'Cheque'),
        ('TARJETA', 'Tarjeta'),
        ('DEPOSITO', 'Depósito Bancario'),
    ]
    
    sale = models.ForeignKey('Sale', on_delete=models.CASCADE, related_name='payments')
    payment_date = models.DateTimeField(auto_now_add=True)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    payment_method = models.CharField(
        max_length=20, 
        choices=PAYMENT_METHOD_CHOICES,
        default='EFECTIVO'
    )
    reference_number = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True)
    
    class Meta:
        verbose_name = "Pago de Venta"
        verbose_name_plural = "Pagos de Ventas"
        
    def __str__(self):
        return f"Pago {self.sale.sale_number} - ${self.amount}"


# CustomerPayment - Pagos directos de clientes (abonos a cuenta)
class CustomerPayment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('EFECTIVO', 'Efectivo'),
        ('TRANSFERENCIA', 'Transferencia Bancaria'),
        ('CHEQUE', 'Cheque'),
        ('TARJETA', 'Tarjeta'),
        ('DEPOSITO', 'Depósito Bancario'),
    ]
    
    customer = models.ForeignKey(
        'Customer', 
        on_delete=models.CASCADE, 
        related_name='payments'
    )
    payment_date = models.DateTimeField(auto_now_add=True)
    amount = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        validators=[MinValueValidator(0.01)]
    )
    payment_method = models.CharField(
        max_length=20, 
        choices=PAYMENT_METHOD_CHOICES,
        default='TRANSFERENCIA'
    )
    reference_number = models.CharField(
        max_length=100, 
        blank=True,
        help_text="Número de referencia, folio, etc."
    )
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        'User', 
        on_delete=models.SET_NULL, 
        null=True
    )
    
    class Meta:
        verbose_name = "Pago de Cliente"
        verbose_name_plural = "Pagos de Clientes"
        ordering = ['-payment_date']
        
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Actualizar el saldo del cliente automáticamente
        self.customer.current_balance -= self.amount
        if self.customer.current_balance < 0:
            self.customer.current_balance = 0
        self.customer.save()
        
    def __str__(self):
        return f"Pago {self.customer.name} - ${self.amount}"
