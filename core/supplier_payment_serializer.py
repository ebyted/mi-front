from rest_framework import serializers
from core.models import SupplierPayment

class SupplierPaymentSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = SupplierPayment
        fields = [
            'id', 'supplier', 'supplier_name', 'payment_date', 'amount', 
            'payment_method', 'reference_number', 'notes', 'created_by', 
            'created_by_name'
        ]
        read_only_fields = ['id', 'payment_date', 'supplier_name', 'created_by_name']
