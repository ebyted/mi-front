from core.models import SalesOrder
from core.serializers import SalesOrderSerializer

print("=== TESTING FIXED SALES ORDER SERIALIZER ===")

# Obtener pedidos
orders = SalesOrder.objects.all()[:2]
print(f"Encontrados {len(orders)} pedidos")

for order in orders:
    serializer = SalesOrderSerializer(order)
    data = serializer.data
    
    print(f"\nPedido {order.id}:")
    print(f"  - customer (object): {data.get('customer')}")
    print(f"  - customer type: {type(data.get('customer'))}")
    
    if data.get('customer'):
        customer_info = data.get('customer')
        print(f"  - customer name: {customer_info.get('name', 'N/A')}")
        print(f"  - customer email: {customer_info.get('email', 'N/A')}")
        print(f"  - customer id: {customer_info.get('id', 'N/A')}")

print("\n=== FIN DEL TEST ===")
