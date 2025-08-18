from rest_framework import serializers
from .models import CustomerProductDiscount, PurchaseOrderPayment, Sale, SalePayment, Customer, Supplier


class CustomerProductDiscountSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    
    class Meta:
        model = CustomerProductDiscount
        fields = [
            'id', 'customer', 'customer_name', 'product', 'product_name', 
            'product_sku', 'discount_percentage', 'is_active', 'created_at'
        ]
        
    def validate_discount_percentage(self, value):
        if not 0 <= value <= 100:
            raise serializers.ValidationError("El descuento debe estar entre 0 y 100%")
        return value


class EnhancedSupplierSerializer(serializers.ModelSerializer):
    available_credit = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    credit_usage_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    
    class Meta:
        model = Supplier
        fields = [
            'id', 'name', 'contact_person', 'email', 'phone', 'address',
            'has_credit', 'credit_limit_decimal', 'credit_days', 'current_balance',
            'available_credit', 'credit_usage_percentage', 'is_active'
        ]


class EnhancedCustomerSerializer(serializers.ModelSerializer):
    available_credit = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    
    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'code', 'email', 'phone', 'address', 
            'has_credit', 'credit_limit', 'credit_days', 'current_balance',
            'available_credit', 'is_active'
        ]


class PurchaseOrderPaymentSerializer(serializers.ModelSerializer):
    purchase_order_number = serializers.CharField(source='purchase_order.order_number', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = PurchaseOrderPayment
        fields = [
            'id', 'purchase_order', 'purchase_order_number', 'payment_date',
            'amount', 'payment_method', 'reference_number', 'notes',
            'created_by', 'created_by_name'
        ]


class SaleSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = Sale
        fields = [
            'id', 'customer', 'customer_name', 'sale_number', 'total_amount',
            'paid_amount', 'remaining_balance', 'sale_date', 'due_date',
            'status', 'is_paid', 'created_by', 'created_by_name'
        ]


class SalePaymentSerializer(serializers.ModelSerializer):
    sale_number = serializers.CharField(source='sale.sale_number', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = SalePayment
        fields = [
            'id', 'sale', 'sale_number', 'payment_date',
            'amount', 'payment_method', 'reference_number', 'notes',
            'created_by', 'created_by_name'
        ]
