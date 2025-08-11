from sales.models import SalesOrder
from customers.models import Customer

print("=== CHECKING SALES ORDER DATA ===")

# Verificar estructura de SalesOrder
orders = SalesOrder.objects.all()[:5]
print(f"Total orders found: {len(orders)}")

for order in orders:
    print(f"\nOrder {order.id}:")
    print(f"  - customer_id: {order.customer_id}")
    if hasattr(order, 'customer') and order.customer:
        print(f"  - customer object: {order.customer}")
        print(f"  - customer name: {order.customer.name}")
    else:
        print("  - customer: None or missing")
    
    # Verificar si existe el customer
    if order.customer_id:
        try:
            customer = Customer.objects.get(id=order.customer_id)
            print(f"  - customer exists: {customer.name}")
        except Customer.DoesNotExist:
            print(f"  - customer_id {order.customer_id} does not exist in database")

# Verificar la API response
print("\n=== CHECKING API SERIALIZATION ===")
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()
# Crear cliente temporal para API
client = APIClient()

# Intentar obtener datos como lo haría la API
import json
from django.core import serializers

orders_data = []
for order in orders[:3]:
    order_dict = {
        'id': order.id,
        'customer_id': order.customer_id,
        'customer': None
    }
    
    if order.customer:
        order_dict['customer'] = {
            'id': order.customer.id,
            'name': order.customer.name,
            'email': getattr(order.customer, 'email', ''),
        }
    
    orders_data.append(order_dict)
    print(f"Order {order.id} serialized customer data: {order_dict['customer']}")
