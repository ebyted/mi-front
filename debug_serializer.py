from core.models import SalesOrder
from rest_framework import serializers

print("=== CHECKING SALES ORDER SERIALIZATION ===")

class DebugSalesOrderSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    customer_info = serializers.SerializerMethodField()
    
    def get_customer_info(self, obj):
        if obj.customer:
            return {
                'id': obj.customer.id,
                'name': obj.customer.name,
                'email': getattr(obj.customer, 'email', ''),
                'phone': getattr(obj.customer, 'phone', ''),
            }
        return None
    
    class Meta:
        model = SalesOrder
        fields = '__all__'

# Test serialization
orders = SalesOrder.objects.all()[:2]
for order in orders:
    serializer = DebugSalesOrderSerializer(order)
    print(f"Order {order.id} serialized:")
    print(f"  - customer: {serializer.data.get('customer')}")
    print(f"  - customer_name: {serializer.data.get('customer_name')}")
    print(f"  - customer_info: {serializer.data.get('customer_info')}")
    print("")
