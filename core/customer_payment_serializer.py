from rest_framework import serializers
from .models import CustomerPayment

class CustomerPaymentSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.email', read_only=True)
    
    class Meta:
        model = CustomerPayment
        fields = '__all__'
        extra_kwargs = {
            'created_by': {'read_only': True}
        }
