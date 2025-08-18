from django.contrib import admin
from .models import User, Business, Category, Brand, Unit, Product, ProductVariant, Warehouse, ProductWarehouseStock, Supplier, SupplierProduct, PurchaseOrder, PurchaseOrderItem, PurchaseOrderReceipt, PurchaseOrderReceiptItem, InventoryMovement, CustomerType, ExchangeRate, Customer, SalesOrder, SalesOrderItem, Quotation, QuotationItem, Role, MenuOption

admin.site.register(User)
admin.site.register(Business)
admin.site.register(Category)
admin.site.register(Brand)
admin.site.register(Unit)
admin.site.register(Product)
admin.site.register(ProductVariant)
admin.site.register(Warehouse)
admin.site.register(ProductWarehouseStock)
admin.site.register(Supplier)
admin.site.register(SupplierProduct)
admin.site.register(PurchaseOrder)
admin.site.register(PurchaseOrderItem)
admin.site.register(PurchaseOrderReceipt)
admin.site.register(PurchaseOrderReceiptItem)
admin.site.register(InventoryMovement)
admin.site.register(CustomerType)
admin.site.register(ExchangeRate)
admin.site.register(Customer)
admin.site.register(SalesOrder)
admin.site.register(SalesOrderItem)
admin.site.register(Quotation)
admin.site.register(QuotationItem)
admin.site.register(Role)
admin.site.register(MenuOption)

# Registrar los nuevos modelos
from .models import CustomerProductDiscount, PurchaseOrderPayment, Sale, SalePayment

@admin.register(CustomerProductDiscount)
class CustomerProductDiscountAdmin(admin.ModelAdmin):
    list_display = ['customer', 'product', 'discount_percentage', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['customer__name', 'product__name', 'product__sku']
    list_editable = ['discount_percentage', 'is_active']

@admin.register(PurchaseOrderPayment)
class PurchaseOrderPaymentAdmin(admin.ModelAdmin):
    list_display = ['purchase_order', 'amount', 'payment_method', 'payment_date', 'created_by']
    list_filter = ['payment_method', 'payment_date']
    search_fields = ['purchase_order__order_number', 'reference_number']
    readonly_fields = ['payment_date']

@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ['sale_number', 'customer', 'total_amount', 'paid_amount', 'remaining_balance', 'status', 'is_paid']
    list_filter = ['status', 'is_paid', 'sale_date']
    search_fields = ['sale_number', 'customer__name']
    readonly_fields = ['sale_number', 'remaining_balance', 'is_paid']

@admin.register(SalePayment)
class SalePaymentAdmin(admin.ModelAdmin):
    list_display = ['sale', 'amount', 'payment_method', 'payment_date', 'created_by']
    list_filter = ['payment_method', 'payment_date']
    search_fields = ['sale__sale_number', 'reference_number']
    readonly_fields = ['payment_date']
